import { useState } from "react";
import { Plus, Eye, Search, FileText, Download, Send, CheckCircle, XCircle, ArrowRight, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeclineReasonModal } from "@/components/DeclineReasonModal";
import { QuotationTemplateEditor } from "@/components/QuotationTemplateEditor";

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const tabs = ["All", "Draft", "Sent", "Accepted", "Declined", "Expired"];

export default function Quotations() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewQuote, setViewQuote] = useState<any>(null);
  const [declineQuote, setDeclineQuote] = useState<any>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: quotations, isLoading } = useQuery({
    queryKey: ["quotations", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("quotations")
        .select(`
          *,
          customer:customers(company_name, email),
          items:quotation_items(*)
        `)
        .order("created_at", { ascending: false });

      if (activeTab !== "All") {
        query = query.eq("status", activeTab.toLowerCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, company_name")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (newQuote: any) => {
      const { data, error } = await supabase.from("quotations").insert([newQuote]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      setIsNewModalOpen(false);
      toast.success("Quotation created successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("quotations")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Quotation status updated");
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Quotation deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMetadataMutation = useMutation({
    mutationFn: async ({ id, metadata, totalAmount }: any) => {
      const { error } = await supabase
        .from("quotations")
        .update({ metadata, total_amount_usd: totalAmount })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Quotation template saved successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = quotations?.filter((q: any) => 
    q.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateQuote = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      customer_id: formData.get("customer_id"),
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      cargo_description: formData.get("cargo_description"),
      total_amount_usd: parseFloat(formData.get("amount") as string),
      valid_until: formData.get("valid_until"),
      status: "draft",
    };
    createQuoteMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Quotations">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsPreviewOpen(true)} className="gap-2 bg-card text-foreground border-input shadow-sm">
            <Eye className="h-4 w-4 text-muted-foreground" /> Preview Template
          </Button>
          <Button onClick={() => setIsNewModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Create Quotation
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex bg-muted p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === tab 
                  ? "bg-card text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search quotes..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No quotations found.
                </TableCell>
              </TableRow>
            ) : filtered?.map((q: any) => (
              <TableRow key={q.id} className="group">
                <TableCell className="font-mono text-[10px] font-bold text-accent uppercase">{q.id.split('-')[0]}</TableCell>
                <TableCell className="font-medium text-foreground">{q.customer?.company_name || 'N/A'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span>{q.origin}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span>{q.destination}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">{q.cargo_description}</TableCell>
                <TableCell className="text-right font-bold text-foreground">{formatCurrency(q.total_amount_usd || 0)}</TableCell>
                <TableCell className="text-xs">{q.valid_until ? format(new Date(q.valid_until), "MMM d, yyyy") : "-"}</TableCell>
                <TableCell><StatusBadge status={q.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      className="h-8 hover:bg-accent hover:text-accent-foreground bg-transparent text-foreground gap-1.5 text-[10px] font-bold uppercase tracking-wider" 
                      onClick={() => setViewQuote(q)}
                    >
                      <Eye className="h-3.5 w-3.5" /> View / PDF
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        if (confirm("Delete this quotation?")) {
                          deleteQuoteMutation.mutate(q.id);
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

      {/* Full Screen Quotation Editor */}
      {viewQuote && (
        <div className="fixed inset-0 z-50 bg-white">
          <QuotationTemplateEditor
            initialData={viewQuote}
            isSaving={updateMetadataMutation.isPending}
            onClose={() => setViewQuote(null)}
            onSave={async (metadata, total) => {
              await updateMetadataMutation.mutateAsync({ 
                id: viewQuote.id, 
                metadata, 
                totalValue: total 
              });
            }}
            renderActions={() => (
              <>
                {viewQuote.status === 'draft' && (
                  <Button 
                    variant="outline"
                    className="h-10 text-primary gap-2"
                    onClick={() => updateStatusMutation.mutate({ id: viewQuote.id, status: 'sent' })}
                  >
                    <Send className="h-4 w-4" /> Mark as Sent
                  </Button>
                )}
                {viewQuote.status === 'sent' && (
                   <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="h-10 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setDeclineQuote(viewQuote)}
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Decline
                    </Button>
                    <Button 
                      className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      onClick={() => updateStatusMutation.mutate({ id: viewQuote.id, status: 'accepted' })}
                    >
                      <CheckCircle className="h-4 w-4" /> Accept
                    </Button>
                   </div>
                )}
              </>
            )}
          />
        </div>
      )}

      {/* New Quotation Dialog */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Quotation</DialogTitle>
            <DialogDescription>Create a new freight quotation for a customer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateQuote} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select name="customer_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origin</Label>
                <Input name="origin" placeholder="Dubai, UAE" required />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input name="destination" placeholder="Arusha, TZ" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cargo Description</Label>
              <Input name="cargo_description" placeholder="Electronics, 500kg" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Amount (USD)</Label>
                <Input name="amount" type="number" step="0.01" placeholder="2500.00" required />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input name="valid_until" type="date" required />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsNewModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createQuoteMutation.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground px-8">
                {createQuoteMutation.isPending ? "Creating..." : "Generate Quote"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Decline Flow Interception */}
      {declineQuote && (
        <DeclineReasonModal
          open={!!declineQuote}
          onOpenChange={(open) => !open && setDeclineQuote(null)}
          entityType="quotation"
          entityId={declineQuote.id}
          customerId={declineQuote.customer_id}
          routeOrigin={declineQuote.origin}
          routeDestination={declineQuote.destination}
          dealValue={declineQuote.total_amount_usd}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["quotations"] });
            setViewQuote({ ...declineQuote, status: 'declined' });
            setDeclineQuote(null);
          }}
        />
      )}

      {/* Template Preview */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-white">
          <QuotationTemplateEditor
            onClose={() => setIsPreviewOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
