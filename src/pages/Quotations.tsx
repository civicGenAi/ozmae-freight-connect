import { useState, useEffect } from "react";
import { Plus, Eye, Search, ArrowRight, Trash2, Mail, Download, Pencil, Phone, Info, Printer } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LocationSelect } from "@/components/LocationSelect";
import { LogInteractionDrawer } from "@/components/LogInteractionDrawer";
import { DeclineReasonModal } from "@/components/DeclineReasonModal";
import { QuotationTemplateEditor } from "@/components/QuotationTemplateEditor";
import { CargoItemsTable } from "@/components/CargoItemsTable";
import { pdf } from "@react-pdf/renderer";
import { QuotationPDFDocument } from "@/components/QuotationPDFDocument";

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const tabs = ["All", "Draft", "Sent", "Accepted", "Declined", "Expired"];

const quoteSchema = z.object({
  customer_id: z.string().min(1, "Please select a customer"),
  contact_person: z.string().optional(),
  commodity: z.string().optional(),
  origin: z.string().min(2, "Origin is required"),
  destination: z.string().min(2, "Destination is required"),
  cargo_description: z.string().optional(),
  cargo_items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    unit: z.string().min(1, "Unit is required"),
    remarks: z.string().optional(),
  })).min(1, "At least one cargo item is required"),
  chargeable_weight: z.string().optional(),
  cif_value_usd: z.string().optional().transform(v => v ? parseFloat(v) : null),
  validity: z.string().optional(),
  amount: z.string().min(1, "Quote amount is required").transform(v => parseFloat(v)),
  valid_until: z.string().min(1, "Valid until date is required"),
  remarks: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

