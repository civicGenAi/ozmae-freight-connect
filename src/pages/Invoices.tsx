import { useState } from "react";
import { Plus, Eye, Download, DollarSign, User, Calendar, Building2, Receipt, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Invoices() {
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          job:job_orders(id, origin, destination)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ["open_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select("id, origin, destination")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (newInvoice: any) => {
      const { error } = await supabase.from("invoices").insert([newInvoice]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setIsNewModalOpen(false);
      toast.success("Invoice created successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ deposit_status: status, balance_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment status updated");
    },
  });

  const handleCreateInvoice = (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     const formData = new FormData(e.currentTarget);
     const total = parseFloat(formData.get("total_amount") as string);
     const data = {
        customer_name: formData.get("customer_name"),
        job_id: formData.get("job_id"),
        total_amount: total,
        deposit_amount: total * 0.6,
        balance_amount: total * 0.4,
        deposit_status: "pending",
        balance_status: "pending",
        due_date: formData.get("due_date"),
     };
     createInvoiceMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Documents">
        <Button onClick={() => setIsNewModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 h-10 px-6">
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </PageHeader>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground w-[120px]">Invoice #</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Operational Job</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Customer</TableHead>
              <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Total Value</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Payment Status</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Due Date</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : invoices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No invoices generated yet.</TableCell>
              </TableRow>
            ) : invoices?.map((inv: any) => (
              <TableRow key={inv.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-[10px] font-black uppercase text-accent">
                   INV-{inv.id.split('-')[0]}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-foreground">JOB-{inv.job?.id.split('-')[0].toUpperCase()}</span>
                    <span className="text-[10px] text-muted-foreground italic">{inv.job?.origin} → {inv.job?.destination}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-foreground">{inv.customer_name}</TableCell>
                <TableCell className="text-right font-black text-foreground">{formatCurrency(inv.total_amount)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                     <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">Deposit</span>
                        <StatusBadge status={inv.deposit_status} />
                     </div>
                     <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">Balance</span>
                        <StatusBadge status={inv.balance_status} />
                     </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-medium text-muted-foreground">
                  {format(new Date(inv.due_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setViewInvoice(inv)} 
                      className="h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground transition-all"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this invoice?")) {
                          deleteInvoiceMutation.mutate(inv.id);
                        }
                      }} 
                      className="h-8 w-8 rounded-full hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New Invoice Dialog */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md">
           <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>Generate a new payment request for an operational job.</DialogDescription>
           </DialogHeader>
           <form onSubmit={handleCreateInvoice} className="space-y-4 py-4">
              <div className="space-y-2">
                 <Label>Customer Name</Label>
                 <Input name="customer_name" placeholder="ABC Logistics" required />
              </div>
              <div className="space-y-2">
                 <Label>Operational Job</Label>
                 <Select name="job_id" required>
                    <SelectTrigger>
                       <SelectValue placeholder="Select a job" />
                    </SelectTrigger>
                    <SelectContent>
                       {jobs?.map((job: any) => (
                          <SelectItem key={job.id} value={job.id}>
                             JOB-{job.id.split('-')[0].toUpperCase()} ({job.origin} {"->"} {job.destination})
                          </SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Total Amount (USD)</Label>
                    <Input name="total_amount" type="number" step="0.01" placeholder="5000.00" required />
                 </div>
                 <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input name="due_date" type="date" required />
                 </div>
              </div>
              <DialogFooter className="pt-4">
                 <Button type="button" variant="ghost" onClick={() => setIsNewModalOpen(false)}>Cancel</Button>
                 <Button type="submit" disabled={createInvoiceMutation.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {createInvoiceMutation.isPending ? "Creating..." : "Generate Invoice"}
                 </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[95vh] p-0 overflow-hidden bg-white border-0 shadow-2xl">
          <DialogHeader className="bg-slate-900 p-8 text-white">
             <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-3">
                   <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-accent-foreground shadow-lg rotate-3">
                      <Receipt className="h-6 w-6" />
                   </div>
                   <div>
                      <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Tax Invoice</DialogTitle>
                      <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Official Payment Request</DialogDescription>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-accent font-black text-xl leading-none">INV-{viewInvoice?.id.split('-')[0].toUpperCase()}</p>
                   <p className="text-[10px] font-bold text-slate-400 mt-2">DATED: {viewInvoice && format(new Date(viewInvoice.created_at), "MMMM dd, yyyy")}</p>
                </div>
             </div>
          </DialogHeader>

          {viewInvoice && (
            <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(95vh-140px)]">
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest border-b border-dashed pb-2">
                     <Building2 className="h-4 w-4" /> Company Details
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-black text-slate-900">Ozmae Freight Solutions Ltd</p>
                    <p className="text-xs text-muted-foreground">Plot 14, Nyerere Road</p>
                    <p className="text-xs text-muted-foreground">Dar es Salaam, Tanzania</p>
                    <p className="text-xs font-bold text-slate-700 mt-2">TIN: 123-456-789</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-accent font-black uppercase text-[10px] tracking-widest border-b border-dashed pb-2">
                     <User className="h-4 w-4" /> Billed To
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-black text-slate-900">{viewInvoice.customer_name}</p>
                    <p className="text-xs text-muted-foreground">Registered Logistics Partner</p>
                    <p className="text-xs font-bold text-accent mt-2 flex items-center gap-1">
                       <Calendar className="h-3 w-3" /> DUE BY {format(new Date(viewInvoice.due_date), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-slate-100 overflow-hidden bg-slate-50/30">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="text-left px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Service Description</th>
                      <th className="text-center px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Qty</th>
                      <th className="text-right px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Unit Price</th>
                      <th className="text-right px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-white">
                      <td className="px-6 py-6">
                        <div className="space-y-1">
                           <p className="font-black text-slate-900">Heavy Cargo Transport Service</p>
                           <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" /> Operational Job Reference: #{viewInvoice.job?.id.split('-')[0]}
                           </p>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center font-bold">1</td>
                      <td className="px-6 py-6 text-right font-medium">{formatCurrency(viewInvoice.total_amount)}</td>
                      <td className="px-6 py-6 text-right font-black text-primary">{formatCurrency(viewInvoice.total_amount)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900/5">
                      <td colSpan={3} className="px-6 py-4 text-right font-bold text-slate-600">Subtotal</td>
                      <td className="px-6 py-4 text-right font-black">{formatCurrency(viewInvoice.total_amount)}</td>
                    </tr>
                    <tr className="bg-slate-900/10">
                      <td colSpan={3} className="px-6 py-4 text-right font-bold text-slate-600">VAT (0%)</td>
                      <td className="px-6 py-4 text-right font-black">$0.00</td>
                    </tr>
                    <tr className="bg-accent text-accent-foreground">
                      <td colSpan={3} className="px-6 py-6 text-right font-black uppercase text-xs tracking-widest">Total Amount Due</td>
                      <td className="px-6 py-6 text-right font-black text-xl">{formatCurrency(viewInvoice.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-xl border border-dashed border-success/30 bg-success/5 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-success/70">Required Deposit (60%)</p>
                        <p className="text-lg font-black text-success">{formatCurrency(viewInvoice.deposit_amount)}</p>
                    </div>
                    <StatusBadge status={viewInvoice.deposit_status} />
                 </div>
                 <div className="p-4 rounded-xl border border-dashed border-accent/20 bg-accent/5 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent/70">Remaining Balance (40%)</p>
                        <p className="text-lg font-black text-accent">{formatCurrency(viewInvoice.balance_amount)}</p>
                    </div>
                    <StatusBadge status={viewInvoice.balance_status} />
                 </div>
              </div>

              <div className="pt-4 flex gap-3">
                 <Button className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-widest gap-2">
                    <Download className="h-4 w-4" /> Download PDF
                 </Button>
                 <Button 
                    className="flex-1 h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase text-xs tracking-widest gap-2 shadow-lg shadow-accent/20"
                    onClick={() => updateStatusMutation.mutate({ id: viewInvoice.id, status: 'paid' })}
                  >
                    <DollarSign className="h-4 w-4" /> Mark as Paid
                 </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
