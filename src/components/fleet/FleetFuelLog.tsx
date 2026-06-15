import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HybridSelect } from "@/components/HybridSelect";
import { CreatableCombobox } from "@/components/CreatableCombobox";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Fuel, Plus, Truck, Wallet } from "lucide-react";

const DEFAULT_CATEGORIES = ["Fuel", "Tolls", "Repairs", "Trucking", "Other"];
const fmt = (n: number) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const emptyForm = {
  job_order_id: "",
  vehicle_id: "",
  category: "Fuel",
  description: "",
  amount: "",
  payee: "",
  incurred_on: new Date().toISOString().split("T")[0],
};

export function FleetFuelLog() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").order("plate_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: jobOrders } = useQuery({
    queryKey: ["fleet_job_orders_picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select("id, job_number, origin, destination, customer:customers(company_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: usedCostCats } = useQuery({
    queryKey: ["job_cost_categories"],
    queryFn: async () => {
      const { data } = await supabase.from("job_costs").select("category");
      return Array.from(new Set((data || []).map((d: any) => d.category).filter(Boolean)));
    },
  });

  const { data: fuelCosts, isLoading } = useQuery({
    queryKey: ["fleet_fuel_costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_costs")
        .select(`id, amount_usd, category, description, payee, incurred_on, vehicle_id, job_order:job_orders(job_number), vehicle:vehicles(plate_number, vehicle_type)`)
        .not("vehicle_id", "is", null)
        .order("incurred_on", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const categoryOptions = useMemo(() => Array.from(new Set([...DEFAULT_CATEGORIES, ...((usedCostCats as string[]) || [])])), [usedCostCats]);

  const jobOrderOptions = useMemo(
    () => (jobOrders || []).map((j: any) => ({
      value: j.id,
      label: j.job_number || `#${j.id.split("-")[0]}`,
      hint: `${j.origin} → ${j.destination}`,
    })),
    [jobOrders]
  );

  const vehicleTotals = useMemo(() => {
    const map: Record<string, { plate: string; type: string; total: number; count: number }> = {};
    (fuelCosts || []).forEach((c: any) => {
      const key = c.vehicle_id;
      if (!map[key]) map[key] = { plate: c.vehicle?.plate_number || "—", type: c.vehicle?.vehicle_type || "", total: 0, count: 0 };
      map[key].total += Number(c.amount_usd) || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [fuelCosts]);

  const grandTotal = useMemo(() => vehicleTotals.reduce((a, v) => a + v.total, 0), [vehicleTotals]);

  const addFuelCost = useMutation({
    mutationFn: async () => {
      if (!form.vehicle_id) throw new Error("Select a vehicle");
      if (!form.job_order_id) throw new Error("Select a job order to bill this cost to");
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0) throw new Error("Enter an amount greater than 0");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("job_costs").insert([{
        job_order_id: form.job_order_id,
        vehicle_id: form.vehicle_id,
        category: form.category,
        description: form.description || null,
        amount_usd: amount,
        payee: form.payee || null,
        incurred_on: form.incurred_on,
        payment_status: "owed",
        created_by: user?.id || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet_fuel_costs"] });
      queryClient.invalidateQueries({ queryKey: ["all_job_costs"] });
      queryClient.invalidateQueries({ queryKey: ["job_cost_categories"] });
      queryClient.invalidateQueries({ queryKey: ["job_costs", form.job_order_id] });
      setForm((f) => ({ ...emptyForm, category: f.category }));
      toast.success("Cost logged");
    },
    onError: (err: any) => toast.error(err.message || "Failed to log cost"),
  });

  return (
    <div className="space-y-8">
      {/* Per-vehicle totals */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Fuel className="h-5 w-5 text-accent" />
          <h3 className="font-bold text-lg text-foreground tracking-tight">Fuel & Trip Cost Totals</h3>
        </div>
        {vehicleTotals.length === 0 ? (
          <div className="py-10 text-center bg-muted/10 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3">
            <Wallet className="h-8 w-8 text-muted-foreground opacity-20" />
            <p className="text-sm font-bold text-foreground">No fuel or trip costs logged yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="bg-card rounded-2xl border shadow-sm p-4 bg-accent/5 border-accent/20">
              <p className="text-xl font-black tabular-nums text-accent">{fmt(grandTotal)}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Total Logged</p>
            </div>
            {vehicleTotals.map((v) => (
              <div key={v.plate} className="bg-card rounded-2xl border shadow-sm p-4">
                <p className="text-xl font-black tabular-nums">{fmt(v.total)}</p>
                <p className="text-[10px] font-bold text-foreground mt-1 flex items-center gap-1">
                  <Truck className="h-3 w-3 text-muted-foreground" /> {v.plate}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{v.count} entr{v.count === 1 ? "y" : "ies"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add cost */}
      <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
        <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Plus className="h-3.5 w-3.5 text-accent" /> Log Fuel / Trip Cost
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Job Order</Label>
            <HybridSelect
              options={jobOrderOptions}
              value={form.job_order_id}
              onChange={(val) => setForm((f) => ({ ...f, job_order_id: val }))}
              placeholder="Search job number, route, customer..."
              emptyMessage="No matching job order."
            />
          </div>
          <div className="space-y-2">
            <Label>Vehicle</Label>
            <Select value={form.vehicle_id} onValueChange={(v) => setForm((f) => ({ ...f, vehicle_id: v }))}>
              <SelectTrigger className="bg-muted/50 border-accent/20">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {(vehicles || []).map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>{v.plate_number} — {(v.vehicle_type || "").replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <CreatableCombobox
              options={categoryOptions}
              value={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v }))}
              placeholder="Select or type a category"
            />
          </div>
          <div className="space-y-2">
            <Label>Amount (USD)</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={form.incurred_on} onChange={(e) => setForm((f) => ({ ...f, incurred_on: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Payee (optional)</Label>
            <Input placeholder="Fuel station, garage..." value={form.payee} onChange={(e) => setForm((f) => ({ ...f, payee: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description (optional)</Label>
            <Input placeholder="e.g. Diesel top-up, tyre repair" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <Button
          type="button"
          disabled={addFuelCost.isPending}
          onClick={() => addFuelCost.mutate()}
          className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {addFuelCost.isPending ? "Logging..." : "Log Cost"}
        </Button>
        <p className="text-[9px] text-muted-foreground">Logged costs also appear in Job Costing under the selected job's cost breakdown.</p>
      </div>

      {/* Recent entries */}
      <div className="space-y-4">
        <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Recent Entries</h3>
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Date</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Vehicle</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Job</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Category</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Description</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))
              ) : !fuelCosts || fuelCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No entries logged yet.</TableCell>
                </TableRow>
              ) : fuelCosts.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs text-muted-foreground">{c.incurred_on ? format(parseISO(c.incurred_on), "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded border">{c.vehicle?.plate_number || "—"}</span>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] font-black text-accent uppercase">{c.job_order?.job_number || "—"}</TableCell>
                  <TableCell className="text-xs font-bold text-foreground">{c.category}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.description || "—"}{c.payee ? ` · ${c.payee}` : ""}</TableCell>
                  <TableCell className="text-right text-sm font-mono font-bold">{fmt(Number(c.amount_usd))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
