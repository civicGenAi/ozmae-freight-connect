import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Search, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRight, Clock, CheckCircle2, Layers, X } from "lucide-react";

const fmt = (n: number) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v: any) => Number(v) || 0;

const COST_CATEGORIES = ["trucking", "fuel", "customs_clearing", "port_terminal", "handling", "documentation", "insurance", "demurrage", "agent_fee", "labour", "other"];
const CHARGE_CATEGORIES = ["freight", "handling", "documentation", "storage", "insurance", "customs", "demurrage", "other"];
const catLabel = (c: string) => (c || "").replace(/_/g, " ");

// base revenue for a job: prefer the linked quotation, fall back to job total
const jobBaseRevenue = (job: any) => num(job?.quotation?.total_amount_usd) || num(job?.total_amount);

export default function JobCosting() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [costToDelete, setCostToDelete] = useState<string | null>(null);
  const [chargeToDelete, setChargeToDelete] = useState<string | null>(null);
  // Combine-jobs (joint costing) selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [combineOpen, setCombineOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const [costForm, setCostForm] = useState({ category: "trucking", description: "", amount: "", payee: "", incurred_on: new Date().toISOString().split("T")[0] });
  const [chargeForm, setChargeForm] = useState({ category: "freight", description: "", amount: "", incurred_on: new Date().toISOString().split("T")[0] });

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

  const { data: allCosts } = useQuery({
    queryKey: ["all_job_costs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_costs").select("job_order_id, amount_usd, payment_status");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allCharges } = useQuery({
    queryKey: ["all_job_charges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_charges").select("job_order_id, amount_usd");
      if (error) throw error;
      return data || [];
    },
  });

  // Optional saved groupings (consolidated shipments) — additive convenience.
  const { data: savedGroups } = useQuery({
    queryKey: ["job_groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_groups").select("*").order("created_at", { ascending: false });
      if (error) return []; // table may not be migrated yet — fail soft
      return data || [];
    },
  });

  const costByJob = useMemo(() => {
    const map: Record<string, number> = {};
    (allCosts || []).forEach((c: any) => { map[c.job_order_id] = (map[c.job_order_id] || 0) + num(c.amount_usd); });
    return map;
  }, [allCosts]);

  const chargeByJob = useMemo(() => {
    const map: Record<string, number> = {};
    (allCharges || []).forEach((c: any) => { map[c.job_order_id] = (map[c.job_order_id] || 0) + num(c.amount_usd); });
    return map;
  }, [allCharges]);

  const payablesOwedTotal = useMemo(
    () => (allCosts || []).filter((c: any) => (c.payment_status || "owed") === "owed").reduce((a: number, c: any) => a + num(c.amount_usd), 0),
    [allCosts]
  );

  // detail queries for the open job
  const { data: jobCosts } = useQuery({
    queryKey: ["job_costs", selectedJob?.id],
    enabled: !!selectedJob?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("job_costs").select("*").eq("job_order_id", selectedJob.id).order("incurred_on", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: jobCharges } = useQuery({
    queryKey: ["job_charges", selectedJob?.id],
    enabled: !!selectedJob?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("job_charges").select("*").eq("job_order_id", selectedJob.id).order("incurred_on", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const rows = useMemo(() => {
    const list = (jobs || []).map((j: any) => {
      const revenue = jobBaseRevenue(j) + (chargeByJob[j.id] || 0);
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
  }, [jobs, costByJob, chargeByJob, search]);

  const totals = useMemo(
    () => rows.reduce((acc: any, r: any) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 }),
    [rows]
  );

  // Joint costing for the selected jobs
  const combinedRows = useMemo(() => rows.filter((r: any) => selectedIds.has(r.id)), [rows, selectedIds]);
  const combinedTotals = useMemo(
    () => combinedRows.reduce((acc: any, r: any) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 }),
    [combinedRows]
  );
  const combinedMargin = combinedTotals.revenue > 0 ? (combinedTotals.profit / combinedTotals.revenue) * 100 : 0;
  const distinctClients = useMemo(() => new Set(combinedRows.map((r: any) => r.customer?.company_name || "—")), [combinedRows]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["job_costs", selectedJob?.id] });
    queryClient.invalidateQueries({ queryKey: ["job_charges", selectedJob?.id] });
    queryClient.invalidateQueries({ queryKey: ["all_job_costs"] });
    queryClient.invalidateQueries({ queryKey: ["all_job_charges"] });
  };

  const addCost = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(costForm.amount);
      if (!amount || amount <= 0) throw new Error("Enter a cost amount greater than 0");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("job_costs").insert([{
        job_order_id: selectedJob.id, category: costForm.category, description: costForm.description || null,
        amount_usd: amount, payee: costForm.payee || null, incurred_on: costForm.incurred_on, payment_status: "owed", created_by: user?.id || null,
      }]).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Cost was not saved (no rows). Check the job_costs RLS policy in Supabase.");
      return data[0];
    },
    onSuccess: () => { invalidateAll(); setCostForm({ category: costForm.category, description: "", amount: "", payee: "", incurred_on: new Date().toISOString().split("T")[0] }); toast.success("Cost added"); },
    onError: (err: any) => toast.error(err?.message || "Failed to add cost"),
  });

  const toggleCostPaid = useMutation({
    mutationFn: async (cost: any) => {
      const next = (cost.payment_status || "owed") === "paid" ? "owed" : "paid";
      const { error } = await supabase.from("job_costs").update({ payment_status: next, paid_on: next === "paid" ? new Date().toISOString().split("T")[0] : null }).eq("id", cost.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); },
    onError: (err: any) => toast.error(err?.message || "Failed to update payment status"),
  });

  const deleteCost = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("job_costs").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { invalidateAll(); setCostToDelete(null); toast.success("Cost removed"); },
    onError: (err: any) => toast.error(err?.message || "Failed to remove cost"),
  });

  const addCharge = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(chargeForm.amount);
      if (!amount || amount <= 0) throw new Error("Enter a charge amount greater than 0");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("job_charges").insert([{
        job_order_id: selectedJob.id, category: chargeForm.category, description: chargeForm.description || null,
        amount_usd: amount, incurred_on: chargeForm.incurred_on, created_by: user?.id || null,
      }]).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Charge was not saved (no rows). Check the job_charges RLS policy in Supabase.");
      return data[0];
    },
    onSuccess: () => { invalidateAll(); setChargeForm({ category: chargeForm.category, description: "", amount: "", incurred_on: new Date().toISOString().split("T")[0] }); toast.success("Billable charge added"); },
    onError: (err: any) => toast.error(err?.message || "Failed to add charge"),
  });

  const deleteCharge = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("job_charges").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { invalidateAll(); setChargeToDelete(null); toast.success("Charge removed"); },
    onError: (err: any) => toast.error(err?.message || "Failed to remove charge"),
  });

  const saveGroup = useMutation({
    mutationFn: async () => {
      const name = groupName.trim();
      if (!name) throw new Error("Give this combination a name");
      if (selectedIds.size < 2) throw new Error("Select at least two jobs");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("job_groups").insert([{ name, job_ids: Array.from(selectedIds), created_by: user?.id || null }]).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Not saved (no rows). Check the job_groups RLS policy in Supabase.");
      return data[0];
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job_groups"] }); setGroupName(""); toast.success("Combination saved"); },
    onError: (e: any) => toast.error(e?.message || "Failed to save combination"),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("job_groups").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job_groups"] }); toast.success("Combination removed"); },
    onError: (e: any) => toast.error(e?.message || "Failed to remove"),
  });

  const openSavedGroup = (g: any) => {
    setSelectedIds(new Set((g.job_ids || []) as string[]));
    setCombineOpen(true);
  };

  // open-job P&L
  const baseRev = selectedJob ? jobBaseRevenue(selectedJob) : 0;
  const extraRev = (jobCharges || []).reduce((a: number, c: any) => a + num(c.amount_usd), 0);
  const openRevenue = baseRev + extraRev;
  const openCostTotal = (jobCosts || []).reduce((a: number, c: any) => a + num(c.amount_usd), 0);
  const openOwed = (jobCosts || []).filter((c: any) => (c.payment_status || "owed") === "owed").reduce((a: number, c: any) => a + num(c.amount_usd), 0);
  const openProfit = openRevenue - openCostTotal;
  const openMargin = openRevenue > 0 ? (openProfit / openRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Job Costing & Profitability" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground"><DollarSign className="h-4 w-4 text-blue-500" /> Total Revenue</div>
          <p className="text-2xl font-black mt-2 tabular-nums">{fmt(totals.revenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground"><Wallet className="h-4 w-4 text-amber-500" /> Total Cost</div>
          <p className="text-2xl font-black mt-2 tabular-nums">{fmt(totals.cost)}</p>
        </div>
        <div className={cn("rounded-2xl border shadow-sm p-5 text-white", totals.profit >= 0 ? "bg-emerald-600" : "bg-rose-600")}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70">{totals.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} Net {totals.profit >= 0 ? "Profit" : "Loss"}</div>
          <p className="text-2xl font-black mt-2 tabular-nums">{fmt(totals.profit)}</p>
        </div>
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground"><Clock className="h-4 w-4 text-rose-500" /> Payables Owed</div>
          <p className="text-2xl font-black mt-2 tabular-nums text-rose-600">{fmt(payablesOwedTotal)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search job, customer or route..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="h-9 text-[10px] font-black uppercase tracking-widest">Clear</Button>
            <Button size="sm" disabled={selectedIds.size < 2} onClick={() => setCombineOpen(true)} className="h-9 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground text-[10px] font-black uppercase tracking-widest">
              <Layers className="h-3.5 w-3.5" /> Combine ({selectedIds.size})
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground font-medium hidden sm:block">Tick jobs to combine them into a joint profit/loss.</p>
        )}
      </div>

      {/* Saved combinations (optional) — only shows when some exist */}
      {(savedGroups || []).length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-accent" /> Saved Combinations
          </p>
          <div className="flex flex-wrap gap-2">
            {(savedGroups || []).map((g: any) => (
              <div key={g.id} className="inline-flex items-center gap-2 bg-muted/40 hover:bg-muted/70 border rounded-full pl-3 pr-1.5 py-1 transition-colors">
                <button onClick={() => openSavedGroup(g)} className="text-[11px] font-bold">
                  {g.name} <span className="text-muted-foreground font-medium">· {(g.job_ids || []).length} jobs</span>
                </button>
                <button onClick={() => deleteGroup.mutate(g.id)} className="h-5 w-5 rounded-full hover:bg-rose-100 text-muted-foreground hover:text-rose-600 flex items-center justify-center" title="Delete combination">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-10"></TableHead>
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
              Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={9}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell></TableRow>))
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No job orders found.</TableCell></TableRow>
            ) : rows.map((j: any) => (
              <TableRow key={j.id} className={cn("cursor-pointer hover:bg-muted/30 transition-colors", selectedIds.has(j.id) && "bg-accent/5")} onClick={() => setSelectedJob(j)}>
                <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
                  <Checkbox checked={selectedIds.has(j.id)} onCheckedChange={() => toggleSelect(j.id)} aria-label="Select job for combine" />
                </TableCell>
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

      <Sheet open={!!selectedJob} onOpenChange={(o) => !o && setSelectedJob(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedJob && (
            <>
              <SheetHeader>
                <SheetTitle className="uppercase tracking-tight">Job {(selectedJob.job_number || selectedJob.id).toString().split("-")[0]}</SheetTitle>
                <SheetDescription>{selectedJob.customer?.company_name} · {selectedJob.origin} → {selectedJob.destination}</SheetDescription>
              </SheetHeader>

              {/* P&L summary */}
              <div className="grid grid-cols-3 gap-3 my-6">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Revenue</p>
                  <p className="text-base font-black tabular-nums mt-1">{fmt(openRevenue)}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{fmt(baseRev)} + {fmt(extraRev)} extra</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Cost</p>
                  <p className="text-base font-black tabular-nums mt-1">{fmt(openCostTotal)}</p>
                  <p className="text-[9px] text-rose-600 mt-0.5">{fmt(openOwed)} owed</p>
                </div>
                <div className={cn("rounded-xl p-3", openProfit >= 0 ? "bg-emerald-50" : "bg-rose-50")}>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest", openProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>{openProfit >= 0 ? "Profit" : "Loss"}</p>
                  <p className="text-base font-black tabular-nums mt-1">{fmt(openProfit)}</p>
                  <p className={cn("text-[9px] font-bold mt-0.5", openProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>{openRevenue > 0 ? `${openMargin.toFixed(1)}% margin` : ""}</p>
                </div>
              </div>

              {/* Extra billable charges */}
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Extra Billable Charges</h4>
              <div className="border rounded-xl overflow-hidden mb-4">
                <Table>
                  <TableHeader className="bg-muted/50"><TableRow><TableHead className="text-[9px] uppercase">Category</TableHead><TableHead className="text-[9px] uppercase">Details</TableHead><TableHead className="text-[9px] uppercase text-right">Amount</TableHead><TableHead className="w-8"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(jobCharges || []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-5 text-xs text-muted-foreground">No extra charges. Revenue uses the quote only.</TableCell></TableRow>
                    ) : (jobCharges || []).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-[11px] font-bold uppercase">{catLabel(c.category)}</TableCell>
                        <TableCell className="text-[11px]"><span>{c.description || "—"}</span><span className="block text-[9px] text-muted-foreground">{c.incurred_on ? format(new Date(c.incurred_on), "MMM d, yyyy") : ""}</span></TableCell>
                        <TableCell className="text-right tabular-nums text-xs font-bold text-emerald-600">{fmt(num(c.amount_usd))}</TableCell>
                        <TableCell><Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => setChargeToDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <Select value={chargeForm.category} onValueChange={(v) => setChargeForm({ ...chargeForm, category: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHARGE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{catLabel(c)}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" step="0.01" min="0" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })} placeholder="Amount" className="h-9 text-xs" />
                <Input value={chargeForm.description} onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })} placeholder="Description" className="h-9 text-xs col-span-2" />
                <Button onClick={() => addCharge.mutate()} disabled={addCharge.isPending} variant="outline" className="col-span-2 h-9 gap-2 text-[10px] font-black uppercase tracking-widest border-emerald-500/40 text-emerald-700 hover:bg-emerald-50">
                  <Plus className="h-3.5 w-3.5" /> {addCharge.isPending ? "Saving..." : "Add Billable Charge"}
                </Button>
              </div>

              {/* Cost lines */}
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Cost Line Items</h4>
              <div className="border rounded-xl overflow-hidden mb-4">
                <Table>
                  <TableHeader className="bg-muted/50"><TableRow><TableHead className="text-[9px] uppercase">Category</TableHead><TableHead className="text-[9px] uppercase">Details</TableHead><TableHead className="text-[9px] uppercase">Payable</TableHead><TableHead className="text-[9px] uppercase text-right">Amount</TableHead><TableHead className="w-8"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(jobCosts || []).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">No costs recorded yet.</TableCell></TableRow>
                    ) : (jobCosts || []).map((c: any) => {
                      const paid = (c.payment_status || "owed") === "paid";
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-[11px] font-bold uppercase">{catLabel(c.category)}</TableCell>
                          <TableCell className="text-[11px]"><span>{c.description || "—"}</span><span className="block text-[9px] text-muted-foreground">{c.payee ? `${c.payee} · ` : ""}{c.incurred_on ? format(new Date(c.incurred_on), "MMM d, yyyy") : ""}</span></TableCell>
                          <TableCell>
                            <button
                              onClick={() => toggleCostPaid.mutate(c)}
                              className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors", paid ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200")}
                              title="Click to toggle paid / owed"
                            >
                              {paid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />} {paid ? "Paid" : "Owed"}
                            </button>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-bold text-amber-600">{fmt(num(c.amount_usd))}</TableCell>
                          <TableCell><Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => setCostToDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Add cost form */}
              <div className="space-y-3 bg-muted/20 border rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase font-bold">Category</Label>
                    <Select value={costForm.category} onValueChange={(v) => setCostForm({ ...costForm, category: v })}>
                      <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{COST_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{catLabel(c)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold">Amount (USD)</Label>
                    <Input type="number" step="0.01" min="0" value={costForm.amount} onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })} placeholder="0.00" className="h-10 mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold">Description</Label>
                  <Input value={costForm.description} onChange={(e) => setCostForm({ ...costForm, description: e.target.value })} placeholder="e.g. Local trucking Mombasa port to yard" className="h-10 mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase font-bold">Supplier / Payee</Label>
                    <Input value={costForm.payee} onChange={(e) => setCostForm({ ...costForm, payee: e.target.value })} placeholder="Optional" className="h-10 mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold">Date Incurred</Label>
                    <Input type="date" value={costForm.incurred_on} onChange={(e) => setCostForm({ ...costForm, incurred_on: e.target.value })} className="h-10 mt-1" />
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

      {/* Combined / joint costing view */}
      <Dialog open={combineOpen} onOpenChange={setCombineOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase tracking-tight font-black">
              <Layers className="h-5 w-5 text-accent" /> Combined Job Costing
            </DialogTitle>
            <DialogDescription>
              Joint profit/loss across {combinedRows.length} jobs
              {distinctClients.size === 1 ? ` for ${Array.from(distinctClients)[0]}` : ` across ${distinctClients.size} clients`}.
              Nothing is changed — each job is still tracked on its own.
            </DialogDescription>
          </DialogHeader>

          {/* Combined totals */}
          <div className="grid grid-cols-3 gap-3 my-2">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Revenue</p>
              <p className="text-base font-black tabular-nums mt-1">{fmt(combinedTotals.revenue)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Cost</p>
              <p className="text-base font-black tabular-nums mt-1">{fmt(combinedTotals.cost)}</p>
            </div>
            <div className={cn("rounded-xl p-3", combinedTotals.profit >= 0 ? "bg-emerald-50" : "bg-rose-50")}>
              <p className={cn("text-[9px] font-black uppercase tracking-widest", combinedTotals.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {combinedTotals.profit >= 0 ? "Profit" : "Loss"}
              </p>
              <p className="text-base font-black tabular-nums mt-1">{fmt(combinedTotals.profit)}</p>
              <p className={cn("text-[9px] font-bold mt-0.5", combinedTotals.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {combinedTotals.revenue > 0 ? `${combinedMargin.toFixed(1)}% margin` : ""}
              </p>
            </div>
          </div>

          {/* Per-job breakdown */}
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-[9px] uppercase">Job</TableHead>
                  <TableHead className="text-[9px] uppercase text-right">Revenue</TableHead>
                  <TableHead className="text-[9px] uppercase text-right">Cost</TableHead>
                  <TableHead className="text-[9px] uppercase text-right">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedRows.map((j: any) => (
                  <TableRow key={j.id}>
                    <TableCell className="text-[11px]">
                      <span className="font-mono font-bold text-accent uppercase">{(j.job_number || j.id).toString().split("-")[0]}</span>
                      <span className="block text-[9px] text-muted-foreground truncate max-w-[160px]">{j.customer?.company_name || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-bold">{fmt(j.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-bold text-amber-600">{fmt(j.cost)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums text-xs font-black", j.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>{fmt(j.profit)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-black">
                  <TableCell className="text-[11px] font-black uppercase">Combined</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{fmt(combinedTotals.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs text-amber-600">{fmt(combinedTotals.cost)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums text-xs", combinedTotals.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>{fmt(combinedTotals.profit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className={cn("mt-2 rounded-xl p-4 text-center", combinedTotals.profit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
            <p className="text-[10px] font-black uppercase tracking-widest">Verdict</p>
            <p className="text-lg font-black">
              {combinedTotals.profit >= 0 ? "Profitable" : "Loss-making"} · {fmt(combinedTotals.profit)}
            </p>
          </div>

          {/* Optional: persist this combination for later */}
          <div className="mt-4 border-t pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Save this combination (optional)</p>
            <div className="flex gap-2">
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Consolidated container — Mombasa run" className="h-10" />
              <Button onClick={() => saveGroup.mutate()} disabled={saveGroup.isPending || !groupName.trim()} className="h-10 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground text-[10px] font-black uppercase tracking-widest shrink-0">
                <Plus className="h-3.5 w-3.5" /> Save
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">Saved combinations appear above the table and can be reopened anytime. This does not change the individual jobs.</p>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal isOpen={!!costToDelete} onClose={() => setCostToDelete(null)} onConfirm={() => costToDelete && deleteCost.mutate(costToDelete)} isDeleting={deleteCost.isPending} title="Remove this cost?" description="This cost line will be permanently deleted and the job's profit/loss recalculated." />
      <DeleteConfirmModal isOpen={!!chargeToDelete} onClose={() => setChargeToDelete(null)} onConfirm={() => chargeToDelete && deleteCharge.mutate(chargeToDelete)} isDeleting={deleteCharge.isPending} title="Remove this charge?" description="This billable charge will be permanently deleted and revenue recalculated." />
    </div>
  );
}
