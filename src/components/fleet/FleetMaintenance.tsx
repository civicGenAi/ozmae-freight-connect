import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { Wrench, ShieldCheck, Plus, Trash2, AlertTriangle, Clock, CheckCircle2, User, Truck } from "lucide-react";

const RECORD_TYPE_LABELS: Record<string, string> = {
  insurance: "Insurance",
  inspection: "Inspection",
  service: "Service",
  registration: "Registration",
  other: "Other",
};

const emptyMaintForm = {
  vehicle_id: "",
  record_type: "insurance",
  title: "",
  due_date: "",
  last_done_date: "",
  cost_usd: "",
  notes: "",
};

// Shared due-date status badge: overdue / due-soon / ok / not set.
function dueStatus(dateStr: string | null) {
  if (!dateStr) return { label: "Not set", className: "bg-muted text-muted-foreground", icon: Clock };
  const days = differenceInDays(parseISO(dateStr), new Date());
  if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, className: "bg-red-50 text-red-600 border border-red-200", icon: AlertTriangle };
  if (days <= 30) return { label: `Due in ${days}d`, className: "bg-amber-50 text-amber-600 border border-amber-200", icon: Clock };
  return { label: format(parseISO(dateStr), "MMM d, yyyy"), className: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: CheckCircle2 };
}

