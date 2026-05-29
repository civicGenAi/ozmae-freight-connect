import { useState } from "react";
import { Plus, Eye, Download, DollarSign, User, Calendar, Building2, Receipt, MapPin, Trash2, Clock } from "lucide-react";
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
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/InvoicePDF";
import { DeliveryNotePDF } from "@/components/DeliveryNotePDF";
import { CheckCircle2, Truck } from "lucide-react";
const formatCurrency = (amount: number) => 
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
import { Pagination } from "@/components/Pagination";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

const PAGE_SIZE = 15;

export default function Invoices() {
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [customerOverride, setCustomerOverride] = useState({ name: "", address: "", phone: "" });
  const [deliveryNoteJob, setDeliveryNoteJob] = useState<any>(null);
  const [deliveryOverrides, setDeliveryOverrides] = useState({
    deliveredBy: "OSMOND MOSHA",
    shippingAddress: "",
    invoiceAddress: "",
    despatchDate: "",
    deliveryMethod: "ROAD",
    itemDescription: "",
    orderedQty: "1",
    deliveredQty: "1",
    outstandingQty: "0",
  });
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ["invoices", currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          job_order_id,
          customer_id,
          subtotal_usd,
          total_amount_usd,
          deposit_amount_usd,
          balance_amount_usd,
          deposit_status,
          balance_status,
          deposit_due_date,
          created_at,
          job:job_orders(id, origin, destination, customer:customers(company_name))
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { invoices: data, totalCount: count || 0 };
    },
  });

  const invoices = invoiceData?.invoices || [];
  const totalCount = invoiceData?.totalCount || 0;

  const { data: jobs } = useQuery({
    queryKey: ["open_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select(`
          id, 
          origin, 
          destination, 
          customer_id,
          customer:customers(company_name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (newInvoice: any) => {
      const { error } = await supabase
        .from("invoices")
        .insert([newInvoice])
        .select("id, total_amount_usd");
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
      setInvoiceToDelete(null);
      toast.success("Invoice deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ 
          deposit_status: status, 
          balance_status: status,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment status updated");
    },
  });

  const handleCreateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const jobId = formData.get("job_id") as string;
      const total = parseFloat(formData.get("total_amount") as string);
      
      const selectedJob = jobs?.find(j => j.id === jobId);
      if (!selectedJob) return toast.error("Please select a valid job");

      const { data: { user } } = await supabase.auth.getUser();

      const data = {
         job_order_id: jobId,
         customer_id: selectedJob.customer_id,
         subtotal_usd: total,
         total_amount_usd: total,
         deposit_amount_usd: total * 0.6,
         balance_amount_usd: total * 0.4,
         deposit_status: "pending",
         balance_status: "pending",
         deposit_due_date: formData.get("due_date"),
         balance_due_date: formData.get("due_date"), 
         created_by: user?.id,
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
                <TableCell className="font-medium text-foreground">{inv.job?.customer?.company_name || 'N/A'}</TableCell>
                <TableCell className="text-right font-black text-foreground">{formatCurrency(inv.total_amount_usd)}</TableCell>
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
                  {inv.deposit_due_date ? format(new Date(inv.deposit_due_date), "MMM d, yyyy") : 'N/A'}
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
                      onClick={() => setDeliveryNoteJob(inv.job)} 
                      title="Delivery Note"
                      className="h-8 w-8 rounded-full hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      <Truck className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setInvoiceToDelete(inv.id)} 
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
        <Pagination 
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          className="mt-2 border-t pt-4"
        />
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
      <Dialog open={!!viewInvoice} onOpenChange={(open) => {
          if (!open) {
              setViewInvoice(null);
          }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-white border-0 shadow-2xl flex flex-col">
          <DialogHeader className="bg-slate-900 px-8 py-6 text-white shrink-0">
             <div className="flex justify-between items-start w-full">
                <div className="space-y-1">
                   <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">Ozmae Freight</DialogTitle>
                   <DialogDescription className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">Standard Tax Invoice</DialogDescription>
                </div>
                <div className="text-right">
                   <div className="bg-accent/10 px-3 py-1 rounded border border-accent/20 mb-2">
                      <p className="text-accent font-black text-lg leading-none">{viewInvoice?.invoice_number}</p>
                   </div>
                   <p className="text-[10px] uppercase font-bold text-slate-400">Issued On: {viewInvoice && format(new Date(viewInvoice.created_at), "MMM dd, yyyy")}</p>
                </div>
             </div>
          </DialogHeader>

          {viewInvoice && (
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {/* Info Bar */}
              <div className="grid grid-cols-2 gap-16">
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2">Sender Information</h4>
                    <div className="space-y-1">
                       <p className="text-sm font-black text-slate-900">Ozmae Freight Solutions Ltd</p>
                       <p className="text-xs text-slate-500">Plot 14, Nyerere Road, Dar es Salaam</p>
                       <p className="text-xs text-slate-500">Tanzania, East Africa</p>
                       <p className="text-xs font-bold text-slate-700 pt-1">TIN: 123-456-789</p>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2 flex justify-between items-center">
                       <span>Attention To</span>
                       <span className="text-[8px] text-accent/70 normal-case tracking-normal">Editable for PDF</span>
                    </h4>
                    <div className="space-y-2">
                       <Input 
                         placeholder={viewInvoice.job?.customer?.company_name || "Customer Name"} 
                         value={customerOverride.name} 
                         onChange={(e) => setCustomerOverride(p => ({...p, name: e.target.value}))}
                         className="h-7 text-xs bg-slate-50 border-slate-200 shadow-none font-bold"
                       />
                       <Input 
                         placeholder="Address (e.g. Registered Logistics Partner)" 
                         value={customerOverride.address} 
                         onChange={(e) => setCustomerOverride(p => ({...p, address: e.target.value}))}
                         className="h-7 text-xs bg-slate-50 border-slate-200 shadow-none"
                       />
                       <Input 
                         placeholder={`Route: ${viewInvoice.job?.origin || 'N/A'} to ${viewInvoice.job?.destination || 'N/A'}`} 
                         value={customerOverride.phone} 
                         onChange={(e) => setCustomerOverride(p => ({...p, phone: e.target.value}))}
                         className="h-7 text-xs bg-slate-50 border-slate-200 shadow-none"
                       />
                       <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] font-black bg-accent/5 text-accent px-2 py-0.5 rounded border border-accent/10">DUE DATE: {viewInvoice.deposit_due_date && format(new Date(viewInvoice.deposit_due_date), "MMM dd, yyyy")}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Service Details Table */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Statement of Services</h4>
                 <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                       <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                             <th className="text-left px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-slate-500">Description</th>
                             <th className="text-right px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-slate-500 w-32">Amount (USD)</th>
                          </tr>
                       </thead>
                       <tbody>
                          <tr className="bg-white group">
                             <td className="px-6 py-6 font-medium text-slate-900">
                                <div>
                                   <p className="font-bold">Operational Transport & Freight Logistics</p>
                                   <p className="text-[10px] text-slate-400 italic mt-0.5">Origin: {viewInvoice.job?.origin} → Destination: {viewInvoice.job?.destination}</p>
                                </div>
                             </td>
                             <td className="px-6 py-6 text-right font-black text-slate-900 group-hover:text-accent transition-colors">
                                {formatCurrency(viewInvoice.total_amount_usd)}
                             </td>
                          </tr>
                       </tbody>
                       <tfoot className="bg-slate-50/50">
                          <tr className="border-t border-slate-200">
                             <td className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400">Subtotal</td>
                             <td className="px-6 py-4 text-right font-bold text-slate-700">{formatCurrency(viewInvoice.subtotal_usd || viewInvoice.total_amount_usd)}</td>
                          </tr>
                          <tr>
                             <td className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400">Tax / VAT (0%)</td>
                             <td className="px-6 py-4 text-right font-bold text-slate-700">$0.00</td>
                          </tr>
                          <tr className="bg-slate-900 text-white">
                             <td className="px-6 py-6 text-right text-[11px] font-black uppercase tracking-widest">Grand Total Balance</td>
                             <td className="px-6 py-6 text-right font-black text-xl">{formatCurrency(viewInvoice.total_amount_usd)}</td>
                          </tr>
                       </tfoot>
                    </table>
                 </div>
              </div>

              {/* Installment Breakdown */}
              <div className="grid grid-cols-2 gap-8">
                 <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                       <DollarSign className="h-12 w-12" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-tighter text-indigo-400 mb-1">60% Required Deposit</p>
                    <div className="flex items-end justify-between">
                       <p className="text-2xl font-black text-slate-900">{formatCurrency(viewInvoice.deposit_amount_usd)}</p>
                       <StatusBadge status={viewInvoice.deposit_status} />
                    </div>
                 </div>
                 <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Clock className="h-12 w-12" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-tighter text-emerald-400 mb-1">40% Final Balance</p>
                    <div className="flex items-end justify-between">
                       <p className="text-2xl font-black text-slate-900">{formatCurrency(viewInvoice.balance_amount_usd)}</p>
                       <StatusBadge status={viewInvoice.balance_status} />
                    </div>
                 </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 shrink-0">
                 <PDFDownloadLink 
                    document={<InvoicePDF invoice={viewInvoice} customerOverride={customerOverride.name || customerOverride.address || customerOverride.phone ? customerOverride : undefined} />} 
                    fileName={`${viewInvoice.invoice_number}.pdf`}
                    className="flex-1"
                 >
                    {({ loading }) => (
                       <Button className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-slate-200" disabled={loading}>
                          <Download className="h-4 w-4" /> {loading ? "Generating..." : "Download Original PDF"}
                       </Button>
                    )}
                 </PDFDownloadLink>
                 
                 <Button 
                    className="flex-1 h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-accent/20"
                    onClick={() => updateStatusMutation.mutate({ id: viewInvoice.id, status: 'paid' })}
                    disabled={updateStatusMutation.isPending || (viewInvoice.deposit_status === 'paid' && viewInvoice.balance_status === 'paid')}
                 >
                    {updateStatusMutation.isPending ? <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" /> : <CheckCircle2 className="h-4 w-4" />}
                    {viewInvoice.deposit_status === 'paid' && viewInvoice.balance_status === 'paid' ? "Invoice Settled" : "Mark as Fully Paid"}
                 </Button>
              </div>

              {/* Terms Footer */}
              <div className="pt-6 text-center border-t border-slate-100">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ozmae Freight Solutions • Professional Logistics Infrastructure</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Delivery Note Dialog */}
      <Dialog open={!!deliveryNoteJob} onOpenChange={(open) => !open && setDeliveryNoteJob(null)}>
        <DialogContent className="sm:max-w-6xl w-[90vw] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Live Delivery Note Preview</DialogTitle>
            <DialogDescription>Modify fields on the left and see the changes instantly on the right.</DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Editor Sidebar */}
            <div className="w-1/3 border-r overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Delivered By</Label>
                  <Input value={deliveryOverrides.deliveredBy} onChange={e => setDeliveryOverrides(p => ({...p, deliveredBy: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Despatch Date</Label>
                  <Input value={deliveryOverrides.despatchDate} placeholder="e.g. September 13 2025" onChange={e => setDeliveryOverrides(p => ({...p, despatchDate: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Shipping Address</Label>
                  <Input value={deliveryOverrides.shippingAddress} placeholder="Destination Address" onChange={e => setDeliveryOverrides(p => ({...p, shippingAddress: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Invoice Address</Label>
                  <Input value={deliveryOverrides.invoiceAddress} placeholder="P.O BOX, Attn..." onChange={e => setDeliveryOverrides(p => ({...p, invoiceAddress: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Delivery Method</Label>
                  <Input value={deliveryOverrides.deliveryMethod} onChange={e => setDeliveryOverrides(p => ({...p, deliveryMethod: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Item Description</Label>
                  <Input value={deliveryOverrides.itemDescription} placeholder="Cargo Transport..." onChange={e => setDeliveryOverrides(p => ({...p, itemDescription: e.target.value}))} className="h-9 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ordered</Label>
                  <Input value={deliveryOverrides.orderedQty} onChange={e => setDeliveryOverrides(p => ({...p, orderedQty: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Delivered</Label>
                  <Input value={deliveryOverrides.deliveredQty} onChange={e => setDeliveryOverrides(p => ({...p, deliveredQty: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Outstanding</Label>
                  <Input value={deliveryOverrides.outstandingQty} onChange={e => setDeliveryOverrides(p => ({...p, outstandingQty: e.target.value}))} className="h-9 text-xs" />
                </div>
              </div>

              {deliveryNoteJob && (
                <div className="pt-6 border-t mt-6">
                  <PDFDownloadLink 
                    document={<DeliveryNotePDF job={deliveryNoteJob} overrides={deliveryOverrides} />} 
                    fileName={`Delivery_Note_JOB-${deliveryNoteJob.id?.split('-')[0].toUpperCase()}.pdf`}
                    className="w-full block"
                  >
                    {({ loading }) => (
                       <Button className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-widest text-xs shadow-lg" disabled={loading}>
                          <Download className="h-4 w-4 mr-2" /> {loading ? "Preparing PDF..." : "Download Original PDF"}
                       </Button>
                    )}
                  </PDFDownloadLink>
                </div>
              )}
            </div>

            {/* Preview Section */}
            <div className="w-2/3 bg-slate-100 p-6 flex flex-col">
              {deliveryNoteJob ? (
                <div className="flex-1 rounded-xl overflow-hidden border shadow-sm bg-white">
                  <PDFViewer width="100%" height="100%" className="border-0">
                    <DeliveryNotePDF job={deliveryNoteJob} overrides={deliveryOverrides} />
                  </PDFViewer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Loading preview...
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal 
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={() => invoiceToDelete && deleteInvoiceMutation.mutate(invoiceToDelete)}
        isDeleting={deleteInvoiceMutation.isPending}
        title="Delete Invoice?"
        description="Are you absolutely sure you want to delete this invoice? This will permanently erase the invoice record. This action cannot be reversed."
      />
    </div>
  );
}
