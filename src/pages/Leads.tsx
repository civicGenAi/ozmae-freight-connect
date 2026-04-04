import { useState, useEffect } from "react";
import { Plus, Search, Mail, ArrowRight, Phone, Pencil, Info, Globe, Truck, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { format } from "date-fns";

const tabs = ["All", "New", "Contacted", "Qualified", "Lost", "Converted"];

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
  cif_value_usd: z.string().optional().transform(v => v ? parseFloat(v) : null),
  rate_usd: z.string().min(1, "Quoted rate is required").transform(v => parseFloat(v)),
  validity: z.string().optional(),
  cargo_description: z.string().optional(),
  cargo_items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    unit: z.string().min(1, "Unit is required"),
    remarks: z.string().optional(),
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
  
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      cif_value_usd: undefined,
      rate_usd: "" as any,
      validity: "15 Days",
      cargo_description: "",
      cargo_items: [{ description: "", unit: "1*40HC", remarks: "" }],
      remarks: "",
    }
  });

  // Edit Lead Form
  const editLeadForm = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
  });

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
        rate_usd: leadToEdit.rate_usd?.toString() || "",
        validity: leadToEdit.validity || "15 Days",
        cargo_description: leadToEdit.cargo_description || "",
        cargo_items: leadToEdit.cargo_items?.length > 0 
          ? leadToEdit.cargo_items 
          : [{ description: leadToEdit.cargo_description || "", unit: "1*40HC", remarks: "" }],
        remarks: leadToEdit.remarks || "",
      });
      setAdditionalEmails(leadToEdit.additional_emails || []);
      setAdditionalPhones(leadToEdit.additional_phones || []);
    }
  }, [leadToEdit, editLeadForm]);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select(`
          *,
          assigned_user:profiles!leads_assigned_to_fkey(full_name)
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

  const createLeadMutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      const data = {
        lead_number: `L-${Date.now().toString().slice(-4)}`,
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
        remarks: values.remarks || null,
        cargo_type: "general", 
        cargo_description: values.cargo_items[0].description, // Fallback for old column
        cargo_items: values.cargo_items,
        rate_usd: values.rate_usd,
        status: "new",
      };
      const { error } = await supabase.from("leads").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsNewModalOpen(false);
      setAdditionalEmails([]);
      setAdditionalPhones([]);
      newLeadForm.reset();
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
        remarks: values.remarks || null,
        cargo_description: values.cargo_items[0].description, // Fallback for old column
        cargo_items: values.cargo_items,
        rate_usd: values.rate_usd,
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

  const onSubmitNew = (values: LeadFormValues) => {
    createLeadMutation.mutate(values);
  };

  const onSubmitEdit = (values: LeadFormValues) => {
    updateLeadMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Leads & Inquiries">
        <Button 
          onClick={() => {
            setAdditionalEmails([]);
            setAdditionalPhones([]);
            setIsNewModalOpen(true);
          }} 
          className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 h-11 px-6 shadow-lg shadow-accent/20"
        >
          <Plus className="h-5 w-5" /> New Inquiry
        </Button>
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

      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">Lead ID</TableHead>
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
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={12}><div className="h-12 bg-muted/50 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                  No leads found.
                </TableCell>
              </TableRow>
            ) : filtered?.map((lead: any) => (
              <TableRow 
                key={lead.id} 
                className="cursor-pointer hover:bg-muted/30 transition-colors group" 
                onClick={() => setSelectedLead(lead)}
              >
                <TableCell className="font-mono text-[10px] font-bold text-accent uppercase">{lead.id.split('-')[0]}</TableCell>
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
                  <span className="text-xs font-medium">{lead.cif_value_usd ? `$${lead.cif_value_usd.toLocaleString()}` : "N/A"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] font-semibold text-muted-foreground">{lead.validity || "15 Days"}</span>
                </TableCell>
                <TableCell className="max-w-[240px]">
                  {lead.cargo_items?.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {lead.cargo_items.slice(0, 2).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 overflow-hidden">
                          <span className="text-[10px] font-bold text-accent bg-accent/5 px-1 rounded shrink-0">{item.unit}</span>
                          <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                        </div>
                      ))}
                      {lead.cargo_items.length > 2 && (
                        <span className="text-[9px] text-muted-foreground/60 italic">+{lead.cargo_items.length - 2} more items</span>
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
                    <p className="text-xs font-bold">{selectedLead.cif_value_usd ? `$${selectedLead.cif_value_usd.toLocaleString()}` : "N/A"}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded border">
                    <p className="text-[9px] text-muted-foreground uppercase">Validity</p>
                    <p className="text-xs font-bold">{selectedLead.validity || "N/A"}</p>
                  </div>
                  <div className="p-2 bg-accent/5 rounded border border-accent/20">
                    <p className="text-[9px] text-accent uppercase font-bold">Quoted Rate</p>
                    <p className="text-xs font-bold text-accent">${selectedLead.rate_usd?.toLocaleString() || '0.00'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">Cargo Details</h4>
                {selectedLead.cargo_items?.length > 0 ? (
                  <div className="rounded-md border bg-muted/10 overflow-hidden">
                    <table className="w-full text-[10px] text-left border-collapse">
                      <thead className="bg-muted/50 font-bold uppercase text-muted-foreground border-b">
                        <tr>
                          <th className="px-2 py-1.5 w-16">Unit</th>
                          <th className="px-2 py-1.5">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedLead.cargo_items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-2 py-1.5 font-bold text-accent">{item.unit}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{item.description}</td>
                          </tr>
                        ))}
                      </tbody>
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

              <div className="pt-6 grid grid-cols-2 gap-3 pb-8">
                <Button 
                  variant="outline"
                  className="h-12 border-accent text-accent hover:bg-accent/5 font-bold gap-2"
                  onClick={() => {
                    setLeadToEdit(selectedLead);
                    setIsEditModalOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit Details
                </Button>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 font-bold shadow-lg"
                  onClick={() => navigate('/quotations', { state: { leadId: selectedLead.id } })}
                >
                  Create Quotation
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <LogInteractionDrawer 
        leadId={logInteractionLeadId} 
        onClose={() => setLogInteractionLeadId(null)} 
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
          dealValue={declineLead.rate_usd}
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
}: LeadFormSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="border-b pb-4 mb-4">
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
                        <Input placeholder="e.g. Electronics, Garments" {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-3 pt-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  Cargo Specification <span className="text-destructive">*</span>
                </Label>
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                        <Input type="number" step="0.01" placeholder="0.00" {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rate_usd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} className="h-10 font-bold border-accent/30 text-accent" />
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
                        <Input placeholder="15 Days" {...field} className="h-10" />
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
