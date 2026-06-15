import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Search, Send, Bell, Mail, MessageSquare, Smartphone, AlertTriangle, CheckCircle2, Wallet } from "lucide-react";

const formatCurrency = (amount: number) =>
  `$${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Bucket = "current" | "0-30" | "30-60" | "60-90" | "90+";

const BUCKET_META: Record<Bucket, { label: string; className: string; activeClassName: string }> = {
  current: { label: "Current", className: "bg-emerald-50 text-emerald-700 border-emerald-100", activeClassName: "bg-emerald-600 text-white border-emerald-600" },
  "0-30": { label: "0–30 Days", className: "bg-amber-50 text-amber-700 border-amber-100", activeClassName: "bg-amber-500 text-white border-amber-500" },
  "30-60": { label: "30–60 Days", className: "bg-orange-50 text-orange-700 border-orange-100", activeClassName: "bg-orange-500 text-white border-orange-500" },
  "60-90": { label: "60–90 Days", className: "bg-rose-50 text-rose-600 border-rose-100", activeClassName: "bg-rose-500 text-white border-rose-500" },
  "90+": { label: "90+ Days", className: "bg-red-100 text-red-700 border-red-200", activeClassName: "bg-red-600 text-white border-red-600" },
};

const BUCKET_ORDER: Bucket[] = ["current", "0-30", "30-60", "60-90", "90+"];

export default function ReceivablesAging() {
  const queryClient = useQueryClient();
  const [bucketFilter, setBucketFilter] = useState<Bucket | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["receivables_aging"],
    queryFn: async () => {
      // Flip any pending deposit/balance whose due date has passed to 'overdue'.
      await supabase.rpc("flag_overdue_invoices");

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, job_order_id, customer_id,
          total_amount_usd, deposit_amount_usd, balance_amount_usd,
          deposit_status, balance_status, deposit_due_date, balance_due_date,
          created_at,
          customer:customers(company_name),
          job:job_orders(job_number)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reminders } = useQuery({
    queryKey: ["payment_reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_reminders")
        .select("invoice_id, reminder_type, channel, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const lines = useMemo(() => {
    const today = new Date();
    const result: any[] = [];
    (invoices || []).forEach((inv: any) => {
      (["deposit", "balance"] as const).forEach((type) => {
        const status = inv[`${type}_status`];
        const amount = Number(inv[`${type}_amount_usd`] || 0);
        const dueDate = inv[`${type}_due_date`];
        if (status === "paid" || amount <= 0) return;

        const daysOverdue = dueDate ? differenceInDays(today, new Date(dueDate)) : null;
        let bucket: Bucket = "current";
        if (daysOverdue !== null && daysOverdue > 0) {
          if (daysOverdue <= 30) bucket = "0-30";
          else if (daysOverdue <= 60) bucket = "30-60";
          else if (daysOverdue <= 90) bucket = "60-90";
          else bucket = "90+";
        }
        result.push({ id: `${inv.id}-${type}`, invoice: inv, type, amount, dueDate, status, daysOverdue, bucket });
      });
    });
    return result.sort((a, b) => (b.daysOverdue || -999) - (a.daysOverdue || -999));
  }, [invoices]);

  const filteredLines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return lines.filter((l) => {
      if (bucketFilter !== "all" && l.bucket !== bucketFilter) return false;
      if (!q) return true;
      return (
        (l.invoice.customer?.company_name || "").toLowerCase().includes(q) ||
        (l.invoice.invoice_number || "").toLowerCase().includes(q) ||
        (l.invoice.job?.job_number || "").toLowerCase().includes(q)
      );
    });
  }, [lines, bucketFilter, searchQuery]);

  const summary = useMemo(() => {
    const sums: Record<Bucket, { total: number; count: number }> = {
      current: { total: 0, count: 0 },
      "0-30": { total: 0, count: 0 },
      "30-60": { total: 0, count: 0 },
      "60-90": { total: 0, count: 0 },
      "90+": { total: 0, count: 0 },
    };
    lines.forEach((l) => {
      sums[l.bucket as Bucket].total += l.amount;
      sums[l.bucket as Bucket].count += 1;
    });
    return sums;
  }, [lines]);

  const totalOutstanding = lines.reduce((acc, l) => acc + l.amount, 0);
  const totalOverdue = lines.filter((l) => l.bucket !== "current").reduce((acc, l) => acc + l.amount, 0);

  const lastReminderFor = (invoiceId: string, type: string) =>
    reminders?.find((r: any) => r.invoice_id === invoiceId && r.reminder_type === type);

  const reminderMutation = useMutation({
    mutationFn: async ({ line, channel }: { line: any; channel: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("payment_reminders").insert([{
        invoice_id: line.invoice.id,
        customer_id: line.invoice.customer_id,
        reminder_type: line.type,
        channel,
        message: `${line.type === "deposit" ? "Deposit" : "Balance"} payment reminder for invoice ${line.invoice.invoice_number} (${formatCurrency(line.amount)})`,
        sent_by: user?.id,
      }]);
      if (error) throw error;
      return channel;
    },
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ["payment_reminders"] });
      if (channel === "in_app") {
        toast.success("Reminder logged for follow-up");
      } else {
        toast.info(`${channel.toUpperCase()} reminder queued — integration coming soon (placeholder only)`);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Receivables Aging">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-dashed">
          <AlertTriangle className="h-3 w-3 text-accent" /> Auto-flags overdue deposits &amp; balances
        </div>
      </PageHeader>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Outstanding</p>
            <p className="text-xl font-black text-foreground">{formatCurrency(totalOutstanding)}</p>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Overdue (Past Due Date)</p>
            <p className="text-xl font-black text-foreground">{formatCurrency(totalOverdue)}</p>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current (Not Yet Due)</p>
            <p className="text-xl font-black text-foreground">{formatCurrency(summary.current.total)}</p>
          </div>
        </div>
      </div>

      {/* Aging Buckets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {BUCKET_ORDER.map((b) => {
          const active = bucketFilter === b;
          const meta = BUCKET_META[b];
          return (
            <button
              key={b}
              onClick={() => setBucketFilter(active ? "all" : b)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all hover:shadow-md",
                active ? meta.activeClassName : cn(meta.className, "bg-card")
              )}
            >
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">{meta.label}</p>
              <p className="text-lg font-black">{formatCurrency(summary[b].total)}</p>
              <p className="text-[10px] font-bold opacity-60">{summary[b].count} item{summary[b].count === 1 ? "" : "s"}</p>
            </button>
          );
        })}
      </div>

      {/* Search + filter status */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, invoice or job number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        {bucketFilter !== "all" && (
          <Button variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest" onClick={() => setBucketFilter("all")}>
            Showing: {BUCKET_META[bucketFilter].label} — Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Invoice / Job</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Aging</TableHead>
              <TableHead>Last Reminder</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}><div className="h-6 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-bold">
                    {lines.length === 0 ? "No outstanding receivables — everything is paid up." : "No receivables match this filter."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map((line) => {
                const reminder = lastReminderFor(line.invoice.id, line.type);
                const meta = BUCKET_META[line.bucket as Bucket];
                return (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.invoice.customer?.company_name || "—"}</TableCell>
                    <TableCell>
                      <p className="font-mono text-xs font-bold">{line.invoice.invoice_number}</p>
                      <p className="text-[10px] text-muted-foreground">{line.invoice.job?.job_number || "—"}</p>
                    </TableCell>
                    <TableCell className="capitalize text-xs font-bold">{line.type}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(line.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {line.dueDate ? format(new Date(line.dueDate), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest border", meta.className)}>
                        {line.daysOverdue !== null && line.daysOverdue > 0 ? `${line.daysOverdue}d overdue` : meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {reminder ? format(new Date(reminder.created_at), "MMM d, HH:mm") : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest gap-1.5">
                            <Send className="h-3 w-3" /> Send Reminder
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reminder Channel</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => reminderMutation.mutate({ line, channel: "in_app" })} className="gap-2 text-xs">
                            <Bell className="h-3.5 w-3.5 text-accent" /> In-App (log for follow-up)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => reminderMutation.mutate({ line, channel: "email" })} className="gap-2 text-xs">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
                            <span className="ml-auto text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase">Soon</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => reminderMutation.mutate({ line, channel: "sms" })} className="gap-2 text-xs">
                            <Smartphone className="h-3.5 w-3.5 text-muted-foreground" /> SMS
                            <span className="ml-auto text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase">Soon</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => reminderMutation.mutate({ line, channel: "whatsapp" })} className="gap-2 text-xs">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /> WhatsApp
                            <span className="ml-auto text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase">Soon</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
