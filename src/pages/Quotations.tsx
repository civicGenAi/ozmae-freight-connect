import { useState, useEffect } from "react";
import { Plus, Eye, Search, FileText, Download, Send, CheckCircle, XCircle, ArrowRight, Trash2, Mail } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { QuotationTemplateEditor, QuotationMetadata } from "@/components/QuotationTemplateEditor";
import { pdf } from "@react-pdf/renderer";
import { QuotationPDFDocument } from "@/components/QuotationPDFDocument";
import ozmaeLogoImg from "@/assets/ozmae-logo.png";
// @ts-ignore
import signatureImg from "@/assets/signature.png";

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
  const [isSharing, setIsSharing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: quotations, isLoading } = useQuery({
    queryKey: ["quotations", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("quotations")
        .select(`
          *,
          customer:customers(company_name, email, additional_emails),
          lead:leads(additional_emails),
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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      setIsNewModalOpen(false);
      setViewQuote(data);
      setIsPreviewOpen(true);
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

  // Automation: Handle creation from Lead
  useEffect(() => {
    const checkLeadAutomation = async () => {
      if (location.state?.leadId) {
        const leadId = location.state.leadId;
        const { data: lead, error } = await supabase
          .from("leads")
          .select("*")
          .eq("id", leadId)
          .single();
        
        if (error || !lead) return;

        const initialMetadata = {
          titleText: "FREIGHT QUOTATION",
          leftFields: [
            { label: "Date :", value: new Date().toISOString().split('T')[0] },
            { label: "Customer :", value: lead.customer_name_raw || "" },
            { label: "Contact Person :", value: lead.contact_person || "" },
            { label: "Commodity :", value: lead.commodity || "" },
            { label: "Destination :", value: lead.destination || "" },
            { label: "Currency :", value: "USD" },
            { label: "Validity :", value: lead.validity || "15 Days" },
            { label: "Chargeable weight :", value: lead.chargeable_weight ? `${lead.chargeable_weight} kg` : "" },
            { label: "CIF VALUE(USD) :", value: lead.cif_value_usd ? `$${lead.cif_value_usd}` : "" },
          ],
          tableHeaders: ["DESCRIPTION", "RATE", "REMARKS"],
          tableRows: [
            { desc: lead.cargo_description || "Freight Services", amount: lead.rate_usd?.toString() || "0", remarks: lead.remarks || "" }
          ],
          totalAmountText: lead.rate_usd?.toString() || "0",
          footerNotesLeft: "Please notify us upon acceptance.",
          footerNotesMiddle: "",
          footerNotesRight: "Thank you for choosing Ozmae Freight."
        };

        const newQuote = {
          lead_id: lead.id,
          customer_id: lead.customer_id,
          customer_name_raw: lead.customer_name_raw,
          customer_email: lead.email,
          customer_phone: lead.phone,
          origin: lead.origin,
          destination: lead.destination,
          cargo_description: lead.cargo_description,
          base_rate_usd: lead.rate_usd || 0,
          total_amount_usd: lead.rate_usd || 0,
          valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "draft",
          metadata: initialMetadata,
        };

        toast.info(`Automating quotation for ${lead.customer_name_raw}...`);
        createQuoteMutation.mutate(newQuote);
        navigate(location.pathname, { replace: true, state: {} });
      }
    };
    checkLeadAutomation();
  }, [location.state?.leadId]);

  const handleCreateQuote = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string) || 0;
    
    // Build metadata for the PDF
    const initialMetadata: QuotationMetadata = {
      titleText: "FREIGHT QUOTATION",
      leftFields: [
        { label: "Date :", value: new Date().toISOString().split('T')[0] },
        { label: "Customer :", value: customers?.find((c: any) => c.id === selectedCustomerId)?.company_name || "" },
        { label: "Contact Person :", value: formData.get("contact_person") as string || "" },
        { label: "Commodity :", value: formData.get("commodity") as string || "" },
        { label: "Destination :", value: formData.get("destination") as string || "" },
        { label: "Currency :", value: "USD" },
        { label: "Validity :", value: formData.get("validity") as string || "15 Days" },
        { label: "Chargeable weight :", value: formData.get("chargeable_weight") ? `${formData.get("chargeable_weight")} kg` : "" },
        { label: "CIF VALUE(USD) :", value: formData.get("cif_value_usd") ? `$${formData.get("cif_value_usd")}` : "" },
      ],
      tableHeaders: ["DESCRIPTION", "RATE", "REMARKS"],
      tableRows: [
        { desc: formData.get("cargo_description") as string || "Freight Services", amount: amount.toString(), remarks: formData.get("remarks") as string || "" }
      ],
      totalAmountText: amount.toString(),
      footerNotesLeft: "Please notify us upon acceptance.",
      footerNotesMiddle: "",
      footerNotesRight: "Thank you for choosing Ozmae Freight."
    };

    const data = {
      customer_id: selectedCustomerId || formData.get("customer_id"),
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      cargo_description: formData.get("cargo_description"),
      total_amount_usd: amount,
      valid_until: formData.get("valid_until"),
      status: "draft",
      metadata: initialMetadata,
    };
    createQuoteMutation.mutate(data);
  };

  const handleDownloadAndEmail = async (meta: QuotationMetadata, quote: any) => {
    setIsSharing(true);
    try {
      // 1. Generate and Download PDF
      const blob = await pdf(
        <QuotationPDFDocument 
          meta={meta} 
          logoUrl={ozmaeLogoImg} 
          signatureUrl={signatureImg} 
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const quoteRef = quote.id.split('-')[0].toUpperCase();
      link.download = `Quotation_${quoteRef}_Ozmae_Freight.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 2. Construct Professional Email
      const customerEmail = quote.customer?.email || quote.customer_email || "";
      const subject = encodeURIComponent(`Freight Quotation: ${quoteRef} | Ozmae Freight Solutions`);
      
      const body = encodeURIComponent(
        `Dear ${quote.customer?.company_name || quote.customer_name_raw || 'Valued Customer'},\n\n` +
        `Thank you for your inquiry and for considering Ozmae Freight Solutions for your logistics requirements.\n\n` +
        `We have prepared a professional quotation for your shipment, which you will find attached to this email. The document contains a complete breakdown of the rates, terms, and conditions for the requested route.\n\n` +
        `Please review the attached details and let us know if you have any questions or if you would like to proceed with the shipment. Our operations team is on standby to ensure a seamless execution for you.\n\n` +
        `We look forward to the opportunity to serve you.\n\n` +
        `Best regards,\n\n` +
        `Operations Team\n` +
        `Ozmae Freight Solutions\n` +
        `+255 787 240 780 | +255 754 757 670\n` +
        `www.ozmaelogistics.com`
      );

      // CC Extraction
      const ccList = [
        ...(quote.customer?.additional_emails || []),
        ...(quote.lead?.additional_emails || [])
      ].filter(Boolean);
      
      // Deduplicate
      const uniqueCcList = Array.from(new Set(ccList));
      const ccQuery = uniqueCcList.length > 0 ? `&cc=${uniqueCcList.join(',')}` : '';

      // 3. Open Mail Client
      window.location.href = `mailto:${customerEmail}?subject=${subject}&body=${body}${ccQuery}`;
      
      updateStatusMutation.mutate({ id: quote.id, status: 'sent' });
      toast.success("Quotation downloaded! Please attach it to the email that just opened.");
    } catch (err: any) {
      console.error("Failed to generate and email quotation:", err);
      toast.error("Failed to generate quotation for email.");
    } finally {
      setIsSharing(false);
    }
  };

  if (isPreviewOpen && viewQuote) {
    return (
      <QuotationTemplateEditor 
        initialData={viewQuote}
        isSaving={updateMetadataMutation.isPending}
        onSave={(meta, total) => updateMetadataMutation.mutateAsync({ id: viewQuote.id, metadata: meta, totalAmount: total })}
        onClose={() => {
          setIsPreviewOpen(false);
          setViewQuote(null);
        }}
        renderActions={(currentMeta) => (
           <div className="flex gap-2">
             <Button variant="outline" className="text-accent gap-2" disabled={isSharing} onClick={() => handleDownloadAndEmail(currentMeta, viewQuote)}>
               <Mail className="h-4 w-4" /> {isSharing ? "Preparing..." : "Download & Send Email"}
             </Button>
           </div>
        )}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Quotations & Rates">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export All
          </Button>
          <Button onClick={() => setIsNewModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
            <Plus className="h-4 w-4" /> New Quotation
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex bg-muted p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search quotations..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Commodity</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>CIF Value</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead className="min-w-[150px]">Cargo</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center">Loading...</TableCell></TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12">No quotations found.</TableCell></TableRow>
            ) : filtered?.map((quote: any) => (
              <TableRow key={quote.id}>
                <TableCell className="font-mono text-[10px] font-bold text-accent uppercase">{quote.id.split('-')[0]}</TableCell>
                <TableCell className="font-medium">{quote.customer?.company_name || "Unknown"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs">
                    {quote.origin} <ArrowRight className="h-3 w-3" /> {quote.destination}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">
                    {quote.metadata?.leftFields?.find((f: any) => f.label.includes("Commodity"))?.value || "N/A"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium">
                    {quote.metadata?.leftFields?.find((f: any) => f.label.toLowerCase().includes("weight"))?.value || "N/A"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium">
                    {quote.metadata?.leftFields?.find((f: any) => f.label.toLowerCase().includes("cif"))?.value || "N/A"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                    {quote.metadata?.leftFields?.find((f: any) => f.label.includes("Validity"))?.value || "15 Days"}
                  </span>
                </TableCell>
                 <TableCell className="max-w-[200px]">
                  <span className="text-xs text-muted-foreground truncate block">{quote.cargo_description}</span>
                  {quote.metadata?.tableRows?.[0]?.remarks && (
                    <span className="text-[9px] text-accent/70 block truncate italic">Note: {quote.metadata.tableRows[0].remarks}</span>
                  )}
                </TableCell>
                <TableCell className="font-bold">{formatCurrency(quote.total_amount_usd)}</TableCell>
                <TableCell className="text-xs">{format(new Date(quote.valid_until), "MMM d, yyyy")}</TableCell>
                <TableCell><StatusBadge status={quote.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="ghost" onClick={() => { setViewQuote(quote); setIsPreviewOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => deleteQuoteMutation.mutate(quote.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Quotation</DialogTitle>
            <DialogDescription>Create a new freight quotation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateQuote} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} required>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input id="contact_person" name="contact_person" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commodity">Commodity</Label>
                <Input id="commodity" name="commodity" placeholder="e.g. Electronics" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Origin</Label><Input name="origin" required /></div>
              <div className="space-y-2"><Label>Destination</Label><Input name="destination" required /></div>
            </div>
            <div className="space-y-2"><Label>Cargo Description</Label><Input name="cargo_description" required /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chargeable_weight">Weight (kg)</Label>
                <Input id="chargeable_weight" name="chargeable_weight" type="number" step="0.01" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cif_value_usd">CIF (USD)</Label>
                <Input id="cif_value_usd" name="cif_value_usd" type="number" step="0.01" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validity">Validity</Label>
                <Input id="validity" name="validity" placeholder="15 Days" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Total Amount (USD)</Label><Input name="amount" type="number" step="0.01" required /></div>
              <div className="space-y-2"><Label>Valid Until</Label><Input name="valid_until" type="date" required /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" name="remarks" placeholder="Notes for the PDF..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsNewModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createQuoteMutation.isPending} className="bg-accent">Generate Quote</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