export default function Quotations() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewQuote, setViewQuote] = useState<any>(null);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [declineQuote, setDeclineQuote] = useState<any>(null);
  const [logInteractionQuoteId, setLogInteractionQuoteId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customer_id: "",
      contact_person: "",
      commodity: "",
      origin: "",
      destination: "",
      cargo_description: "",
      cargo_items: [{ description: "", unit: "1*40HC", remarks: "" }],
      validity: "15 Days",
      amount: "" as any,
      valid_until: "",
      remarks: "",
    }
  });

  const { data: leads } = useQuery({
    queryKey: ["leads-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Pre-fill from Lead state
  useEffect(() => {
    if (location.state?.leadId && leads) {
      const lead = leads.find((l: any) => l.id === location.state.leadId);
      if (lead) {
        form.reset({
          customer_id: lead.customer_id || "",
          contact_person: lead.contact_person || "",
          commodity: lead.commodity || "",
          origin: lead.origin || "",
          destination: lead.destination || "",
          chargeable_weight: lead.chargeable_weight || "",
          validity: lead.validity || "15 Days",
          cargo_items: lead.cargo_items?.length > 0 
            ? lead.cargo_items 
            : [{ description: lead.cargo_description || "", unit: "1*40HC", remarks: "" }],
          remarks: lead.remarks || "",
          amount: lead.rate_usd?.toString() || "" as any,
          valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        setIsNewModalOpen(true);
        // Clear state so it doesn't re-open on refresh
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, leads, form, navigate]);

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
    mutationFn: async (values: QuoteFormValues) => {
      const newQuote = {
        customer_id: values.customer_id,
        status: "draft",
        total_amount_usd: values.amount,
        valid_until: values.valid_until,
        origin: values.origin,
        destination: values.destination,
        cargo_description: values.cargo_description,
        metadata: {
          titleText: "FREIGHT QUOTATION",
          tableHeaders: ["DESCRIPTION", "UNIT/QTY", "UNIT RATE", "TOTAL AMOUNT", "REMARKS"],
          leftFields: [
            { label: "Customer", value: customers?.find(c => c.id === values.customer_id)?.company_name || "N/A" },
            { label: "Contact Person", value: values.contact_person || "N/A" },
            { label: "Commodity", value: values.commodity || "General Cargo" },
            { label: "Origin", value: values.origin },
            { label: "Destination", value: values.destination },
            { label: "Chargeable Weight", value: values.chargeable_weight || "N/A" },
            { label: "CIF Value (USD)", value: values.cif_value_usd ? `$${values.cif_value_usd.toLocaleString()}` : "N/A" },
            { label: "Price Validity", value: values.validity || "15 Days" },
          ],
          tableRows: values.cargo_items.map((item, idx) => ({
            desc: item.description,
            amount: item.unit,
            extraCols: idx === 0 ? [`$${values.amount.toLocaleString()}`, `$${values.amount.toLocaleString()}`] : ["-", "-"], // Only show total on first row or spread? I'll keep it simple
            remarks: item.remarks || (idx === 0 ? values.remarks : "")
          })),
          totalAmountText: `$${values.amount.toLocaleString()}`,
          footerNotesLeft: "1. Rates are subject to space and equipment availability.",
          footerNotesMiddle: "2. Payment is required before cargo release.",
          footerNotesRight: "Thank you for choosing Ozmae Logistics."
        },
      };
      
      const { data, error } = await supabase.from("quotations").insert([newQuote]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      setIsNewModalOpen(false);
      form.reset();
      setViewQuote(data);
      setIsPreviewOpen(true);
      toast.success("Quotation created successfully");
    },
    onError: (err: any) => toast.error(err.message),
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

  const updateQuoteMutation = useMutation({
    mutationFn: async ({ id, metadata, totalAmount }: { id: string, metadata: any, totalAmount: number }) => {
      const { error } = await supabase
        .from("quotations")
        .update({ metadata, total_amount_usd: totalAmount })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Quotation updated successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = quotations?.filter((q: any) =>
    q.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadPDF = async (quote: any) => {
    try {
      const blob = await pdf(<QuotationPDFDocument metadata={quote.metadata} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Ozmae_Quotation_${quote.id.split('-')[0].toUpperCase()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Downloading PDF...");
    } catch (err) {
      toast.error("Failed to generate PDF download");
    }
  };

  const onSubmit = (values: QuoteFormValues) => {
    createQuoteMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Quotations & Proformas">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 border-accent text-accent hover:bg-accent/5 h-11 px-6 shadow-sm"
            onClick={() => {
              if (quotations && quotations.length > 0) {
                setViewQuote(quotations[0]);
                setIsPreviewOpen(true);
              } else {
                toast.info("No quotations created yet");
              }
            }}
          >
            <Eye className="h-4 w-4" /> Printable Preview
          </Button>
          <Button onClick={() => setIsNewModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 h-11 px-6 shadow-lg shadow-accent/20">
            <Plus className="h-5 w-5" /> New Quotation
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
              <TableHead className="w-[100px]">Quote #</TableHead>
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
              <TableRow><TableCell colSpan={12} className="text-center">Loading...</TableCell></TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center py-12">No quotations found.</TableCell></TableRow>
            ) : filtered?.map((quote: any) => (
              <TableRow key={quote.id} className="cursor-pointer hover:bg-muted/30 transition-colors group" onClick={() => { setViewQuote(quote); setIsPreviewOpen(true); }}>
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
                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
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

      <Sheet open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="h-6 w-6 text-accent" />
              New Manual Quotation
            </SheetTitle>
            <SheetDescription>Generate a quick freight quote or proforma without an existing lead.</SheetDescription>
          </SheetHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="commodity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commodity</FormLabel>
                      <FormControl><Input placeholder="e.g. Electronics" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin</FormLabel>
                      <FormControl><LocationSelect {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl><LocationSelect {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Cargo Specification</Label>
                <CargoItemsTable control={form.control} name="cargo_items" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="chargeable_weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (e.g. 500kg)</FormLabel>
                      <FormControl><Input type="text" placeholder="e.g. 1.2 Tons" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cif_value_usd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CIF (USD)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validity</FormLabel>
                      <FormControl><Input placeholder="15 Days" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote Amount (USD)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} className="font-bold text-accent" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valid_until"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Until Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Remarks</FormLabel>
                    <FormControl><Input placeholder="Any notes for the customer..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="pt-8 pb-12">
                <Button type="button" variant="outline" onClick={() => setIsNewModalOpen(false)} className="h-12 px-8">Cancel</Button>
                <Button 
                  type="submit" 
                  disabled={createQuoteMutation.isPending} 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-10 font-bold shadow-lg shadow-accent/20"
                >
                  {createQuoteMutation.isPending ? "Generating..." : "Generate Quote"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Quotation Overview</SheetTitle>
            <SheetDescription>Detailed information for Quote #{selectedQuote?.id.split('-')[0].toUpperCase()}</SheetDescription>
          </SheetHeader>
          
          {selectedQuote && (
            <div className="mt-8 space-y-6 pb-20">
              <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Customer Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-bold leading-tight">{selectedQuote.customer?.company_name}</p>
                    {selectedQuote.metadata?.leftFields?.[1]?.value && (
                      <p className="text-xs font-semibold text-accent">{selectedQuote.metadata.leftFields[1].value}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {selectedQuote.customer?.email}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">Shipment Route</h4>
                <div className="flex justify-between items-center bg-card rounded p-3 border shadow-sm">
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Origin</p>
                    <p className="font-bold text-sm">{selectedQuote.origin}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-accent mx-4" />
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Destination</p>
                    <p className="font-bold text-sm">{selectedQuote.destination}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">Cargo Details</h4>
                <div className="rounded-md border bg-muted/10 overflow-hidden">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead className="bg-muted/50 font-bold uppercase text-muted-foreground border-b">
                      <tr>
                        <th className="px-2 py-1.5 w-16">Unit</th>
                        <th className="px-2 py-1.5">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedQuote.metadata?.tableRows?.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5 font-bold text-accent">{item.amount}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{item.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">Financial Summary</h4>
                <div className="p-3 bg-accent/5 rounded border border-accent/20 flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase text-accent tracking-wider">Total Amount</span>
                  <span className="text-xl font-black text-accent">{formatCurrency(selectedQuote.total_amount_usd)}</span>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-3 pb-8">
                <Button 
                  variant="outline" 
                  className="h-12 border-accent text-accent hover:bg-accent/5 font-bold gap-2"
                  onClick={() => {
                    setViewQuote(selectedQuote);
                    setIsPreviewOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit PDF Layout
                </Button>
                <Button 
                   className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 font-bold shadow-lg gap-2"
                   onClick={() => setLogInteractionQuoteId(selectedQuote.id)}
                >
                  <Mail className="h-4 w-4" /> Send via Email
                </Button>
                <Button 
                  variant="ghost" 
                  className="h-11 border text-muted-foreground font-bold gap-2"
                  onClick={() => handleDownloadPDF(selectedQuote)}
                >
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
                <Button 
                  variant="ghost" 
                  className="h-11 border text-red-500 hover:text-red-600 hover:bg-red-50 font-bold gap-2"
                  onClick={() => setDeclineQuote(selectedQuote)}
                >
                  <Trash2 className="h-4 w-4" /> Decline & Close
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <LogInteractionDrawer 
        open={!!logInteractionQuoteId}
        onOpenChange={(open) => !open && setLogInteractionQuoteId(null)}
        quotationId={logInteractionQuoteId || undefined}
        customerId={selectedQuote?.customer_id}
      />

      {isPreviewOpen && viewQuote && (
        <QuotationTemplateEditor
          initialData={viewQuote}
          isSaving={updateQuoteMutation.isPending}
          onSave={async (meta, total) => {
            await updateQuoteMutation.mutateAsync({ id: viewQuote.id, metadata: meta, totalAmount: total });
          }}
          onEmail={() => {
            setLogInteractionQuoteId(viewQuote.id);
          }}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

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
            setDeclineQuote(null);
          }}
        />
      )}
    </div>
  );
}
