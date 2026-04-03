import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Clock, AlertCircle, Search, CreditCard, User, Hash, Calendar, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Payments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          customer:customers(company_name),
          recorded_by:profiles(full_name)
        `)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices_lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, customer_id, total_amount_usd");
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["payment_stats"],
    queryFn: async () => {
      const { data: invoices, error } = await supabase.from("invoices").select("total_amount_usd, deposit_amount_usd, balance_amount_usd, deposit_status, balance_status");
      if (error) throw error;
      
      const totalCollected = payments?.reduce((acc: number, p: any) => acc + (p.status === 'completed' ? p.amount_usd : 0), 0) || 0;
      const outstandingDeposits = invoices?.filter((i: any) => i.deposit_status !== 'paid').reduce((acc: number, i: any) => acc + i.deposit_amount_usd, 0) || 0;
      const outstandingBalances = invoices?.filter((i: any) => i.balance_status !== 'paid').reduce((acc: number, i: any) => acc + i.balance_amount_usd, 0) || 0;

      return { totalCollected, outstandingDeposits, outstandingBalances };
    },
    enabled: !!payments,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (newPayment: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("payments").insert([{
        ...newPayment,
        recorded_by: user?.id,
        status: 'completed'
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setIsNewModalOpen(false);
      toast.success("Transaction recorded");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Transaction removed from ledger");
    },
  });

  const filtered = payments?.filter((p: any) => 
    p.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.invoice_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const summaryCards = [
    { label: "Total Collected (Historical)", value: formatCurrency(stats?.totalCollected || 0), icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Outstanding Deposits", value: formatCurrency(stats?.outstandingDeposits || 0), icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Outstanding Balances", value: formatCurrency(stats?.outstandingBalances || 0), icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-50" },
  ];

  const handleCreatePayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const invoiceId = formData.get("invoice_id") as string;
    const invoice = invoices?.find(i => i.id === invoiceId);
    
    createPaymentMutation.mutate({
      invoice_id: invoiceId,
      customer_id: invoice?.customer_id,
      amount_usd: parseFloat(formData.get("amount") as string),
      payment_method: formData.get("method"),
      payment_type: formData.get("type"),
      payment_date: formData.get("date"),
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Transaction Ledger">
        <Button onClick={() => setIsNewModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> Record Transaction
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryCards.map((card) => (
          <div key={card.label} className={cn("border-2 border-transparent hover:border-muted transition-all bg-card rounded-2xl p-6 flex items-start gap-4 shadow-sm")}>
            <div className={cn("p-3 rounded-xl shadow-inner", card.bg, card.color)}>
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-black text-foreground mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Filter by customer or invoice..." 
          className="pl-9 h-11 rounded-xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Reference</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Invoice</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Customer</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Type</TableHead>
              <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Amount</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-center">Method</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Date</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground font-medium">No transactions matching your search.</TableCell>
              </TableRow>
            ) : filtered?.map((p: any) => (
              <TableRow key={p.id} className="hover:bg-muted/30 transition-colors group">
                <TableCell className="font-mono text-[10px] font-bold text-muted-foreground group-hover:text-foreground">
                  PAY-{p.id.split('-')[0].toUpperCase()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 font-bold text-accent text-xs">
                     <Hash className="h-3 w-3" /> {p.invoice_id?.split('-')[0].toUpperCase()}
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-foreground">{p.customer?.company_name || 'N/A'}</TableCell>
                <TableCell>
                   <span className="text-[10px] font-black uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      {p.payment_type}
                   </span>
                </TableCell>
                <TableCell className="text-right font-black text-foreground">{formatCurrency(p.amount_usd)}</TableCell>
                <TableCell className="text-center">
                   <div className="flex flex-col items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-tighter">{p.payment_method}</span>
                   </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-medium">
                   {format(new Date(p.payment_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell>
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-rose-500 hover:text-white transition-all rounded-full"
                    onClick={() => {
                      if (confirm("Delete this transaction?")) deletePaymentMutation.mutate(p.id);
                    }}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md">
           <DialogHeader>
              <DialogTitle>Record Transaction</DialogTitle>
              <DialogDescription>Manually record a payment against an invoice.</DialogDescription>
           </DialogHeader>
           <form onSubmit={handleCreatePayment} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Invoice Reference</Label>
                <Select name="invoice_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices?.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>INV-{inv.id.split('-')[0].toUpperCase()} ({formatCurrency(inv.total_amount_usd)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select name="type" required defaultValue="deposit">
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="balance">Balance</SelectItem>
                      <SelectItem value="full">Full Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select name="method" required defaultValue="bank_transfer">
                    <SelectTrigger>
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <DialogFooter className="pt-4">
                 <Button type="submit" disabled={createPaymentMutation.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    {createPaymentMutation.isPending ? "Recording..." : "Finalize Transaction"}
                 </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