export function FleetMaintenance() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [maintForm, setMaintForm] = useState(emptyMaintForm);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [driverForm, setDriverForm] = useState({ license_number: "", license_class: "", license_expiry: "" });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").order("plate_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select(`*, assigned_vehicle:vehicles(plate_number)`)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: maintenance, isLoading: maintLoading } = useQuery({
    queryKey: ["vehicle_maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .select(`*, vehicle:vehicles(plate_number, vehicle_type)`)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addMaintenance = useMutation({
    mutationFn: async () => {
      if (!maintForm.vehicle_id) throw new Error("Select a vehicle");
      if (!maintForm.title.trim()) throw new Error("Enter a title");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("vehicle_maintenance").insert([{
        vehicle_id: maintForm.vehicle_id,
        record_type: maintForm.record_type,
        title: maintForm.title.trim(),
        due_date: maintForm.due_date || null,
        last_done_date: maintForm.last_done_date || null,
        cost_usd: maintForm.cost_usd ? parseFloat(maintForm.cost_usd) : null,
        notes: maintForm.notes || null,
        created_by: user?.id || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle_maintenance"] });
      setIsAddOpen(false);
      setMaintForm(emptyMaintForm);
      toast.success("Maintenance record added");
    },
    onError: (err: any) => toast.error(err.message || "Failed to add record"),
  });

  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_maintenance").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle_maintenance"] });
      setRecordToDelete(null);
      toast.success("Record removed");
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove record"),
  });

  const updateLicenseMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("drivers")
        .update({
          license_number: driverForm.license_number || null,
          license_class: driverForm.license_class || null,
          license_expiry: driverForm.license_expiry || null,
        })
        .eq("id", editingDriver.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setEditingDriver(null);
      toast.success("Driver license details updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update driver"),
  });

  const openEditDriver = (d: any) => {
    setEditingDriver(d);
    setDriverForm({
      license_number: d.license_number || "",
      license_class: d.license_class || "",
      license_expiry: d.license_expiry || "",
    });
  };

  return (
    <div className="space-y-8">
      {/* Vehicle Maintenance & Documents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-accent" />
            <h3 className="font-bold text-lg text-foreground tracking-tight">Vehicle Maintenance & Documents</h3>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground h-9 gap-2">
            <Plus className="h-4 w-4" /> Add Record
          </Button>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Vehicle</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Type</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Record</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Last Done</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Due</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Cost</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))
              ) : !maintenance || maintenance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No maintenance or document records yet.</TableCell>
                </TableRow>
              ) : maintenance.map((m: any) => {
                const status = dueStatus(m.due_date);
                const StatusIcon = status.icon;
                return (
                  <TableRow key={m.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell>
                      <span className="font-mono text-sm font-bold bg-muted px-2 py-1 rounded border shadow-sm group-hover:bg-accent/10 group-hover:text-accent group-hover:border-accent/20 transition-all">
                        {m.vehicle?.plate_number || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(m.vehicle?.vehicle_type || "").replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <p className="text-sm font-semibold text-foreground">{m.title}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{RECORD_TYPE_LABELS[m.record_type] || m.record_type}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.last_done_date ? format(parseISO(m.last_done_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${status.className}`}>
                        <StatusIcon className="h-3 w-3" /> {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{m.cost_usd != null ? `$${Number(m.cost_usd).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-rose-500 hover:text-white transition-all rounded-full"
                        onClick={() => setRecordToDelete(m.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Driver License Expiry */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h3 className="font-bold text-lg text-foreground tracking-tight">Driver License Expiry</h3>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Driver</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">License No.</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Class</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Vehicle</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Expiry</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driversLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))
              ) : !drivers || drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No drivers registered yet.</TableCell>
                </TableRow>
              ) : drivers.map((d: any) => {
                const status = dueStatus(d.license_expiry);
                const StatusIcon = status.icon;
                return (
                  <TableRow key={d.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                          {d.full_name?.split(" ").map((n: any) => n[0]).join("")}
                        </div>
                        <span className="font-semibold text-foreground">{d.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{d.license_number || "—"}</TableCell>
                    <TableCell className="text-xs font-bold text-accent">{d.license_class || "—"}</TableCell>
                    <TableCell>
                      <span className="text-xs font-mono font-bold text-muted-foreground italic flex items-center gap-1">
                        <Truck className="h-3 w-3" /> {d.assigned_vehicle?.plate_number || "Unassigned"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${status.className}`}>
                        <StatusIcon className="h-3 w-3" /> {status.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest" onClick={() => openEditDriver(d)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Maintenance Record Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Maintenance / Document Record</DialogTitle>
            <DialogDescription>Track service, inspection, insurance and registration due dates per vehicle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={maintForm.vehicle_id} onValueChange={(v) => setMaintForm((f) => ({ ...f, vehicle_id: v }))}>
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
              <Label>Record Type</Label>
              <Select value={maintForm.record_type} onValueChange={(v) => setMaintForm((f) => ({ ...f, record_type: v }))}>
                <SelectTrigger className="bg-muted/50 border-accent/20">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECORD_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g. Third-Party Insurance, Annual Inspection" value={maintForm.title} onChange={(e) => setMaintForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Last Done</Label>
                <Input type="date" value={maintForm.last_done_date} onChange={(e) => setMaintForm((f) => ({ ...f, last_done_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={maintForm.due_date} onChange={(e) => setMaintForm((f) => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cost (USD)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={maintForm.cost_usd} onChange={(e) => setMaintForm((f) => ({ ...f, cost_usd: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes" value={maintForm.notes} onChange={(e) => setMaintForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              disabled={addMaintenance.isPending}
              onClick={() => addMaintenance.mutate()}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {addMaintenance.isPending ? "Saving..." : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Driver License Dialog */}
      <Dialog open={!!editingDriver} onOpenChange={(open) => !open && setEditingDriver(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="h-4 w-4 text-accent" /> {editingDriver?.full_name}</DialogTitle>
            <DialogDescription>Update license details and expiry date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input value={driverForm.license_number} onChange={(e) => setDriverForm((f) => ({ ...f, license_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>License Class</Label>
              <Select value={driverForm.license_class} onValueChange={(v) => setDriverForm((f) => ({ ...f, license_class: v }))}>
                <SelectTrigger className="bg-muted/50 border-accent/20">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {["B", "C", "D", "E", "F"].map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>License Expiry</Label>
              <Input type="date" value={driverForm.license_expiry} onChange={(e) => setDriverForm((f) => ({ ...f, license_expiry: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              disabled={updateLicenseMutation.isPending}
              onClick={() => updateLicenseMutation.mutate()}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {updateLicenseMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={() => recordToDelete && deleteMaintenance.mutate(recordToDelete)}
        isDeleting={deleteMaintenance.isPending}
        title="Remove Record?"
        description="This will permanently remove this maintenance/document record. This action cannot be reversed."
      />
    </div>
  );
}
