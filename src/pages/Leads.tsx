import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, Mail, ArrowRight, Phone, Pencil, Info, Globe, Truck, DollarSign, Clock, BarChart3, TrendingUp, Users, Ship, Plane, Activity, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cleanAmount } from "@/lib/quotationUtils";
import { useFormDraft } from "@/hooks/useFormDraft";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LogInteractionDrawer } from "@/components/LogInteractionDrawer";
import { DeclineReasonModal } from "@/components/DeclineReasonModal";
import { StringArrayInput } from "@/components/StringArrayInput";
import { LocationSelect } from "@/components/LocationSelect";
import { PhoneInput } from "@/components/PhoneInput";
import { CargoItemsTable } from "@/components/CargoItemsTable";
import { TransportModeSelector, TransportModeBadge, TransportModeGroupHeader, type TransportMode } from "@/components/TransportModeSelector";
import { Pagination } from "@/components/Pagination";
import { CreatableCombobox } from "@/components/CreatableCombobox";

const PAGE_SIZE = 15;

const tabs = ["All", "New", "Contacted", "Qualified", "Lost", "Converted"];

const validityOptions = Array.from({ length: 94 }, (_, i) => `${i + 7} Days`);

// Form Schema
const leadSchema = z.object({
  customer_name: z.string().min(2, "Customer name must be at least 2 characters"),
  contact_person: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  origin: z.string().min(2, "Please select an origin city/port"),
  destination: z.string().min(2, "Please select a destination city/port"),
  commodity: z.string().optional(),
  chargeable_weight: z.string().optional(),
  cif_value_usd: z.string().optional(),
  transport_mode: z.enum(["air", "sea", "road"]),
  movement_type: z.enum(["import", "export"]).optional().nullable(),
  logistics_carrier: z.string().optional(),
  logistics_transit: z.string().optional(),
  logistics_extra: z.string().optional(),
  validity: z.string().optional(),
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
  remarks: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export default function Leads() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [declineLead, setDeclineLead] = useState<any>(null);
  const [logInteractionLeadId, setLogInteractionLeadId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { user: userProfile, isAdmin, isLeads, isSales } = useAuth();
  const canEditLeads = isAdmin || isLeads || isSales;

  // Transport mode grouping state — kept at top per React hooks rules
  const TRANSPORT_ORDER: (TransportMode | null)[] = ["air", "sea", "road", null];
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set(["air", "sea", "road", "none"]));
  const toggleGroup = (key: string) => setExpandedGroups(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });

  // New Lead Form
  const newLeadForm = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      customer_name: "",
      contact_person: "",
      email: "",
      phone: "+255",
      origin: "",
      destination: "",
      commodity: "",
      chargeable_weight: "",
      cif_value_usd: "TBA",
      transport_mode: "sea", // Default to sea
      movement_type: "export",
      logistics_carrier: "",
      logistics_transit: "",
      logistics_extra: "",
      validity: "15 Days",
      cargo_description: "",
      main_unit: "1*40'HC",
      extra_units: [],
      cargo_items: [{ type: "item", description: "", rate_usd: "", extra_rates: [], remarks: "", indent: 1 }],
    }
  });

  const { hasDraft, restoreDraft, discardDraft } = useFormDraft({
    key: "ozmae_lead_new",
    form: newLeadForm,
    enabled: isNewModalOpen
  });

  const handleDuplicateLead = (lead: any) => {
    newLeadForm.reset({
      customer_name: lead.customer_name || "",
      contact_person: "", // Always force fresh entry as requested
      email: lead.email || "",
      phone: lead.phone || "",
      origin: lead.origin || "",
      destination: lead.destination || "",
      commodity: lead.commodity || "",
      chargeable_weight: lead.chargeable_weight || "",
      cif_value_usd: lead.cif_value_usd || "TBA",
      transport_mode: lead.transport_mode || "sea",
      movement_type: lead.movement_type || "export",
      logistics_carrier: lead.logistics_carrier || "",
      logistics_transit: lead.logistics_transit || "",
      logistics_extra: lead.logistics_extra || "",
      validity: lead.validity || "15 Days",
      cargo_description: lead.cargo_description || "",
      main_unit: lead.main_unit || "1*40'HC",
      extra_units: lead.extra_units || [],
      cargo_items: Array.isArray(lead.cargo_items) 
        ? lead.cargo_items.map((it: any) => ({ 
            description: it.description || "",
            type: it.type || "item",
            rate_usd: it.rate_usd || "",
            remarks: it.remarks || "",
            indent: it.indent || 1,
            extra_rates: it.extra_rates || [] 
          })) 
        : [{ type: "item", description: "", rate_usd: "", extra_rates: [], remarks: "", indent: 1 }],
      remarks: lead.remarks || "",
    });

    setIsNewModalOpen(true);
    toast.success("Lead data duplicated (Contact person cleared)");
  };

  // Edit Lead Form
  const editLeadForm = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (leadToEdit) {
      editLeadForm.reset({
        customer_name: leadToEdit.customer_name_raw,
        contact_person: leadToEdit.contact_person || "",
        email: leadToEdit.email || "",
        phone: leadToEdit.phone || "+255",
        origin: leadToEdit.origin,
        destination: leadToEdit.destination,
        commodity: leadToEdit.commodity || "",
        chargeable_weight: leadToEdit.chargeable_weight || "",
        cif_value_usd: leadToEdit.cif_value_usd?.toString() || "",
        transport_mode: leadToEdit.transport_mode || "sea",
        movement_type: leadToEdit.movement_type || "export",
        logistics_carrier: leadToEdit.logistics_carrier || "",
        logistics_transit: leadToEdit.logistics_transit || "",
        logistics_extra: leadToEdit.logistics_extra || "",
        validity: leadToEdit.validity || "15 Days",
        cargo_description: leadToEdit.cargo_description || "",
        main_unit: leadToEdit.cargo_items?.find((it: any) => it.type === 'metadata')?.main_unit || leadToEdit.main_unit || "1*40'HC",
        extra_units: leadToEdit.cargo_items?.find((it: any) => it.type === 'metadata')?.extra_units || leadToEdit.extra_metadata?.extra_units || [],
        cargo_items: leadToEdit.cargo_items?.filter((it: any) => it.type !== 'metadata').length > 0 
          ? leadToEdit.cargo_items
              .filter((it: any) => it.type !== 'metadata')
              .map((it: any) => ({
                ...it,
                extra_rates: it.extra_rates || []
              }))
          : [{ description: leadToEdit.cargo_description || "", type: "item", rate_usd: "", remarks: "", indent: 1, extra_rates: [] }],
        remarks: leadToEdit.remarks || "",
      });
      setAdditionalEmails(leadToEdit.additional_emails || []);
      setAdditionalPhones(leadToEdit.additional_phones || []);
    }
  }, [leadToEdit, editLeadForm]);

  const { data: leadData, isLoading } = useQuery({
    queryKey: ["leads", activeTab, currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("leads")
        .select(`
          *,
          assigned_user:profiles!leads_assigned_to_fkey(full_name)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (activeTab !== "All") {
        query = query.eq("status", activeTab.toLowerCase());
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { leads: data, totalCount: count || 0 };
    },
  });

  const { data: users } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
      if (error) throw error;
      return data;
    }
  });

  const assignLeadMutation = useMutation({
    mutationFn: async ({ leadId, userId }: { leadId: string, userId: string }) => {
      const { error } = await supabase.from("leads").update({ assigned_to: userId }).eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead assigned successfully");
    },
    onError: (err: any) => toast.error(err.message)
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string, status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead status updated");
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Real-time subscription for leads
  useEffect(() => {
    const channel = supabase
      .channel('leads_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'leads' 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const leads = leadData?.leads || [];
  const totalCount = leadData?.totalCount || 0;

  const existingCommodities = React.useMemo(() => {
    if (!leads) return ["General Cargo", "Electronics", "Agricultural", "Vehicles", "Heavy Machinery", "Perishables", "Minerals/Ores"];
    const unique = new Set<string>();
    leads.forEach((l: any) => { if (l.commodity) unique.add(l.commodity) });
    return ["General Cargo", "Electronics", "Agricultural", "Vehicles", "Heavy Machinery", "Perishables", "Minerals/Ores", ...Array.from(unique)];
  }, [leads]);

  const existingCifValues = React.useMemo(() => {
    if (!leads) return ["TBA"];
    const unique = new Set<string>();
    leads.forEach((l: any) => { if (l.cif_value_usd && l.cif_value_usd !== "TBA") unique.add(l.cif_value_usd) });
    return ["TBA", ...Array.from(unique)];
  }, [leads]);

  const createLeadMutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const leadId = `L-${Date.now().toString().slice(-4)}`;
      
      const data = {
        lead_number: leadId,
        customer_name_raw: values.customer_name,
        contact_person: values.contact_person || null,
        email: values.email || null,
        phone: values.phone || null,
        additional_emails: additionalEmails,
        additional_phones: additionalPhones,
        origin: values.origin,
        destination: values.destination,
        commodity: values.commodity || null,
        validity: values.validity || null,
        chargeable_weight: values.chargeable_weight,
        cif_value_usd: values.cif_value_usd,
        transport_mode: values.transport_mode,
        movement_type: values.movement_type,
        logistics_carrier: values.logistics_carrier,
        logistics_transit: values.logistics_transit,
        logistics_extra: values.logistics_extra,
        remarks: values.remarks || null,
        cargo_type: "general", 
        cargo_description: values.cargo_items[0]?.description || "", 
        cargo_items: [
          ...values.cargo_items,
          { type: 'metadata', main_unit: values.main_unit, extra_units: values.extra_units }
        ],
        status: "new",
      };

      const { data: lead, error } = await supabase.from("leads").insert([data]).select().single();
      if (error) throw error;

      // Broadcast notifications to all users
      const { data: profiles } = await supabase.from("profiles").select("id");
      if (profiles && profiles.length > 0) {
        const notifications = profiles.map(p => ({
          user_id: p.id,
          title: "New Lead Inbound",
          message: `New inquiry from ${values.customer_name} for ${values.origin} → ${values.destination}`,
          type: "success",
          related_table: "leads",
          related_id: lead.id
        }));
        await supabase.from("notifications").insert(notifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsNewModalOpen(false);
      setAdditionalEmails([]);
      setAdditionalPhones([]);
      newLeadForm.reset();
      discardDraft();
      toast.success("New lead created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create lead");
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      const data = {
        customer_name_raw: values.customer_name,
        contact_person: values.contact_person || null,
        email: values.email || null,
        phone: values.phone || null,
        additional_emails: additionalEmails,
        additional_phones: additionalPhones,
        origin: values.origin,
        destination: values.destination,
        commodity: values.commodity || null,
        validity: values.validity || null,
        chargeable_weight: values.chargeable_weight,
        cif_value_usd: values.cif_value_usd,
        transport_mode: values.transport_mode,
        movement_type: values.movement_type,
        logistics_carrier: values.logistics_carrier,
        logistics_transit: values.logistics_transit,
        logistics_extra: values.logistics_extra,
        remarks: values.remarks || null,
        cargo_description: values.cargo_items[0]?.description || "", 
        cargo_items: [
          ...values.cargo_items,
          { type: 'metadata', main_unit: values.main_unit, extra_units: values.extra_units }
        ],
      };
      const { error } = await supabase
        .from("leads")
        .update(data)
        .eq("id", leadToEdit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsEditModalOpen(false);
      setSelectedLead(null);
      toast.success("Lead updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update lead");
    }
  });

  const filtered = leads?.filter((l: any) => 
    l.customer_name_raw?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filtered leads after filtered is computed
  const groupedLeads = React.useMemo(() => {
    const groups: Record<string, any[]> = { air: [], sea: [], road: [], none: [] };
    (filtered || []).forEach((lead: any) => {
      const key = lead.transport_mode || "none";
      groups[key] = groups[key] || [];
      groups[key].push(lead);
    });
    return groups;
  }, [filtered]);

  const onSubmitNew = (values: LeadFormValues) => {
    createLeadMutation.mutate(values);
  };

  const onSubmitEdit = (values: LeadFormValues) => {
    updateLeadMutation.mutate(values);
  };



  return (
    <div className="space-y-6">
      <PageHeader title="Inquiry Pipeline">
        <div className="flex gap-2">
          {canEditLeads && (
            <Button 
              onClick={() => {
                setAdditionalEmails([]);
                setAdditionalPhones([]);
                setIsNewModalOpen(true);
              }}
              className="bg-[#F26B2A] hover:bg-[#d85e23] text-white shadow-lg shadow-[#F26B2A]/20 h-11 px-6 font-black uppercase text-[10px] tracking-widest gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> New Inquiry
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
                activeTab === tab 
                  ? "bg-card text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search leads..." 
            className="pl-9 h-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-card rounded-lg border shadow-sm p-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 animate-pulse rounded mb-4" />
            ))}
          </div>
        ) : (filtered?.length === 0 ? (
          <div className="bg-card rounded-lg border shadow-sm p-12 text-center text-muted-foreground text-sm">
            No leads found.
          </div>
        ) : (
          TRANSPORT_ORDER.map((mode) => {
            const key = mode ?? "none";
            const group = groupedLeads[key] || [];
            if (group.length === 0) return null;
            const isExpanded = expandedGroups.has(key);
            return (
              <div key={key} className="space-y-2">
                <TransportModeGroupHeader
                  mode={mode}
                  count={group.length}
                  expanded={isExpanded}
                  onToggle={() => toggleGroup(key)}
                />
                {isExpanded && (
                  <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
                    <Table className="min-w-[1200px]">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[100px]">Lead ID</TableHead>
                          <TableHead className="w-[160px]">Mode</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Commodity</TableHead>
                          <TableHead>Chg. Weight</TableHead>
                          <TableHead>CIF Value</TableHead>
                          <TableHead>Validity</TableHead>
                          <TableHead className="min-w-[150px]">Cargo Details</TableHead>
                          <TableHead>Received</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.map((lead: any) => (
                          <TableRow
                            key={lead.id}
                            className="cursor-pointer hover:bg-muted/30 transition-colors group"
                            onClick={() => setSelectedLead(lead)}
                          >
                            <TableCell className="font-mono text-[10px] font-bold text-accent uppercase">{lead.id.split('-')[0]}</TableCell>
                            <TableCell>
                              <TransportModeBadge mode={lead.transport_mode} movement={lead.movement_type} />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{lead.customer_name_raw}</span>
                                {lead.contact_person && (
                                  <span className="text-[10px] text-accent font-semibold">{lead.contact_person}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground">{lead.email || "No email"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-medium">{lead.origin}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{lead.destination}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">{lead.commodity || "N/A"}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-medium">{lead.chargeable_weight || "N/A"}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-medium">{lead.cif_value_usd || "N/A"}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-[10px] font-semibold text-muted-foreground">{lead.validity || "15 Days"}</span>
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                              {lead.cargo_items?.filter((it: any) => it.type !== 'metadata').length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {lead.cargo_items.filter((it: any) => it.type !== 'metadata').slice(0, 2).map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-1.5 overflow-hidden">
                                      <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                                    </div>
                                  ))}
                                  {lead.cargo_items.filter((it: any) => it.type !== 'metadata').length > 2 && (
                                    <span className="text-[9px] text-muted-foreground/60 italic">+{lead.cargo_items.filter((it: any) => it.type !== 'metadata').length - 2} more items</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground truncate block">{lead.cargo_description}</span>
                              )}
                              {lead.remarks && (
                                <span className="text-[9px] text-accent/70 block truncate italic mt-1">Note: {lead.remarks}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">{format(new Date(lead.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{lead.assigned_user?.full_name || "Unassigned"}</TableCell>
                            <TableCell><StatusBadge status={lead.status} /></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button size="icon" variant="outline" className="h-8 w-8 hover:text-accent shadow-sm" onClick={() => handleDuplicateLead(lead)} title="Duplicate Lead">
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="outline" className="h-8 w-8 hover:text-accent shadow-sm" onClick={() => setLogInteractionLeadId(lead.id)}>
                                  <Phone className="h-3.5 w-3.5" />
                                </Button>
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
        <Pagination 
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          className="mt-6 border-t pt-4"
        />
      </div>

      <LeadFormSheet 
        isOpen={isNewModalOpen}
        onOpenChange={setIsNewModalOpen}
        title="New Logistics Inquiry"
        description="Capture details for a new freight inquiry from a potential customer."
        form={newLeadForm}
        onSubmit={onSubmitNew}
        isPending={createLeadMutation.isPending}
        additionalEmails={additionalEmails}
        setAdditionalEmails={setAdditionalEmails}
        additionalPhones={additionalPhones}
        setAdditionalPhones={setAdditionalPhones}
        existingCommodities={existingCommodities}
        existingCifValues={existingCifValues}
        hasDraft={hasDraft}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />

      <LeadFormSheet 
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        title="Update Inquiry Info"
        description="Modify contact or shipment details for this inquiry."
        form={editLeadForm}
        onSubmit={onSubmitEdit}
        isPending={updateLeadMutation.isPending}
        additionalEmails={additionalEmails}
        setAdditionalEmails={setAdditionalEmails}
        additionalPhones={additionalPhones}
        setAdditionalPhones={setAdditionalPhones}
        existingCommodities={existingCommodities}
        existingCifValues={existingCifValues}
      />

      {/* Details Sheet */}
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle {...{children: "Lead Overview"} as any} />
            <SheetDescription {...{children: [`Detailed information for Inquiry #${selectedLead?.id.split('-')[0].toUpperCase()}`]} as any} />
          </SheetHeader>
          {selectedLead && (
            <div className="mt-8 space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Customer Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-bold leading-tight">{selectedLead.customer_name_raw}</p>
                    {selectedLead.contact_person && (
                      <p className="text-xs font-semibold text-accent">{selectedLead.contact_person}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> 
                      <span>{selectedLead.email || "No primary email"}</span>
                    </div>
                    {selectedLead.additional_emails?.length > 0 && (
                      <div className="pl-5 space-y-1">
                        {selectedLead.additional_emails.map((email: string, idx: number) => (
                          <div key={idx} className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                            <ArrowRight className="h-2 w-2" /> {email}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> 
                      <span>{selectedLead.phone || "No primary phone"}</span>
                    </div>
                    {selectedLead.additional_phones?.length > 0 && (
                      <div className="pl-5 space-y-1">
                        {selectedLead.additional_phones.map((phone: string, idx: number) => (
                          <div key={idx} className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                            <ArrowRight className="h-2 w-2" /> {phone}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">Shipment Overview</h4>
                {/* Transport Mode Badge in detail */}
              {selectedLead.transport_mode && (
                <div className="flex items-center gap-2">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Mode & Movement</p>
                  <TransportModeBadge mode={selectedLead.transport_mode} movement={selectedLead.movement_type} />
                </div>
              )}

              <div className="flex justify-between items-center bg-card rounded p-3 border shadow-sm">
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Origin</p>
                    <p className="font-bold text-sm">{selectedLead.origin}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-accent mx-4" />
                  <div className="text-center flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Destination</p>
                    <p className="font-bold text-sm">{selectedLead.destination}</p>
                  </div>
                </div>
                
                {selectedLead.commodity && (
                  <div className="px-3 py-1.5 bg-accent/5 border border-accent/20 rounded-md flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-accent">Commodity</span>
                    <span className="text-xs font-semibold">{selectedLead.commodity}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">Logistics & Params</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-muted/20 rounded border">
                    <p className="text-[9px] text-muted-foreground uppercase">Chargeable Weight</p>
                    <p className="text-xs font-bold">{selectedLead.chargeable_weight ? `${selectedLead.chargeable_weight} kg` : "N/A"}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded border">
                    <p className="text-[9px] text-muted-foreground uppercase">CIF Value (USD)</p>
                    <p className="text-xs font-bold">{selectedLead.cif_value_usd || "N/A"}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded border">
                    <p className="text-[9px] text-muted-foreground uppercase">Validity</p>
                    <p className="text-xs font-bold">{selectedLead.validity || "N/A"}</p>
                  </div>
                  {selectedLead.movement_type === 'export' && (
                    <div className="col-span-2 p-2 bg-accent/5 rounded border border-accent/20">
                      <p className="text-[9px] text-accent uppercase font-bold">Logistics Meta</p>
                      <p className="text-[11px] font-bold">
                        {selectedLead.logistics_carrier} {selectedLead.logistics_transit && `| ${selectedLead.logistics_transit}`} {selectedLead.logistics_extra && `| ${selectedLead.logistics_extra}`}
                      </p>
                    </div>
                  )}
                  <div className="p-2 bg-accent/5 rounded border border-accent/20">
                    <p className="text-[9px] text-accent uppercase font-bold">Calc. Sub-Total</p>
                    <p className="text-xs font-bold text-accent">
                      {(() => {
                        const sum = (selectedLead.cargo_items || []).filter((it: any) => it.type === 'item').reduce((acc: number, it: any) => acc + cleanAmount(it.rate_usd), 0);
                        return sum > 0 ? `$${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">Cargo Details</h4>
                {selectedLead.cargo_items?.length > 0 ? (
                  <div className="rounded-md border bg-muted/10 overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/50 font-bold uppercase text-[9px] text-muted-foreground border-b">
                        <tr>
                          <th className="px-3 py-1.5 min-w-[200px]">Description</th>
                          <th className="px-3 py-1.5 w-32 border-x border-muted/20 text-center">
                            {selectedLead.cargo_items?.find((it: any) => it.type === 'metadata')?.main_unit || selectedLead.main_unit || "Rate ($)"}
                          </th>
                          <th className="px-3 py-1.5">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted/10">
                        {selectedLead.cargo_items?.filter((it: any) => it.type !== 'metadata').map((item: any, idx: number) => (
                          <tr key={idx} className={cn("bg-card/30", item.type === 'header' && "bg-muted/10")}>
                            <td 
                              className={cn(
                                "px-3 py-2 align-top text-[11px] font-medium leading-relaxed",
                                item.type === "header" && "font-bold text-accent text-[12px]"
                              )}
                              style={{ paddingLeft: item.type === "item" ? "24px" : "12px" }}
                            >
                              {item.description}
                            </td>
                            <td className="px-3 py-2 align-top border-x border-muted/20">
                              {item.type === "item" ? (
                                <div className="flex justify-between w-full font-bold text-accent">
                                  <span className="opacity-40 text-[9px]">$</span>
                                  <span>{item.rate_usd || "-"}</span>
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground/30 font-bold">—</div>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top text-[10px] italic text-muted-foreground">
                              {item.remarks}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Sub-total — calculated live from cargo_items */}
                      <tfoot className="border-t border-muted-foreground/30 bg-muted/20">
                        <tr className="font-bold">
                          <td className="px-3 py-1.5 text-[9px] uppercase text-muted-foreground text-right border-r border-muted/20">Sub-Total</td>
                          <td className="px-3 py-1.5">
                            <div className="flex justify-between w-full text-accent">
                              <span className="opacity-40 text-[9px]">$</span>
                              <span>
                                {(() => {
                                  const sum = (selectedLead.cargo_items || []).filter((it: any) => it.type === 'item').reduce((acc: number, it: any) => acc + cleanAmount(it.rate_usd), 0);
                                  return sum > 0 ? sum.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—';
                                })()}
                              </span>
                            </div>
                          </td>
                          <td className="bg-transparent"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/50 rounded-md border text-xs">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Description</p>
                    <p className="italic text-muted-foreground">"{selectedLead.cargo_description}"</p>
                  </div>
                )}
                
                {selectedLead.remarks && (
                  <div className="p-3 bg-amber-50/50 rounded-md border border-amber-100 text-xs">
                    <p className="text-[9px] uppercase font-bold text-amber-700 mb-1">Special Remarks</p>
                    <p className="text-amber-900">{selectedLead.remarks}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Received Date</span>
                  <span>{format(new Date(selectedLead.created_at), "PPP")}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Lead ID</span>
                  <span className="font-mono text-[10px] bg-accent/10 px-2 py-0.5 rounded text-accent font-bold uppercase">{selectedLead.id}</span>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Operational Assignment</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl">
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Assigned To</p>
                      <Select 
                        value={selectedLead.assigned_to || ""} 
                        onValueChange={(val) => assignLeadMutation.mutate({ leadId: selectedLead.id, userId: val })}
                      >
                        <SelectTrigger className="mt-1 h-8 bg-transparent border-none p-0 focus:ring-0 font-bold text-sm">
                          <SelectValue placeholder="Assign Personnel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users?.map((u: any) => (
                            <SelectItem key={u.id} value={u.id} className="text-xs font-medium">
                              {u.full_name} <span className="text-[10px] opacity-50 ml-1">({u.role})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Pipeline Status</p>
                    <Select 
                      value={selectedLead.status} 
                      onValueChange={(val) => {
                        if (val === 'declined') {
                          setDeclineLead(selectedLead);
                        } else {
                          updateStatusMutation.mutate({ leadId: selectedLead.id, status: val });
                        }
                      }}
                      disabled={(selectedLead.status === 'converted' && !isAdmin) || !canEditLeads}
                    >
                      <SelectTrigger className={cn(
                        "h-10 px-4 font-bold text-xs rounded-xl border-slate-200 bg-white shadow-sm",
                        selectedLead.status === 'converted' && "border-emerald-100 bg-emerald-50/30 text-emerald-700"
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['new', 'contacted', 'qualified', 'quoted', 'converted', 'declined', 'archived'].map((status) => (
                           <SelectItem key={status} value={status} className="text-xs font-bold uppercase tracking-widest">
                             {status}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-3 pb-8">
                <Button 
                  variant="outline"
                  className="h-12 border-accent text-accent hover:bg-accent/5 font-bold gap-2"
                  disabled={((selectedLead.status === 'converted') && !isAdmin) || !canEditLeads}
                  onClick={() => {
                    setLeadToEdit(selectedLead);
                    setIsEditModalOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" /> {!canEditLeads ? 'View Only' : (selectedLead.status === 'converted' && !isAdmin ? 'Locked (Converted)' : 'Edit Details')}
                </Button>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 font-bold shadow-lg"
                  onClick={() => navigate('/quotations', { state: { leadId: selectedLead.id, directPreview: true } })}
                >
                  Create Quotation
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <LogInteractionDrawer 
        open={!!logInteractionLeadId} 
        onOpenChange={(open) => !open && setLogInteractionLeadId(null)}
        leadId={logInteractionLeadId || undefined} 
      />
      
      {declineLead && (
        <DeclineReasonModal
          open={!!declineLead}
          onOpenChange={(open) => !open && setDeclineLead(null)}
          entityType="lead"
          entityId={declineLead.id}
          customerId={declineLead.customer_id || ""}
          routeOrigin={declineLead.origin}
          routeDestination={declineLead.destination}
          dealValue={(declineLead.cargo_items || []).filter((it: any) => it.type === 'item').reduce((acc: number, it: any) => acc + cleanAmount(it.rate_usd), 0) || undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            setDeclineLead(null);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}

// Sub-component for the grouped form sheet
interface LeadFormSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  form: any;
  onSubmit: (values: any) => void;
  isPending: boolean;
  additionalEmails: string[];
  setAdditionalEmails: (emails: string[]) => void;
  additionalPhones: string[];
  setAdditionalPhones: (phones: string[]) => void;
  existingCommodities: string[];
  existingCommodities: string[];
  existingCifValues: string[];
  hasDraft?: boolean;
  onRestore?: () => void;
  onDiscard?: () => void;
}

function LeadFormSheet({
  isOpen,
  onOpenChange,
  title,
  description,
  form,
  onSubmit,
  isPending,
  additionalEmails,
  setAdditionalEmails,
  additionalPhones,
  setAdditionalPhones,
  existingCommodities,
  existingCifValues,
  hasDraft,
  onRestore,
  onDiscard,
}: LeadFormSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
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
                  onClick={onDiscard}
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-white/5"
                >
                  Discard
                </Button>
                <Button 
                  size="sm" 
                  onClick={onRestore}
                  className="bg-accent text-accent-foreground text-[10px] font-black uppercase tracking-widest px-4 h-8 rounded-lg shadow-lg shadow-accent/20"
                >
                  Restore
                </Button>
              </div>
            </motion.div>
          )}
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            {title === "New Logistics Inquiry" ? <Plus className="h-6 w-6 text-accent" /> : <Pencil className="h-6 w-6 text-accent" />}
            {title}
          </SheetTitle>
          <SheetDescription className="text-sm">
            {description}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4 px-2">

            {/* Transport Mode Selector — top of form */}
            <div className="p-4 bg-muted/20 rounded-xl border border-dashed">
              <TransportModeSelector
                value={form.watch("transport_mode")}
                onChange={(mode) => {
                  form.setValue("transport_mode", mode as any);
                  if (mode === 'road') form.setValue("movement_type", null);
                  else if (!form.getValues("movement_type")) form.setValue("movement_type", "export");
                }}
                movement={form.watch("movement_type")}
                onMovementChange={(mv) => form.setValue("movement_type", mv)}
              />
            </div>

            {/* Section 1: Contact Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-widest text-[10px]">
                <div className="bg-accent/10 p-1.5 rounded">
                  <Info className="h-4 w-4" />
                </div>
                Contact Information
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer / Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Logistics Ltd" {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-muted/30 p-4 rounded-xl border border-dashed space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@example.com" {...field} className="h-10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Phone (Optional)</FormLabel>
                        <FormControl>
                          <PhoneInput {...field} placeholder="Phone number..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Additional Emails</Label>
                    <StringArrayInput values={additionalEmails} onChange={setAdditionalEmails} placeholder="Add CC email..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Additional Phones</Label>
                    <StringArrayInput values={additionalPhones} onChange={setAdditionalPhones} placeholder="Add phone..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Shipment Route & Cargo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-widest text-[10px]">
                <div className="bg-accent/10 p-1.5 rounded">
                  <Truck className="h-4 w-4" />
                </div>
                Shipment & Cargo Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Place of Origin</FormLabel>
                      <FormControl>
                        <LocationSelect {...field} placeholder="Select origin..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Place of Destination</FormLabel>
                      <FormControl>
                        <LocationSelect {...field} placeholder="Select destination..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  Cargo Specification <span className="text-destructive">*</span>
                </Label>

                {form.watch("movement_type") === "export" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-4 mb-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-accent/20 p-1.5 rounded-lg">
                          <Globe className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-accent tracking-widest leading-none">Logistics Quick-Setup</p>
                          <p className="text-[11px] text-muted-foreground font-medium">Set defaults for all cargo rows</p>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="h-8 text-[9px] font-bold uppercase tracking-widest border-accent/20 hover:bg-accent hover:text-white transition-all shadow-sm"
                        onClick={() => {
                          const carrier = form.getValues("logistics_carrier") || "";
                          const transit = form.getValues("logistics_transit") || "";
                          const extra = form.getValues("logistics_extra") || "";
                          const items = form.getValues("cargo_items") || [];
                          
                          const combined = [carrier, transit, extra].filter(Boolean).join(" / ");
                          
                          const updated = items.map((item: any) => ({
                            ...item,
                            extra_info: combined
                          }));
                          form.setValue("cargo_items", updated);
                          toast.success("Applied to all rows");
                        }}
                      >
                        Apply to All Rows
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground/70">{form.watch("transport_mode") === 'air' ? 'Airline Name' : 'Shipping Line'}</Label>
                        <Input 
                          placeholder="Carrier name..."
                          {...form.register("logistics_carrier")}
                          className="h-9 text-xs bg-white font-medium focus-visible:ring-accent"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground/70">Transit Time</Label>
                        <Input 
                          placeholder="e.g. 25-30 Days"
                          {...form.register("logistics_transit")}
                          className="h-9 text-xs bg-white font-medium focus-visible:ring-accent"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground/70">{form.watch("transport_mode") === 'air' ? 'Time (Days)' : 'Free Days'}</Label>
                        <Input 
                          placeholder="e.g. 14 Days"
                          {...form.register("logistics_extra")}
                          className="h-9 text-xs bg-white font-medium focus-visible:ring-accent"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <CargoItemsTable control={form.control} name="cargo_items" />
              </div>
            </div>

            {/* Section 3: Logistics & Pricing */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-widest text-[10px]">
                <div className="bg-accent/10 p-1.5 rounded">
                  <DollarSign className="h-4 w-4" />
                </div>
                Pricing & Logistics Params
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="chargeable_weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (e.g., 500kg)</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="e.g. 1.2 Tons" {...field} className="h-10" />
                      </FormControl>
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

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Remarks</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any special notes or instructions..." {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="pt-8 pb-12">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-8">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-10 font-bold shadow-lg shadow-accent/20">
                {isPending ? "Syncing..." : (title === "New Logistics Inquiry" ? "Create Inquiry" : "Update Inquiry")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
