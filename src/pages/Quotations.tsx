import React, { useState, useEffect, useMemo } from "react";
import { Plus, Eye, Search, ArrowRight, Trash2, Mail, Download, Pencil, Phone, Info, Printer, Clock, CheckCircle2, MessageSquare, CornerUpLeft, CheckCircle, Send, Copy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { useFormDraft } from "@/hooks/useFormDraft";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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
import ozmaeLogoImg from "@/assets/ozmae-logo.png";
// @ts-ignore
import signatureImg from "@/assets/signature.png";
import memberImg from "@/assets/member.jpg";
import { CreatableCombobox } from "@/components/CreatableCombobox";
import { parseUnitQuantity, cleanAmount, getQuoteTotal } from "@/lib/quotationUtils";
import { useWatch } from "react-hook-form";
import { TransportModeSelector, TransportModeBadge, TransportModeGroupHeader, type TransportMode } from "@/components/TransportModeSelector";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const tabs = ["All", "Draft", "Awaiting Review", "Under Revision", "Approved", "Sent", "Accepted", "Declined", "Expired"];

const validityOptions = Array.from({ length: 94 }, (_, i) => `${i + 7} Days`);

const quoteSchema = z.object({
  lead_id: z.string().optional(),
  customer_id: z.string().min(1, "Please select a customer"),
  contact_person: z.string().optional(),
  commodity: z.string().optional(),
  origin: z.string().min(2, "Origin is required"),
  destination: z.string().min(2, "Destination is required"),
  cargo_description: z.string().optional(),
  main_unit: z.string().default("1*40'HC"),
  extra_units: z.array(z.string()).default([]),
  cargo_items: z.array(z.object({
    type: z.enum(["header", "item"]).default("item"),
    description: z.string().min(1, "Description is required"),
    rate_usd: z.string().optional(),
    extra_rates: z.array(z.string()).optional(),
    remarks: z.string().optional(),
    indent: z.number().default(0),
  })).min(1, "At least one cargo item is required"),
  chargeable_weight: z.string().optional(),
  cif_value_usd: z.string().optional(),
  transport_mode: z.enum(["air", "sea", "road"]).optional().nullable(),
  movement_type: z.enum(["import", "export"]).optional().nullable(),
  logistics_carrier: z.string().optional(),
  logistics_transit: z.string().optional(),
  logistics_extra: z.string().optional(),
  validity: z.string().optional(),
  amount: z.string().optional().transform(v => v ? parseFloat(v) : null),
  valid_until: z.string().min(1, "Valid until date is required"),
  remarks: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

export default function Quotations() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [viewQuote, setViewQuote] = useState<any>(null);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [declineQuote, setDeclineQuote] = useState<any>(null);
  const [logInteractionQuoteId, setLogInteractionQuoteId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [commentText, setCommentText] = useState("");

  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch current user and role
  const { user: userProfile, isAdmin, isLeads, isSales, isOperations, isFinance } = useAuth();

  const canEditQuotes = isAdmin || isLeads || isSales;
  const canReview = isAdmin || isLeads || isOperations || isFinance;

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      lead_id: "",
      customer_id: "",
      contact_person: "",
      commodity: "",
      origin: "",
      destination: "",
      cargo_description: "",
      main_unit: "1*40'HC",
      extra_units: [],
      cargo_items: [{ type: "item", description: "", rate_usd: "", extra_rates: [], remarks: "", indent: 1 }],
      validity: "15 Days",
      amount: "" as any,
      valid_until: "",
      remarks: "",
      transport_mode: null,
      movement_type: "import",
      logistics_carrier: "",
      logistics_transit: "",
      logistics_extra: "",
    }
  });

  const { hasDraft, restoreDraft, discardDraft } = useFormDraft({
    key: "ozmae_quote_new",
    form,
    enabled: isNewModalOpen
  });


  const watchedItems = useWatch({ control: form.control, name: "cargo_items" });
  const watchedMainUnit = useWatch({ control: form.control, name: "main_unit" });

  useEffect(() => {
    if (watchedItems && watchedMainUnit) {
      const sum = watchedItems.reduce((acc: number, item: any) => {
        if (item.type === 'header') return acc;
        return acc + cleanAmount(item.rate_usd);
      }, 0);

      const qty = parseUnitQuantity(watchedMainUnit);
      const calculatedTotal = sum * qty;

      // Always sync — even when 0, so erasing a rate clears the total
      form.setValue("amount", calculatedTotal > 0 ? calculatedTotal.toFixed(2) as any : "" as any, { shouldDirty: false });
    }
  }, [watchedItems, watchedMainUnit]); // intentionally exclude form to avoid loop

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
          lead_id: lead.id || "",
          customer_id: lead.customer_id || "",
          contact_person: lead.contact_person || "",
          commodity: lead.commodity || "",
          origin: lead.origin || "",
          destination: lead.destination || "",
          chargeable_weight: lead.chargeable_weight || "",
          main_unit: lead.cargo_items?.find((it: any) => it.type === 'metadata')?.main_unit || lead.main_unit || "1*40'HC",
          extra_units: lead.cargo_items?.find((it: any) => it.type === 'metadata')?.extra_units || lead.extra_metadata?.extra_units || [],
          cargo_items: lead.cargo_items?.filter((it: any) => it.type !== 'metadata').length > 0
            ? lead.cargo_items
              .filter((it: any) => it.type !== 'metadata')
              .map((it: any) => ({
                description: it.description || "",
                type: it.type || "item",
                rate_usd: it.rate_usd || "",
                remarks: it.remarks || "",
                indent: it.indent || 1,
                extra_rates: it.extra_rates || []
              }))
            : [{ description: lead.cargo_description || "", type: "item", rate_usd: "", remarks: "", extra_rates: [], indent: 1 }],
          remarks: lead.remarks || "",
          amount: lead.rate_usd?.toString() || "" as any,
          validity: lead.validity || "15 Days",
          valid_until: lead.validity ? new Date(Date.now() + (parseInt(lead.validity) || 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          transport_mode: lead.transport_mode || null,
          movement_type: lead.movement_type || "import",
          logistics_carrier: lead.logistics_carrier || "",
          logistics_transit: lead.logistics_transit || "",
          logistics_extra: lead.logistics_extra || "",
        });

        if (location.state.directPreview) {
          // Immediately trigger quote creation for a seamless experience
          // Bypass formal validation if it's a direct preview from a lead
          setTimeout(() => {
            const values = form.getValues();
            // Ensure we have a valid customer name if customer_id is missing
            createQuoteMutation.mutate({
              ...values,
              customer_name_fallback: lead.customer_name_raw
            } as any);
          }, 100);
        } else {
          setIsNewModalOpen(true);
        }

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

  const existingCommodities = React.useMemo(() => {
    const unique = new Set<string>();
    if (leads) leads.forEach((l: any) => { if (l.commodity) unique.add(l.commodity) });
    if (quotations) quotations.forEach((q: any) => {
      const comm = q.metadata?.tableHeaders?.find((h: any) => h.label === "Commodity")?.value;
      if (comm && typeof comm === "string") unique.add(comm);
    });
    return ["General Cargo", "Electronics", "Agricultural", "Vehicles", "Heavy Machinery", "Perishables", "Minerals/Ores", ...Array.from(unique)];
  }, [leads, quotations]);

  const existingCifValues = React.useMemo(() => {
    const unique = new Set<string>();
    if (leads) leads.forEach((l: any) => { if (l.cif_value_usd && l.cif_value_usd !== "TBA") unique.add(l.cif_value_usd) });
    return ["TBA", ...Array.from(unique)];
  }, [leads]);

  const createQuoteMutation = useMutation({
    mutationFn: async (values: QuoteFormValues) => {
      // Ensure numeric fields are correctly handled (default to 0 if empty to satisfy DB constraints)
      const amountValue = typeof values.amount === 'string'
        ? (values.amount === "" ? 0 : parseFloat(values.amount))
        : (values.amount || 0);

      const newQuote = {
        customer_id: values.customer_id || null,
        lead_id: values.lead_id || null,
        status: "draft",
        total_amount_usd: amountValue,
        valid_until: values.valid_until,
        origin: values.origin,
        destination: values.destination,
        cargo_description: values.cargo_description,
        metadata: {
          titleText: "FREIGHT QUOTATION",
          tableHeaders: [
            "DESCRIPTION",
            (values.main_unit || "1*40'HC").toUpperCase(),
            ...(values.extra_units || []).map(u => u.toUpperCase()),
            "REMARKS"
          ],
          leftFields: [
            {
              label: "Date :",
              value: values.lead_id && leads?.find(l => l.id === values.lead_id)
                ? format(new Date(leads.find(l => l.id === values.lead_id).created_at), "dd/MM/yyyy")
                : format(new Date(), "dd/MM/yyyy")
            },
            { label: "Customer :", value: customers?.find(c => c.id === values.customer_id)?.company_name || (values as any).customer_name_fallback || "N/A" },
            { label: "Contact Person :", value: values.contact_person || "N/A" },
            { label: "Commodity :", value: values.commodity || "General Cargo" },
            { label: "Origin :", value: values.origin },
            { label: "Destination :", value: values.destination },
            { label: "Chargeable Weight :", value: values.chargeable_weight || "N/A" },
            { label: "CIF Value (USD) :", value: values.cif_value_usd || "N/A" },
            { label: "Validity :", value: values.validity || "15 Days" },
            ...(values.movement_type === 'export' ? [
              {
                label: values.transport_mode === 'sea' ? "Line/Carrier :" : "Airline/Carrier :",
                value: values.logistics_carrier || "N/A"
              },
              { label: "Transit Time :", value: values.logistics_transit || "N/A" },
              { label: "Free Days :", value: values.logistics_extra || "N/A" }
            ] : [])
          ],
          tableRows: values.cargo_items.map((item) => ({
            type: item.type,
            desc: item.description,
            amount: item.rate_usd || "-",
            extraCols: [...(item.extra_rates || [])],
            remarks: item.remarks || "",
            indent: item.indent || 0,
          })),
          columnTypes: [
            "desc",
            "pricing",
            ...(values.extra_units || []).map(() => "pricing"),
            "remarks"
          ],
          totalAmountText: values.amount ? `$${values.amount.toLocaleString()}` : "—",
          footerNotesLeft: "Yours Sincerely,",
          footerNotesMiddle: "• Storage for overstayed shipment\n• Demurrage charges\n• Offloading charges at client premises",
          footerNotesRight: "• Commercial Invoice\n• Packing List\n• Bill of Lading Copy\n• TPIN Copy"
        },
        transport_mode: values.transport_mode || null,
        movement_type: values.movement_type || null,
      };

      const { data, error } = await supabase.from("quotations").insert([newQuote]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      setIsNewModalOpen(false);
      form.reset();
      discardDraft();
      setViewQuote(data);
      setIsPreviewOpen(true);
      toast.success("Quotation created successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1. Delete child quotation_items first (if table exists)
      const { error: itemsErr } = await supabase
        .from("quotation_items")
        .delete()
        .eq("quotation_id", id);
      // Ignore "relation does not exist" errors — table may not exist
      if (itemsErr && !itemsErr.message.includes("does not exist")) {
        console.warn("Could not delete quotation_items:", itemsErr.message);
      }

      // 2. Nullify any lead references so leads are preserved
      await supabase
        .from("leads")
        .update({ quotation_id: null } as any)
        .eq("quotation_id", id);

      // 3. Delete the quotation itself
      const { error, count } = await supabase
        .from("quotations")
        .delete({ count: "exact" })
        .eq("id", id);
      if (error) throw error;
      if (count === 0) throw new Error("Deletion blocked — check database permissions (RLS policy may be missing).");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      setSelectedQuote(null);
      setQuoteToDelete(null);
      toast.success("Quotation deleted successfully");
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

  const acceptQuoteMutation = useMutation({
    mutationFn: async (quote: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Update Quotation Status
      const { error: quoteErr } = await supabase
        .from("quotations")
        .update({ status: 'accepted' })
        .eq("id", quote.id);
      if (quoteErr) throw quoteErr;

      // 2. Create Job Order
      const newJob = {
        customer_id: quote.customer_id,
        quotation_id: quote.id,
        origin: quote.origin,
        destination: quote.destination,
        total_amount: quote.total_amount_usd,
        status: "planning",
        created_at: new Date().toISOString()
      };

      const { data: job, error: jobErr } = await supabase
        .from("job_orders")
        .insert([newJob])
        .select()
        .single();
      if (jobErr) throw jobErr;

      // 3. Find Operations Users
      const { data: opUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "Operations");

      // 4. Create Task for Operations
      if (opUsers && opUsers.length > 0) {
        const tasks = opUsers.map(op => ({
          customer_id: quote.customer_id,
          quotation_id: quote.id,
          job_order_id: job.id,
          title: `New Job Order: ${job.id.split('-')[0].toUpperCase()}`,
          description: `Quote accepted. Please initialize operations for ${quote.origin} to ${quote.destination}.`,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due tomorrow
          priority: 'high',
          status: 'pending',
          assigned_to: op.user_id,
          created_by: user.id
        }));

        const { error: taskErr } = await supabase.from("crm_tasks").insert(tasks);
        if (taskErr) console.error("Failed to create op tasks:", taskErr);
      }

      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["job_orders"] });
      queryClient.invalidateQueries({ queryKey: ["crm_tasks"] });
      setSelectedQuote(null);
      setIsAcceptConfirmOpen(false);
      toast.success("Quotation accepted!", {
        description: "Job Order has been initialized and assigned to Operations."
      });
    },
    onError: (err: any) => toast.error("Failed to accept quotation: " + err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success(`Quotation status updated to ${variables.status.replace('_', ' ')}`);
      // Update local state if needed
      if (selectedQuote?.id === variables.id) {
        setSelectedQuote({ ...selectedQuote, status: variables.status });
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ quotation_id, comment }: { quotation_id: string, comment: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("quotation_comments").insert([{
        quotation_id,
        user_id: user.id,
        comment
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation-comments"] });
      setCommentText("");
      toast.success("Comment added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: comments } = useQuery({
    queryKey: ["quotation-comments", selectedQuote?.id],
    queryFn: async () => {
      if (!selectedQuote?.id) return [];
      const { data, error } = await supabase
        .from("quotation_comments")
        .select(`*, user:profiles(full_name, avatar_url)`)
        .eq("quotation_id", selectedQuote.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedQuote?.id
  });

  const filtered = quotations?.filter((q: any) =>
    q.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadPDF = async (quote: any) => {
    try {
      const blob = await pdf(
        <QuotationPDFDocument
          meta={quote.metadata}
          logoUrl={ozmaeLogoImg}
          signatureUrl={signatureImg}
          memberLogoUrl={memberImg}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Ozmae_Quotation_${quote.id.split('-')[0].toUpperCase()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Downloading PDF....");
    } catch (err) {
      toast.error("Failed to generate PDF download");
    }
  };

  const onSubmit = (values: QuoteFormValues) => {
    createQuoteMutation.mutate(values);
  };

  // Group filtered quotes by transport_mode
  const TRANSPORT_ORDER: (TransportMode | null)[] = ["air", "sea", "road", null];
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set(["air", "sea", "road", "none"]));
  const toggleGroup = (key: string) => setExpandedGroups(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });

  const groupedQuotes = React.useMemo(() => {
    const groups: Record<string, any[]> = { air: [], sea: [], road: [], none: [] };
    (filtered || []).forEach((q: any) => {
      const key = q.transport_mode || "none";
      groups[key] = groups[key] || [];
      groups[key].push(q);
    });
    return groups;
  }, [filtered]);

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
          {canEditQuotes && (
            <Button onClick={() => setIsNewModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 h-11 px-6 shadow-lg shadow-accent/20">
              <Plus className="h-5 w-5" /> New Quotation
            </Button>
          )}
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

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-card rounded-lg border shadow-sm p-8">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-muted/50 animate-pulse rounded mb-4" />)}
          </div>
        ) : (filtered?.length === 0 ? (
          <div className="bg-card rounded-lg border shadow-sm p-12 text-center text-muted-foreground text-sm">No quotations found.</div>
        ) : (
          TRANSPORT_ORDER.map((mode) => {
            const key = mode ?? "none";
            const group = groupedQuotes[key] || [];
            if (group.length === 0) return null;
            const isExpanded = expandedGroups.has(key);
            return (
              <div key={key} className="space-y-2">
                <TransportModeGroupHeader mode={mode} count={group.length} expanded={isExpanded} onToggle={() => toggleGroup(key)} />
                {isExpanded && (
                  <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
                    <Table className="min-w-[1200px]">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[100px]">Quote #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Commodity</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>CIF Value (USD)</TableHead>
                          <TableHead>Validity</TableHead>
                          <TableHead className="min-w-[150px]">Cargo</TableHead>
                          <TableHead>Total Amount (USD)</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.map((quote: any) => (
                          <TableRow key={quote.id} className="cursor-pointer hover:bg-muted/30 transition-colors group" onClick={() => { setViewQuote(quote); setIsPreviewOpen(true); }}>
                            <TableCell className="font-mono text-[10px] font-bold text-accent uppercase">{quote.id.split('-')[0]}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">
                              {quote.customer?.company_name || quote.metadata?.leftFields?.find((f: any) => f.label.includes("Customer"))?.value || "Unknown"}
                            </TableCell>
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
                              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[8px] font-black uppercase text-muted-foreground opacity-60">Edit</span>
                                <input
                                  defaultValue={quote.metadata?.leftFields?.find((f: any) => f.label.toLowerCase().includes("cif"))?.value || ""}
                                  onBlur={(e) => {
                                    const newVal = e.target.value;
                                    const meta = { ...quote.metadata };
                                    const idx = meta.leftFields.findIndex((f: any) => f.label.toLowerCase().includes("cif"));
                                    if (idx !== -1) { meta.leftFields[idx].value = newVal; updateQuoteMutation.mutate({ id: quote.id, metadata: meta, totalAmount: quote.total_amount_usd }); }
                                  }}
                                  className="bg-transparent border-b border-transparent hover:border-accent/40 focus:border-accent focus:outline-none font-bold text-xs w-24 tabular-nums transition-all"
                                />
                              </div>
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
                            <TableCell>
                              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[8px] font-black uppercase text-accent/60">Primary Amount</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-muted-foreground">$</span>
                                  <input
                                    type="number" step="0.01"
                                    key={`amt-${quote.id}-${getQuoteTotal(quote)}`}
                                    defaultValue={getQuoteTotal(quote) || 0}
                                    onBlur={(e) => { const newVal = parseFloat(e.target.value) || 0; updateQuoteMutation.mutate({ id: quote.id, metadata: quote.metadata, totalAmount: newVal }); }}
                                    className="bg-transparent border-b border-transparent hover:border-accent/40 focus:border-accent focus:outline-none font-bold text-sm w-24 tabular-nums transition-all text-accent"
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{format(new Date(quote.valid_until), "MMM d, yyyy")}</TableCell>
                            <TableCell><StatusBadge status={quote.status} /></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button size="icon" variant="ghost" onClick={() => { setViewQuote(quote); setIsPreviewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setSelectedQuote(quote)}><Info className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setQuoteToDelete(quote.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })
        ))}
      </div>

      <Sheet open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-4">
            {hasDraft && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-accent/10 border border-accent/20 p-4 rounded-xl mb-6 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-accent tracking-widest">Unsaved Draft Found</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Would you like to resume your previous work?</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={discardDraft}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-white/5"
                  >
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    onClick={restoreDraft}
                    className="bg-accent text-accent-foreground text-[10px] font-black uppercase tracking-widest px-4 h-8 rounded-lg shadow-lg shadow-accent/20"
                  >
                    Restore
                  </Button>
                </div>
              </motion.div>
            )}
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="h-6 w-6 text-accent" />
              New Manual Quotation
            </SheetTitle>
            <SheetDescription>Generate a quick freight quote or proforma without an existing lead.</SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">

              {/* Transport Mode Selector */}
              <div className="p-4 bg-muted/20 rounded-xl border border-dashed">
                <TransportModeSelector
                  value={form.watch("transport_mode")}
                  onChange={(mode) => form.setValue("transport_mode", mode as any)}
                />
              </div>

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
                      <FormControl>
                        <CreatableCombobox
                          options={existingCommodities}
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Search or add commodity..."
                        />
                      </FormControl>
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
                      <FormControl>
                        <CreatableCombobox
                          options={existingCifValues}
                          value={field.value || "TBA"}
                          onChange={field.onChange}
                          placeholder="TBA or specific value..."
                        />
                      </FormControl>
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
                      <FormControl>
                        <CreatableCombobox
                          options={validityOptions}
                          value={field.value || "15 Days"}
                          onChange={field.onChange}
                          placeholder="15 Days"
                        />
                      </FormControl>
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
                      <FormLabel className="flex items-center gap-2">
                        Quote Amount (USD)
                        <span className="text-[9px] font-black uppercase tracking-wider text-accent/70 bg-accent/10 px-1.5 py-0.5 rounded">
                          Auto-calculated · Edit to override
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ""}
                          className="font-bold text-accent text-lg h-12"
                          placeholder="Auto-calculated from cargo rates"
                        />
                      </FormControl>
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
                  <span className="text-xl font-black text-accent">{selectedQuote.total_amount_usd ? formatCurrency(selectedQuote.total_amount_usd) : "—"}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">Internal Feedback</h4>
                <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                    {comments?.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic text-center py-2">No comments yet</p>
                    ) : (
                      comments?.map((comment: any) => (
                        <div key={comment.id} className="flex gap-2">
                          <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {comment.user?.full_name?.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[10px] font-black">{comment.user?.full_name}</span>
                              <span className="text-[8px] text-muted-foreground">{format(new Date(comment.created_at), "MMM d, HH:mm")}</span>
                            </div>
                            <p className="text-[11px] text-foreground leading-relaxed bg-white p-2 rounded-lg border shadow-sm">{comment.comment}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-muted-foreground/10">
                    <Input
                      placeholder="Add a comment..."
                      className="h-9 text-[11px] bg-white"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && commentText && addCommentMutation.mutate({ quotation_id: selectedQuote.id, comment: commentText })}
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => commentText && addCommentMutation.mutate({ quotation_id: selectedQuote.id, comment: commentText })}
                      disabled={!commentText || addCommentMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-3 pb-8">
                {/* Phase 3 Action Flow */}
                {selectedQuote.status === 'draft' && (
                  <Button
                    className="bg-amber-600 hover:bg-amber-700 text-white h-12 font-bold shadow-lg gap-2 col-span-2"
                    disabled={!canEditQuotes}
                    onClick={() => updateStatusMutation.mutate({ id: selectedQuote.id, status: 'awaiting_review' })}
                  >
                    <CheckCircle className="h-4 w-4" /> {!canEditQuotes ? 'Draft Locking' : 'Submit for Approval'}
                  </Button>
                )}

                {selectedQuote.status === 'awaiting_review' && canReview && (
                  <>
                    <Button
                      variant="outline"
                      className="h-12 border-rose-500 text-rose-500 hover:bg-rose-50 font-bold gap-2"
                      onClick={() => updateStatusMutation.mutate({ id: selectedQuote.id, status: 'under_revision' })}
                    >
                      <CornerUpLeft className="h-4 w-4" /> Needs Revision
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 font-bold shadow-lg gap-2"
                      onClick={() => updateStatusMutation.mutate({ id: selectedQuote.id, status: 'approved' })}
                    >
                      <CheckCircle className="h-4 w-4" /> Approve Quote
                    </Button>
                  </>
                )}

                {selectedQuote.status === 'under_revision' && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 font-bold shadow-lg gap-2 col-span-2"
                    onClick={() => updateStatusMutation.mutate({ id: selectedQuote.id, status: 'awaiting_review' })}
                  >
                    <Send className="h-4 w-4" /> Re-submit for Review
                  </Button>
                )}

                {selectedQuote.status === 'approved' && (
                  <Button
                    className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 font-bold shadow-lg gap-2 col-span-2"
                    onClick={() => updateStatusMutation.mutate({ id: selectedQuote.id, status: 'sent' })}
                  >
                    <Mail className="h-4 w-4" /> Mark as Sent to Customer
                  </Button>
                )}

                <Button
                  className="bg-accent/10 text-accent hover:bg-accent/20 h-12 font-bold gap-2"
                  onClick={() => setLogInteractionQuoteId(selectedQuote.id)}
                >
                  <Mail className="h-4 w-4" /> Log Email
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
                  disabled={!canEditQuotes}
                  onClick={() => setDeclineQuote(selectedQuote)}
                >
                  <Trash2 className="h-4 w-4" /> {!canEditQuotes ? 'Decline Restricted' : 'Decline & Close'}
                </Button>
                {['sent', 'approved'].includes(selectedQuote.status) && (
                  <Button
                    className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 col-span-2"
                    onClick={() => setIsAcceptConfirmOpen(true)}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Accept & Initialize Job
                  </Button>
                )}
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

      <AnimatePresence>
        {isPreviewOpen && viewQuote && (
          <QuotationTemplateEditor
            key="quotation-editor"
            initialData={viewQuote}
            isSaving={updateQuoteMutation.isPending}
            memberLogoUrl={memberImg}
            onSave={async (meta, total) => {
              await updateQuoteMutation.mutateAsync({ id: viewQuote.id, metadata: meta, totalAmount: total });
            }}
            onEmail={() => {
              const customerEmail = viewQuote.customer?.email || "";
              const quoteRef = viewQuote.id.split("-")[0].toUpperCase();
              const subject = encodeURIComponent(`Quotation #${quoteRef} - Ozmae Freight Solutions`);
              const body = encodeURIComponent(`Dear Customer,\n\nPlease find attached the quotation #${quoteRef} for your freight inquiry.\n\nBest regards,\nOzmae Freight Solutions`);

              window.location.href = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
              setLogInteractionQuoteId(viewQuote.id);
            }}
            onClose={() => setIsPreviewOpen(false)}
          />
        )}
      </AnimatePresence>

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

      {isAcceptConfirmOpen && (
        <DeleteConfirmModal
          isOpen={isAcceptConfirmOpen}
          onClose={() => setIsAcceptConfirmOpen(false)}
          onConfirm={() => acceptQuoteMutation.mutate(selectedQuote)}
          isDeleting={acceptQuoteMutation.isPending}
          title="Confirm Acceptance"
          description="Accepting this quotation will automatically update status to Accepted, initialize a new Job Order, and notify the Operations Team for fulfillment. Are you sure you want to proceed?"
        />
      )}
      <DeleteConfirmModal
        isOpen={!!quoteToDelete}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={() => quoteToDelete && deleteQuoteMutation.mutate(quoteToDelete)}
        isDeleting={deleteQuoteMutation.isPending}
        title="Delete Quotation?"
        description="Are you absolutely sure you want to delete this quotation? This will permanently erase the quote and its metadata. This action cannot be reversed."
      />
    </div>
  );
}
