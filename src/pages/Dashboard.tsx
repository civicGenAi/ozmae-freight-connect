import {
  Briefcase,
  FileText,
  Receipt,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Users,
  Truck,
  Shield,
  Activity,
  DollarSign,
  BarChart3,
  MapPin,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useCrmTasks } from "@/hooks/useCrm";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const formatCurrency = (amount: number) =>
  `$${(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ACCENT = "#F26B2A";
const NAVY = "#0f1d35";

// A stable colour for each known job status so the pie/legend stay consistent.
const STATUS_COLORS: Record<string, string> = {
  planning: "#64748b",
  awaiting_deposit: "#f59e0b",
  deposit_confirmed: "#0ea5e9",
  dispatched: "#6366f1",
  picked_up: "#8b5cf6",
  in_transit: "#3b82f6",
  at_destination: "#14b8a6",
  delivered: "#22c55e",
  closed: "#16a34a",
  cancelled: "#ef4444",
  on_hold: "#a1a1aa",
  approved: "#10b981",
  in_progress: "#2563eb",
  completed: "#15803d",
};
const FLEET_COLORS: Record<string, string> = {
  available: "#22c55e",
  on_job: "#3b82f6",
  maintenance: "#f59e0b",
  retired: "#94a3b8",
};

const num = (v: any) => Number(v) || 0;
const dayKey = (d: Date) => d.toISOString().split("T")[0];
const dayLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function Dashboard() {
  const { roles, isAdmin } = useAuth();
  const enabled = !!roles.length;

  const { data: crmTasks, isLoading: tasksLoading } = useCrmTasks({ status: "pending", assignedToMe: true });

  // ---- Single real-data overview query (everything derived client-side) ----
  const { data: ov, isLoading } = useQuery({
    queryKey: ["dashboard_overview"],
    enabled,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 13); // last 14 days incl. today
      const sinceDate = dayKey(since);

      const [
        jobsRes,
        quotesRes,
        invoicesRes,
        paymentsRes,
        vehiclesRes,
        leadsRes,
        customersRes,
      ] = await Promise.all([
        supabase.from("job_orders").select("status, created_at, total_amount"),
        supabase.from("quotations").select("status, total_amount_usd"),
        supabase.from("invoices").select("deposit_status, balance_status, deposit_amount_usd, balance_amount_usd, total_amount_usd"),
        supabase.from("payments").select("amount_usd, payment_date, status").gte("payment_date", sinceDate),
        supabase.from("vehicles").select("status"),
        supabase.from("leads").select("status"),
        supabase.from("customers").select("id", { count: "exact", head: true }),
      ]);

      const jobs = jobsRes.data || [];
      const quotes = quotesRes.data || [];
      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];
      const vehicles = vehiclesRes.data || [];
      const leads = leadsRes.data || [];

      // KPIs
      const activeJobs = jobs.filter((j: any) => !["closed", "cancelled"].includes((j.status || "").toLowerCase())).length;
      const deliveredJobs = jobs.filter((j: any) => ["delivered", "closed", "completed"].includes((j.status || "").toLowerCase())).length;
      const pendingQuotes = quotes.filter((q: any) => ["draft", "sent"].includes((q.status || "").toLowerCase())).length;
      const outstandingInvoices = invoices.filter(
        (i: any) => (i.deposit_status || "").toLowerCase() !== "paid" || (i.balance_status || "").toLowerCase() !== "paid"
      ).length;

      const revenue14 = payments
        .filter((p: any) => (p.status || "completed").toLowerCase() === "completed")
        .reduce((acc: number, p: any) => acc + num(p.amount_usd), 0);

      // Outstanding receivables ($)
      const outstandingValue = invoices.reduce((acc: number, i: any) => {
        let owed = 0;
        if ((i.deposit_status || "").toLowerCase() !== "paid") owed += num(i.deposit_amount_usd);
        if ((i.balance_status || "").toLowerCase() !== "paid") owed += num(i.balance_amount_usd);
        return acc + owed;
      }, 0);

      const activePipelineValue = jobs
        .filter((j: any) => !["closed", "cancelled"].includes((j.status || "").toLowerCase()))
        .reduce((acc: number, j: any) => acc + num(j.total_amount), 0);

      // Job status distribution
      const statusMap: Record<string, number> = {};
      jobs.forEach((j: any) => {
        const s = (j.status || "unknown").toLowerCase();
        statusMap[s] = (statusMap[s] || 0) + 1;
      });
      const jobStatus = Object.entries(statusMap)
        .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || "#94a3b8" }))
        .sort((a, b) => b.value - a.value);

      // Quotation status distribution
      const qMap: Record<string, number> = {};
      quotes.forEach((q: any) => {
        const s = (q.status || "draft").toLowerCase();
        qMap[s] = (qMap[s] || 0) + 1;
      });
      const quoteStatus = Object.entries(qMap).map(([name, value]) => ({ name, value }));

      // Fleet utilization
      const fMap: Record<string, number> = {};
      vehicles.forEach((v: any) => {
        const s = (v.status || "available").toLowerCase();
        fMap[s] = (fMap[s] || 0) + 1;
      });
      const fleet = Object.entries(fMap).map(([name, value]) => ({ name, value, color: FLEET_COLORS[name] || "#94a3b8" }));

      // 14-day trend (revenue from payments + jobs created)
      const buckets: Record<string, { name: string; revenue: number; jobs: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        buckets[dayKey(d)] = { name: dayLabel(d), revenue: 0, jobs: 0 };
      }
      payments.forEach((p: any) => {
        const key = (p.payment_date || "").split("T")[0];
        if (buckets[key]) buckets[key].revenue += num(p.amount_usd);
      });
      jobs.forEach((j: any) => {
        const key = (j.created_at || "").split("T")[0];
        if (buckets[key]) buckets[key].jobs += 1;
      });
      const trend = Object.values(buckets);

      // Funnel
      const funnel = [
        { stage: "Leads", count: leads.length, color: "#3b82f6" },
        { stage: "Quotations", count: quotes.length, color: "#8b5cf6" },
        { stage: "Job Orders", count: jobs.length, color: ACCENT },
        { stage: "Delivered", count: deliveredJobs, color: "#22c55e" },
      ];

      return {
        kpis: { activeJobs, pendingQuotes, outstandingInvoices, revenue14, deliveredJobs },
        jobStatus,
        quoteStatus,
        fleet,
        trend,
        funnel,
        outstandingValue,
        activePipelineValue,
        customers: customersRes.count || 0,
      };
    },
  });

  const { data: routeStats, isLoading: routesLoading } = useQuery({
    queryKey: ["route_stats"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("origin, destination");
      if (error) return [];
      const counts: Record<string, number> = {};
      (data || []).forEach((lead: any) => {
        if (lead.origin && lead.destination) {
          const o = lead.origin.split(",")[0].trim();
          const d = lead.destination.split(",")[0].trim();
          const key = `${o} → ${d}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      });
      const sorted = Object.entries(counts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      if (sorted.length === 0) return [];
      const max = sorted[0].count;
      const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
      return sorted.map((item, i) => ({ l: item.label, v: Math.round((item.count / max) * 100), rawCount: item.count, c: colors[i % colors.length] }));
    },
  });

  const { data: recentJobs } = useQuery({
    queryKey: ["recent_jobs"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select(`id, job_number, status, total_amount, created_at, customer:customers(company_name), quotation:quotations(total_amount_usd)`)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) return [];
      return data;
    },
  });

  const kpis = [
    { label: "Active Jobs", value: ov?.kpis.activeJobs ?? 0, sub: formatCurrency(ov?.activePipelineValue || 0) + " in pipeline", icon: Briefcase, color: "text-accent", bg: "bg-accent/10" },
    { label: "Pending Quotations", value: ov?.kpis.pendingQuotes ?? 0, sub: "Awaiting response", icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Outstanding Invoices", value: ov?.kpis.outstandingInvoices ?? 0, sub: formatCurrency(ov?.outstandingValue || 0) + " receivable", icon: Receipt, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Revenue (14d)", value: formatCurrency(ov?.kpis.revenue14 || 0), sub: (ov?.kpis.deliveredJobs ?? 0) + " jobs delivered", icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  const RoleGate = ({ roles: allowedRoles, children }: { roles: UserRole[]; children: any }) => {
    const { hasRole } = useAuth();
    if (!hasRole(allowedRoles)) return null;
    return children;
  };

  const fleetTotal = (ov?.fleet || []).reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f1d35] border border-white/5 p-8 rounded-3xl text-white shadow-[0_8px_30px_rgba(20,41,76,0.12)] overflow-hidden relative group">
        <div className="relative z-10 space-y-2">
          <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-sm">Logistics Command</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-white/60 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#F26B2A]" /> Real-time System Overview
            </p>
            <div className="flex gap-1">
              {roles.map((r) => (
                <span key={r} className="text-[8px] font-black uppercase tracking-tighter bg-white/10 px-1.5 py-0.5 rounded border border-white/10 text-white/50">
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 relative z-10">
          <RoleGate roles={["Admin", "Leads", "Sales"]}>
            <Link to="/leads">
              <Button className="bg-[#F26B2A] hover:bg-[#d85e23] text-white shadow-lg shadow-[#F26B2A]/20 font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2 transition-all">
                <Plus className="h-4 w-4" /> New Inquiry
              </Button>
            </Link>
          </RoleGate>
          <RoleGate roles={["Admin", "Operations"]}>
            <Link to="/job-orders">
              <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2 transition-all">
                <Plus className="h-4 w-4" /> Create Job
              </Button>
            </Link>
          </RoleGate>
        </div>
        <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-[#F26B2A] rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="xl:col-span-2 space-y-8">
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start">
                  <div className={cn("p-2 rounded-lg shadow-inner", kpi.bg, kpi.color)}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-black text-foreground mt-0.5 tabular-nums">{isLoading ? "—" : kpi.value}</p>
                  <p className="text-[9px] font-bold text-muted-foreground/70 mt-1 truncate">{kpi.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue trend + Pipeline funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white rounded-2xl border shadow-sm p-5 space-y-4">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" /> Revenue & Jobs · Last 14 Days
              </h3>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ov?.trend || []}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ACCENT} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "11px", fontWeight: "bold" }}
                      formatter={(value: any, name: any) => (name === "revenue" ? [formatCurrency(value), "Revenue"] : [value, "Jobs"])}
                    />
                    <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm p-5 space-y-4">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" /> Pipeline Funnel
              </h3>
              <div className="space-y-3 pt-1">
                {(ov?.funnel || []).map((f) => {
                  const max = ov?.funnel?.[0]?.count || 1;
                  const pct = Math.max(4, Math.round((f.count / (max || 1)) * 100));
                  return (
                    <div key={f.stage}>
                      <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                        <span className="text-muted-foreground">{f.stage}</span>
                        <span className="tabular-nums">{f.count}</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: f.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Distributions: Job status + Quote status + Fleet */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Job Status</h3>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ov?.jobStatus || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={2}>
                      {(ov?.jobStatus || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11, fontWeight: "bold" }} formatter={(v: any, n: any) => [v, (n || "").replace(/_/g, " ")]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {(ov?.jobStatus || []).slice(0, 6).map((e) => (
                  <div key={e.name} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-[8px] font-bold uppercase text-muted-foreground">{e.name.replace(/_/g, " ")} ({e.value})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Quotation Status</h3>
              <div className="space-y-2 pt-2">
                {(ov?.quoteStatus || []).length === 0 && <p className="text-[10px] text-muted-foreground py-8 text-center uppercase font-bold">No quotations yet</p>}
                {(ov?.quoteStatus || []).map((q) => {
                  const total = (ov?.quoteStatus || []).reduce((a, b) => a + b.value, 0) || 1;
                  const pct = Math.round((q.value / total) * 100);
                  return (
                    <div key={q.name}>
                      <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                        <span className="text-muted-foreground">{q.name}</span>
                        <span className="tabular-nums">{q.value} · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                <Truck className="h-3.5 w-3.5" /> Fleet · {fleetTotal} vehicles
              </h3>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ov?.fleet || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {(ov?.fleet || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11, fontWeight: "bold" }} formatter={(v: any, n: any) => [v, (n || "").replace(/_/g, " ")]} />
                    <Legend formatter={(value: any) => <span style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700 }}>{(value || "").replace(/_/g, " ")}</span>} iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Routes + recent jobs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-accent" />
                <h3 className="font-black text-[10px] uppercase tracking-widest text-foreground/70">Top Shipping Routes</h3>
              </div>
              <div className="space-y-4">
                {routesLoading ? (
                  [1, 2, 3, 4].map((i) => <div key={i} className="h-2 w-full bg-muted rounded animate-pulse" />)
                ) : routeStats && routeStats.length > 0 ? (
                  routeStats.map((r) => (
                    <div key={r.l}>
                      <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                        <span className="truncate max-w-[170px]">{r.l}</span>
                        <span>{r.rawCount} shipments</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-1000", r.c)} style={{ width: `${r.v}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <MapPin className="h-8 w-8 opacity-20 mb-2" />
                    <p className="text-[10px] font-bold uppercase">No route data yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex justify-between items-center bg-muted/10">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-accent" /> Recent Jobs
                </h3>
                <Link to="/job-orders" className="text-[9px] font-black uppercase tracking-widest text-accent hover:underline">View all</Link>
              </div>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold uppercase text-[8px] tracking-widest h-8 px-5">Ref</TableHead>
                    <TableHead className="font-bold uppercase text-[8px] tracking-widest h-8 px-3">Client</TableHead>
                    <TableHead className="font-bold uppercase text-[8px] tracking-widest h-8 px-3">Status</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[8px] tracking-widest h-8 px-5">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentJobs || []).length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-[10px] uppercase font-bold text-muted-foreground">No jobs yet</TableCell></TableRow>
                  ) : (recentJobs || []).map((job: any) => (
                    <TableRow key={job.id} className="h-10 hover:bg-muted/10 transition-colors">
                      <TableCell className="font-mono text-[9px] font-bold text-accent uppercase px-5">{(job.job_number || job.id).toString().split("-")[0]}</TableCell>
                      <TableCell className="text-[10px] font-bold text-foreground px-3 truncate max-w-[120px]">{job.customer?.company_name || "—"}</TableCell>
                      <TableCell className="px-3"><StatusBadge status={job.status} /></TableCell>
                      <TableCell className="text-right font-black text-[10px] px-5">{formatCurrency(job.quotation?.total_amount_usd || job.total_amount || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Awaiting Your Action</h4>
              <div className="bg-[#F26B2A] text-white text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse">LIVE</div>
            </div>
            <div className="space-y-3">
              {tasksLoading ? (
                <div className="h-20 animate-pulse bg-muted rounded-2xl" />
              ) : crmTasks?.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 border border-dashed rounded-2xl">
                  <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2 opacity-50" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">No Pending Actions</p>
                </div>
              ) : (
                crmTasks?.map((t: any) => (
                  <motion.div key={t.id} whileHover={{ scale: 1.02 }} className="p-4 bg-slate-50 border hover:border-accent group rounded-2xl flex items-center gap-3 transition-all cursor-pointer">
                    <div className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center", t.priority === "urgent" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-foreground truncate">{t.title}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">{t.customer?.company_name}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:text-accent" />
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Business snapshot */}
          <div className="bg-[#0f1d35] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-accent rounded-full blur-[80px] opacity-10" />
            <div className="relative z-10 space-y-5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" /> Business Snapshot
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Customers</p>
                  <p className="text-xl font-black tabular-nums">{isLoading ? "—" : ov?.customers ?? 0}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Active Jobs</p>
                  <p className="text-xl font-black tabular-nums">{isLoading ? "—" : ov?.kpis.activeJobs ?? 0}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Receivable</p>
                  <p className="text-lg font-black tabular-nums text-amber-400">{formatCurrency(ov?.outstandingValue || 0)}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Revenue 14d</p>
                  <p className="text-lg font-black tabular-nums text-emerald-400">{formatCurrency(ov?.kpis.revenue14 || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick access */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Contacts", path: "/crm/customers", icon: Users },
              { label: "Invoices", path: "/invoices", icon: Receipt },
              { label: "Rate Card", path: "/rate-card", icon: FileText },
              { label: "Settings", path: "/settings/profile", icon: Shield },
            ].map((item) => (
              <Link key={item.label} to={item.path} className="group">
                <div className="p-4 bg-white border border-transparent group-hover:border-accent/40 rounded-2xl text-center transition-all shadow-sm hover:shadow-md">
                  <item.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-accent transition-colors" />
                  <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground group-hover:text-foreground">{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
