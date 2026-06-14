import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Search, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRight } from "lucide-react";

const fmt = (n: number) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v: any) => Number(v) || 0;

const COST_CATEGORIES = [
  "trucking",
  "fuel",
  "customs_clearing",
  "port_terminal",
  "handling",
  "documentation",
  "insurance",
  "demurrage",
  "agent_fee",
  "labour",
  "other",
];
const catLabel = (c: string) => c.replace(/_/g, " ");

// revenue for a job: prefer the linked quotation, fall back to job_orders.total_amount
const jobRevenue = (job: any) => num(job?.quotation?.total_amount_usd) || num(job?.total_amount);

export default function JobCosting() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [costToDelete, setCostToDelete] = useState<string | null>(null);

  // new cost form state
  const [form, setForm] = useState({ category: "trucking", description: "", amount: "", payee: "", incurred_on: new Date().toISOString().split("T")[0] });

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["job_costing_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select(`id, job_number, status, total_amount, origin, destination, created_at, customer:customers(company_name), quotation:quotations(total_amount_usd)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // all cost lines (to aggregate per job in the list)
  const { data: allCosts } = useQuery({
    queryKey: ["all_job_costs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_costs").select("job_order_id, amount_usd");
      if (error) throw error;
      return data || [];
    },
  });

  const costByJob = useMemo(() => {
    const map: Record<string, number> = {};
    (allCosts || []).forEach((c: any) => {
      map[c.job_order_id] = (map[c.job_order_id] || 0) + num(c.amount_usd);
    });
    return map;
  }, [allCosts]);

  // cost lines for the open job
  const { data: jobCosts } = useQuery({
    queryKey: ["job_costs", selectedJob?.id],
    enabled: !!selectedJob?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_costs")
        .select("*")
        .eq("job_order_id", selectedJob.id)
        .order("incurred_on", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const rows = useMemo(() => {
    const list = (jobs || []).map((j: any) => {
      const revenue = jobRevenue(j);
      const cost = costByJob[j.id] || 0;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { ...j, revenue, cost, profit, margin };
    });
    const q = search.toLowerCase();
    return list.filter((j: any) =>
      !q ||
      j.customer?.company_name?.toLowerCase().includes(q) ||
      (j.job_number || j.id).toString().toLowerCase().includes(q) ||
      `${j.origin} ${j.destination}`.toLowerCase().includes(q)
    );
  }, [jobs, costByJob, search]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc: any, r: any) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit }),
      { revenue: 0, cost: 0, profit: 0 }
    );
  }, [rows]);

  const addCost = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0) throw new Error("Enter a cost amount greater than 0");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("job_costs")
        .insert([{
          job_order_id: selectedJob.id,
          category: form.category,
          description: form.description || null,
          amount_usd: amount,
          payee: form.payee || null,
          incurred_on: form.incurred_on,
          created_by: user?.id || null,
        }])
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Cost was not saved (no rows). Check the job_costs RLS policy in Supabase.");
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_costs", selectedJob?.id] });
      queryClient.invalidateQueries({ queryKey: ["all_job_costs"] });
      setForm({ category: form.category, description: "", amount: "", payee: "", incurred_on: new Date().toISOString().split("T")[0] });
      toast.success("Cost added");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add cost"),
  });

  const deleteCost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_costs", selectedJob?.id] });
      queryClient.invalidateQueries({ queryKey: ["all_job_costs"] });
      setCostToDelete(null);
      toast.success("Cost removed");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to remove cost"),
  });

  const openRevenue = selectedJob ? jobRevenue(selectedJob) : 0;
  const openCostTotal = (jobCosts || []).reduce((a: number, c: any) => a + num(c.amount_usd), 0);
  const openProfit = openRevenue - openCostTotal;
  const openMargin = openRevenue > 0 ? (openProfit / openRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Job Costing & Profitability" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <DollarSign className="h-4 w-4 text-blue-500" /> Total Revenue
          </div>
          <p className="text-2xl font-black mt-2 tabular-nums">{fmt(totals.revenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Wallet className="h-4 w-4 text-amber-500" /> Total Cost
          </div>
          <p className="text-2xl font-black mt-2 tabular-nums">{fmt(totals.cost)}</p>
        </div>
        <div className={cn("rounded-2xl border shadow-sm p-5 text-white", totals.profit >= 0 ? "bg-emerald-600" : "bg-rose-600")}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70">
            {totals.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} Net {totals.profit >= 0 ? "Profit" : "Loss"}
          </div>
          <p className="text-2xl font-black mt-2 tabular-nums">{fmt(totals.profit)}</p>
        </div>
      </div>

      <div className="relative w-full md:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search job, customer or route..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Job #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Profit / Loss</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell></TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No job orders found.</TableCell></TableRow>
            ) : rows.map((j: any) => (
              <TableRow key={j.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedJob(j)}>
                <TableCell className="font-mono text-[10px] font-bold text-accent uppercase">{(j.job_number || j.id).toString().split("-")[0]}</TableCell>
                <TableCell className="font-medium text-sm whitespace-nowrap">{j.customer?.company_name || "—"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap"><span className="inline-flex items-center gap-1">{j.origin} <ArrowRight className="h-3 w-3" /> {j.destination}</span></TableCell>
                <TableCell><StatusBadge status={j.status} /></TableCell>
                <TableCell className="text-right tabular-nums text-xs font-bold">{fmt(j.revenue)}</TableCell>
                <TableCell className="text-right tabular-nums text-xs font-bold text-amber-600">{fmt(j.cost)}</TableCell>
                <TableCell className={cn("text-right tabular-nums text-xs font-black", j.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>{fmt(j.profit)}</TableCell>
                <TableCell className={cn("text-right tabular-nums text-xs font-bold", j.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>{j.revenue > 0 ? `${j.margin.toFixed(1)}%` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selectedJob} onOpenChange={(o) => !o && setSelectedJob(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedJob && (
            <>
              <SheetHeader>
                <SheetTitle className="uppercase tracking-tight">
                  Job {(selectedJob.job_number || selectedJob.id).toString().split("-")[0]}
                </SheetTitle>
                <SheetDescription>
                  {selectedJob.customer?.company_name} · {selectedJob.origin} → {selectedJob.destination}
                </SheetDescription>
              </SheetHeader>

              {/* P&L summary */}
              <div className="grid grid-cols-3 gap-3 my-6">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Revenue</p>
                  <p className="text-base font-black tabular-nums mt-1">{fmt(openRevenue)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Cost</p>
                  <p className="text-base font-black tabular-nums mt-1">{fmt(openCostTotal)}</p>
                </div>
                <div className={cn("rounded-xl p-3", openProfit >= 0 ? "bg-emerald-50" : "bg-rose-50")}>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest", openProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>{openProfit >= 0 ? "Profit" : "Loss"}</p>
                  <p className="text-base font-black tabular-nums mt-1">{fmt(openProfit)}</p>
                  <p className={cn("text-[9px] font-bold", openProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>{openRevenue > 0 ? `${openMargin.toFixed(1)}% margin` : ""}</p>
                </div>
              </div>

              {/* Cost lines */}
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Cost Line Items</h4>
              <div className="border rounded-xl overflow-hidden mb-6">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-[9px] uppercase">Category</TableHead>
                      <TableHead className="text-[9px] uppercase">Details</TableHead>
                      <TableHead className="text-[9px] uppercase text-right">Amount</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(jobCosts || []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">No costs recorded yet.</TableCell></TableRow>
                    ) : (jobCosts || []).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-[11px] font-bold uppercase">{catLabel(c.category)}</TableCell>
                        <TableCell className="text-[11px]">
                          <span>{c.description || "—"}</span>
                          <span className="block text-[9px] text-muted-foreground">
                            {c.payee ? `${c.payee} · ` : ""}{c.incurred_on ? format(new Date(c.incurred_on), "MMM d, yyyy") : ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs font-bold text-amber-600">{fmt(num(c.amount_usd))}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => setCostToDelete(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Add cost form */}
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Add a Cost</h4>
              <div className="space-y-3 bg-muted/20 border rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase font-bold">Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COST_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{catLabel(c)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold">Amount (USD)</Label>
                    <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="h-10 mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold">Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Local trucking Mombasa port to yard" className="h-10 mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase font-bold">Supplier / Payee</Label>
                    <Input value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} placeholder="Optional" className="h-10 mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold">Date Incurred</Label>
                    <Input type="date" value={form.incurred_on} onChange={(e) => setForm({ ...form, incurred_on: e.target.value })} className="h-10 mt-1" />
                  </div>
                </div>
                <Button onClick={() => addCost.mutate()} disabled={addCost.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2 h-11 font-black uppercase text-[11px] tracking-widest">
                  <Plus className="h-4 w-4" /> {addCost.isPending ? "Saving..." : "Add Cost"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmModal
        isOpen={!!costToDelete}
        onClose={() => setCostToDelete(null)}
        onConfirm={() => costToDelete && deleteCost.mutate(costToDelete)}
        isDeleting={deleteCost.isPending}
        title="Remove this cost?"
        description="This cost line will be permanently deleted and the job's profit/loss recalculated."
      />
    </div>
  );
}
