import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const { data: customers } = await supabase
    .from('customers')
    .select('id')

  if (!customers) return new Response('No customers', { status: 200 })

  const now = new Date()

  for (const customer of customers) {
    const cid = customer.id

    // Fetch all jobs for this customer
    const { data: jobs } = await supabase
      .from('job_orders')
      .select('id, status, created_at, assigned_vehicle_id, cargo_type')
      .eq('customer_id', cid)
      .neq('status', 'cancelled')

    const totalJobs = jobs?.length ?? 0
    const cutoff12m = new Date(now)
    cutoff12m.setFullYear(cutoff12m.getFullYear() - 1)
    const jobsLast12 = jobs?.filter(j => new Date(j.created_at) > cutoff12m).length ?? 0
    const lastJob = jobs?.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
    const lastJobDate = lastJob ? new Date(lastJob.created_at).toISOString().split('T')[0] : null
    const daysSinceJob = lastJobDate
      ? Math.floor((now.getTime() - new Date(lastJobDate).getTime()) / 86400000)
      : 9999

    // Fetch revenue from invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount_usd, deposit_status, balance_status, deposit_due_date, balance_due_date, created_at')
      .eq('customer_id', cid)

    const totalInvoiced = invoices?.reduce((s, i) => s + (i.total_amount_usd ?? 0), 0) ?? 0
    const totalPaid = invoices?.reduce((s, i) => {
      let paid = 0
      if (i.deposit_status === 'paid') paid += i.total_amount_usd * 0.6
      if (i.balance_status === 'paid') paid += i.total_amount_usd * 0.4
      return s + paid
    }, 0) ?? 0
    const outstanding = Math.max(0, totalInvoiced - totalPaid)
    const revenueL12 = invoices
      ?.filter(i => new Date(i.created_at) > cutoff12m)
      .reduce((s, i) => s + (i.total_amount_usd ?? 0), 0) ?? 0
    const avgDeal = totalJobs > 0 ? totalInvoiced / totalJobs : 0

    // Fetch quotes for win rate
    const { data: quotes } = await supabase
      .from('quotations')
      .select('id, status, created_at, total_amount_usd')
      .eq('customer_id', cid)
    const totalQuotes = quotes?.length ?? 0
    const accepted = quotes?.filter(q => q.status === 'accepted').length ?? 0
    const declined = quotes?.filter(q => q.status === 'declined').length ?? 0
    const winRate = totalQuotes > 0 ? (accepted / totalQuotes) * 100 : 0
    const lastQuote = quotes?.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
    const lastQuoteDate = lastQuote
      ? new Date(lastQuote.created_at).toISOString().split('T')[0]
      : null

    // Fetch leads
    const { data: leads } = await supabase
      .from('leads')
      .select('id')
      .eq('customer_id', cid)
    const totalLeads = leads?.length ?? 0

    // Fetch last interaction
    const { data: interactions } = await supabase
      .from('customer_interactions')
      .select('created_at')
      .eq('customer_id', cid)
      .order('created_at', { ascending: false })
      .limit(1)
    const lastInteractionDate = interactions?.[0]?.created_at
      ? new Date(interactions[0].created_at).toISOString().split('T')[0]
      : null
    const daysSinceInteraction = lastInteractionDate
      ? Math.floor((now.getTime() - new Date(lastInteractionDate).getTime()) / 86400000)
      : 9999

    const daysSinceActivity = Math.min(daysSinceJob, daysSinceInteraction)

    // Compute score components
    const recencyScore = daysSinceActivity <= 30 ? 100
      : daysSinceActivity <= 60 ? 80
      : daysSinceActivity <= 90 ? 60
      : daysSinceActivity <= 180 ? 40
      : daysSinceActivity <= 365 ? 20 : 0

    const freqScore = Math.min(jobsLast12 * 20, 100)

    // Value score: simple tier based on total revenue
    const valueScore = totalInvoiced >= 50000 ? 100
      : totalInvoiced >= 20000 ? 80
      : totalInvoiced >= 5000 ? 60
      : totalInvoiced >= 1000 ? 40
      : totalInvoiced > 0 ? 20 : 0

    const paymentScore = totalInvoiced > 0
      ? Math.round((totalPaid / totalInvoiced) * 100)
      : 50 // neutral if no invoices yet

    const healthScore = Math.round(
      (recencyScore * 0.40) +
      (freqScore * 0.25) +
      (valueScore * 0.20) +
      (paymentScore * 0.15)
    )

    const healthLabel = healthScore >= 80 ? 'excellent'
      : healthScore >= 60 ? 'good'
      : healthScore >= 40 ? 'at_risk'
      : healthScore >= 20 ? 'inactive'
      : 'lost'

    // Upsert into customer_health
    await supabase.from('customer_health').upsert({
      customer_id: cid,
      health_score: healthScore,
      health_label: healthLabel,
      total_jobs: totalJobs,
      jobs_last_12_months: jobsLast12,
      total_revenue_usd: totalInvoiced,
      revenue_last_12_months_usd: revenueL12,
      avg_deal_size_usd: avgDeal,
      total_leads: totalLeads,
      total_quotes_sent: totalQuotes,
      total_quotes_accepted: accepted,
      total_quotes_declined: declined,
      win_rate_pct: winRate,
      last_job_date: lastJobDate,
      last_interaction_date: lastInteractionDate,
      last_quote_date: lastQuoteDate,
      days_since_last_job: daysSinceJob === 9999 ? null : daysSinceJob,
      days_since_last_activity: daysSinceActivity === 9999 ? null : daysSinceActivity,
      total_invoiced_usd: totalInvoiced,
      total_paid_usd: totalPaid,
      outstanding_balance_usd: outstanding,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'customer_id' })

    // Alert if customer just dropped into at_risk
    if (healthLabel === 'at_risk' || healthLabel === 'inactive') {
      const { data: salesUsers } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'sales'])
      for (const user of salesUsers ?? []) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Customer needs attention',
          message: `Health score alert — review this customer's activity`,
          type: 'warning',
          related_table: 'customers',
          related_id: cid,
        })
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: customers.length }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
