import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Download, TrendingUp, TrendingDown, DollarSign, Truck, Briefcase, Target, Wallet, Percent, MapPin,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import {
  format, eachDayOfInterval, eachMonthOfInterval, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay,
} from "date-fns";

const fmt = (v: number) => `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const num = (v: any) => Number(v) || 0;
const PERIODS = [
  { key: "weekly", label: "7 Days" },
  { key: "monthly", label: "6 Months" },
  { key: "yearly", label: "12 Months" },
] as const;

const STATUS_COLORS = ["#F26B2A", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#14b8a6", "#ef4444", "#64748b"];

export default function Reports() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("monthly");

  const { data, isLoading } = useQuery({
    queryKey: ["reports_data"],
    queryFn: async () => {
      const [payments, jobs, costs, quotes, vehicles] = await Promise.all([
        supabase.from("payments").select("amount_usd, payment_date, status"),
        supabase.from("job_orders").select("id, total_amount, created_at, status, origin, destination, customer:customers(company_name)"),
        supabase.from("job_costs").select("amount_usd, incurred_on"),
        supabase.from("quotations").select("status"),
        supabase.from("vehicles").select("status"),
      ]);
      return {
        payments: payments.data || [],
        jobs: jobs.data || [],
        costs: costs.data || [],
        quotes: quotes.data || [],
        vehicles: vehicles.data || [],
      };
    },
  });

  const range = useMemo(() => {
    const now = new Date();
    if (period === "weekly") return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    if (period === "monthly") return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
  }, [period]);

  const within = (d?: string) => {
    if (!d) return false;
    try { return isWithinInterval(parseISO(d), range); } catch { return false; }
  };

  const trend = useMemo(() => {
    if (!data) return [];
    const revOf = (d: Date, gran: "day" | "month") =>
      data.payments.filter((p: any) => (p.status || "completed") === "completed" && p.payment_date &&
        (gran === "day" ? format(parseISO(p.payment_date), "yyyy-MM-dd") === format(d, "yyyy-MM-dd")
                        : format(parseISO(p.payment_date), "yyyy-MM") === format(d, "yyyy-MM")))
        .reduce((a: number, p: any) => a + num(p.amount_usd), 0);
    const costOf = (d: Date, gran: "day" | "month") =>
      data.costs.filter((c: any) => c.incurred_on &&
        (gran === "day" ? format(parseISO(c.incurred_on), "yyyy-MM-dd") === format(d, "yyyy-MM-dd")
                        : format(parseISO(c.incurred_on), "yyyy-MM") === format(d, "yyyy-MM")))
        .reduce((a: number, c: any) => a + num(c.amount_usd), 0);

    if (period === "weekly") {
      return eachDayOfInterval(range).map((d) => {
        const revenue = revOf(d, "day"); const cost = costOf(d, "day");
        return { name: format(d, "EEE"), revenue, cost, profit: revenue - cost };
      });
    }
    return eachMonthOfInterval(range).map((d) => {
      const revenue = revOf(d, "month"); const cost = costOf(d, "month");
      return { name: format(d, "MMM"), revenue, cost, profit: revenue - cost };
    });
  }, [data, period, range]);

  const kpis = useMemo(() => {
    const revenue = trend.reduce((a, t) => a + t.revenue, 0);
    const cost = trend.reduce((a, t) => a + t.cost, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const jobsInPeriod = (data?.jobs || []).filter((j: any) => within(j.created_at)).length;
    const accepted = (data?.quotes || []).filter((q: any) => q.status === "accepted").length;
    const decided = (data?.quotes || []).filter((q: any) => ["accepted", "declined"].includes(q.status)).length;
    const winRate = decided > 0 ? (accepted / decided) * 100 : 0;
    return { revenue, cost, profit, margin, jobsInPeriod, winRate };
  }, [trend, data, range]);

  const topCustomers = useMemo(() => {
    const map: Record<string, number> = {};
    (data?.jobs || []).forEach((j: any) => {
      const name = j.customer?.company_name || "Unknown";
      map[name] = (map[name] || 0) + num(j.total_amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [data]);

  const topRoutes = useMemo(() => {
    const map: Record<string, number> = {};
    (data?.jobs || []).forEach((j: any) => {
      if (!j.origin && !j.destination) return;
      const key = `${(j.origin || "?").split(",")[0]} → ${(j.destination || "?").split(",")[0]}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [data]);

  const fleet = useMemo(() => {
    const labelMap: Record<string, string> = { available: "Standby", on_job: "Active", maintenance: "Maintenance", retired: "Retired" };
    const colorMap: Record<string, string> = { available: "#3b82f6", on_job: "#22c55e", maintenance: "#f59e0b", retired: "#94a3b8" };
    const counts: Record<string, number> = {};
    (data?.vehicles || []).forEach((v: any) => { counts[v.status] = (counts[v.status] || 0) + 1; });
    return Object.entries(counts).map(([s, value]) => ({ name: labelMap[s] || s, value, color: colorMap[s] || "#cbd5e1" }));
  }, [data]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(trend);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
    if (topCustomers.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topCustomers), "Top Customers");
    XLSX.writeFile(wb, `Ozmae_${period}_Report.xlsx`);
    toast.success("Excel report generated");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-accent border-t-transparent animate-spin rounded-full" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Intelligence...</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: "Revenue", value: fmt(kpis.revenue), icon: DollarSign, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Costs", value: fmt(kpis.cost), icon: Wallet, color: "text-amber-500", bg: "bg-amber-50" },
    { label: kpis.profit >= 0 ? "Net Profit" : "Net Loss", value: fmt(kpis.profit), icon: kpis.profit >= 0 ? TrendingUp : TrendingDown, color: kpis.profit >= 0 ? "text-emerald-600" : "text-rose-600", bg: kpis.profit >= 0 ? "bg-emerald-50" : "bg-rose-50" },
    { label: "Profit Margin", value: `${kpis.margin.toFixed(1)}%`, icon: Percent, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Jobs (period)", value: kpis.jobsInPeriod.toString(), icon: Briefcase, color: "text-accent", bg: "bg-accent/10" },
    { label: "Quote Win Rate", value: `${kpis.winRate.toFixed(0)}%`, icon: Target, color: "text-teal-500", bg: "bg-teal-50" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Intelligence">
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={cn("px-3 py-1.5 text-[11px] font-bold rounded-md transition-all", period === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {p.label}
              </button>
            ))}
          </div>
          <Button onClick={handleExport} className="gap-2 h-9 bg-accent hover:bg-accent/90 text-accent-foreground"><Download className="h-4 w-4" /> Export</Button>
        </div>
      </PageHeader>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="bg-card rounded-2xl border shadow-sm p-4">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", k.bg, k.color)}><k.icon className="h-4 w-4" /></div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{k.label}</p>
            <p className="text-lg font-black tabular-nums mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Profit & Loss trend */}
      <div className="bg-card rounded-2xl border shadow-sm p-5">
        <h3 className="font-black text-[10px] uppercase tracking-widest text-foreground flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-accent" /> Revenue · Cost · Profit
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11, fontWeight: "bold", border: "1px solid #E2E8F0" }} formatter={(v: any, n: any) => [fmt(v), n]} />
              <Legend wrapperStyle={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700 }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#rev)" />
              <Bar dataKey="cost" name="Cost" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={14} />
              <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={14} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top customers */}
        <div className="bg-card rounded-2xl border shadow-sm p-5">
          <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2"><DollarSign className="h-3.5 w-3.5" /> Top Customers by Value</h3>
          <div className="space-y-3">
            {topCustomers.length === 0 ? <p className="text-xs text-muted-foreground py-6 text-center">No data</p> : topCustomers.map((c, i) => {
              const max = topCustomers[0].value || 1;
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span className="truncate max-w-[200px]">{c.name}</span><span className="tabular-nums">{fmt(c.value)}</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(4, (c.value / max) * 100)}%`, backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fleet + routes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border shadow-sm p-5">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2"><Truck className="h-3.5 w-3.5" /> Fleet</h3>
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fleet} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={62}>
                    {fleet.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                  <Legend iconSize={8} formatter={(v: any) => <span style={{ fontSize: 9, fontWeight: 700 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-2xl border shadow-sm p-5">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Top Routes</h3>
            <div className="space-y-2">
              {topRoutes.length === 0 ? <p className="text-xs text-muted-foreground py-6 text-center">No data</p> : topRoutes.map((r) => (
                <div key={r.name} className="flex justify-between items-center text-[10px] font-bold">
                  <span className="truncate max-w-[140px] uppercase">{r.name}</span>
                  <span className="tabular-nums bg-muted px-2 py-0.5 rounded-full">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
