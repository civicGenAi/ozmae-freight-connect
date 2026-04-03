-- CRM Extension Migration
-- Creates customer_interactions, crm_tasks, customer_health, decline_reasons

create table public.customer_interactions (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.customers(id) on delete cascade not null,
  lead_id uuid references public.leads(id) on delete set null,
  quotation_id uuid references public.quotations(id) on delete set null,
  job_order_id uuid references public.job_orders(id) on delete set null,
  interaction_type text not null check (interaction_type in (
    'call_outbound', 'call_inbound', 'whatsapp', 'email_sent',
    'email_received', 'meeting', 'site_visit', 'note'
  )),
  subject text not null,
  summary text not null,
  outcome text check (outcome in (
    'interested', 'not_interested', 'follow_up_required',
    'converted', 'declined', 'no_answer', 'information_shared', 'other'
  )),
  next_action text,
  next_action_date date,
  duration_minutes integer,
  logged_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.customer_interactions enable row level security;
create policy "Authenticated users can read interactions" on public.customer_interactions for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert interactions" on public.customer_interactions for insert with check (auth.role() = 'authenticated');
create policy "Owner or admin can update interactions" on public.customer_interactions for update using (logged_by = auth.uid());

create index idx_interactions_customer_id on public.customer_interactions(customer_id);
create index idx_interactions_lead_id on public.customer_interactions(lead_id);
create index idx_interactions_quotation_id on public.customer_interactions(quotation_id);
create index idx_interactions_job_order_id on public.customer_interactions(job_order_id);
create index idx_interactions_created_at on public.customer_interactions(created_at desc);
create index idx_interactions_type on public.customer_interactions(interaction_type);
create index idx_interactions_outcome on public.customer_interactions(outcome);

create table public.crm_tasks (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.customers(id) on delete cascade not null,
  lead_id uuid references public.leads(id) on delete set null,
  quotation_id uuid references public.quotations(id) on delete set null,
  interaction_id uuid references public.customer_interactions(id) on delete set null,
  title text not null,
  description text,
  due_date date not null,
  due_time time,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text default 'pending' check (status in ('pending', 'done', 'snoozed', 'cancelled')),
  assigned_to uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.crm_tasks enable row level security;
create policy "Authenticated users can read tasks" on public.crm_tasks for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage tasks" on public.crm_tasks for all using (auth.role() = 'authenticated');

create index idx_tasks_customer_id on public.crm_tasks(customer_id);
create index idx_tasks_assigned_to on public.crm_tasks(assigned_to);
create index idx_tasks_due_date on public.crm_tasks(due_date);
create index idx_tasks_status on public.crm_tasks(status);
create index idx_tasks_priority on public.crm_tasks(priority);

create trigger trg_crm_tasks_upd before update on public.crm_tasks for each row execute function update_updated_at();

create table public.customer_health (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.customers(id) on delete cascade unique not null,
  health_score integer default 0 check (health_score between 0 and 100),
  health_label text default 'inactive' check (health_label in ('excellent', 'good', 'at_risk', 'inactive', 'lost')),
  total_jobs integer default 0,
  jobs_last_12_months integer default 0,
  total_revenue_usd numeric(12,2) default 0,
  revenue_last_12_months_usd numeric(12,2) default 0,
  avg_deal_size_usd numeric(10,2) default 0,
  total_leads integer default 0,
  total_quotes_sent integer default 0,
  total_quotes_accepted integer default 0,
  total_quotes_declined integer default 0,
  win_rate_pct numeric(5,2) default 0,
  avg_quote_to_job_days numeric(6,1),
  last_job_date date,
  last_interaction_date date,
  last_quote_date date,
  days_since_last_job integer,
  days_since_last_activity integer,
  total_invoiced_usd numeric(12,2) default 0,
  total_paid_usd numeric(12,2) default 0,
  outstanding_balance_usd numeric(10,2) default 0,
  on_time_payment_rate_pct numeric(5,2) default 0,
  avg_payment_delay_days numeric(6,1),
  preferred_route text,
  preferred_vehicle_type text,
  most_common_cargo_type text,
  updated_at timestamptz default now()
);

alter table public.customer_health enable row level security;
create policy "Authenticated users can read health scores" on public.customer_health for select using (auth.role() = 'authenticated');
create policy "Service role can manage health scores" on public.customer_health for all using (auth.role() = 'service_role');

create index idx_health_score on public.customer_health(health_score);
create index idx_health_label on public.customer_health(health_label);
create index idx_health_days_since on public.customer_health(days_since_last_activity);
create index idx_health_revenue on public.customer_health(total_revenue_usd desc);

create table public.decline_reasons (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete set null,
  quotation_id uuid references public.quotations(id) on delete set null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  reason_category text not null check (reason_category in (
    'price_too_high', 'chose_competitor', 'no_longer_needed',
    'timing', 'service_mismatch', 'bad_experience', 'other'
  )),
  competitor_name text,
  details text,
  route_origin text,
  route_destination text,
  deal_value_usd numeric(10,2),
  logged_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.decline_reasons enable row level security;
create policy "Authenticated users can manage decline reasons" on public.decline_reasons for all using (auth.role() = 'authenticated');

create index idx_decline_customer on public.decline_reasons(customer_id);
create index idx_decline_category on public.decline_reasons(reason_category);
create index idx_decline_created on public.decline_reasons(created_at desc);
create index idx_decline_route on public.decline_reasons(route_origin, route_destination);

-- Ensure required extensions are enabled for the health score cron job
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'compute-customer-health-nightly',
  '0 2 * * *',
  $$select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/compute-customer-health',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  )$$
);
