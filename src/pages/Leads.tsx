import { useState, useEffect } from "react";
import { Plus, X, Search, Filter, MoreHorizontal, MessageSquare, Mail, ArrowRight, Phone, XCircle, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LogInteractionDrawer } from "@/components/LogInteractionDrawer";
import { DeclineReasonModal } from "@/components/DeclineReasonModal";
import { StringArrayInput } from "@/components/StringArrayInput";
import { format } from "date-fns";

const tabs = ["All", "New", "Contacted", "Qualified", "Lost", "Converted"];

export default function Leads() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [declineLead, setDeclineLead] = useState<any>(null);
  const [logInteractionLeadId, setLogInteractionLeadId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<any>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [newAdditionalEmails, setNewAdditionalEmails] = useState<string[]>([]);
  const [newAdditionalPhones, setNewAdditionalPhones] = useState<string[]>([]);
  const [editAdditionalEmails, setEditAdditionalEmails] = useState<string[]>([]);
  const [editAdditionalPhones, setEditAdditionalPhones] = useState<string[]>([]);

  useEffect(() => {
    if (leadToEdit) {
      setEditAdditionalEmails(leadToEdit.additional_emails || []);
      setEditAdditionalPhones(leadToEdit.additional_phones || []);
    }
  }, [leadToEdit]);

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
    mutationFn: async (newLead: any) => {
      const { error } = await supabase.from("leads").insert([newLead]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsNewModalOpen(false);
      setNewAdditionalEmails([]);
      setNewAdditionalPhones([]);
      toast.success("New lead created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create lead");
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (updatedLead: any) => {
      const { error } = await supabase
        .from("leads")
        .update(updatedLead)
        .eq("id", updatedLead.id);
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

  const handleCreateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      lead_number: `L-${Date.now().toString().slice(-4)}`,
      customer_name_raw: formData.get("customer_name"),
      contact_person: formData.get("contact_person") || null,
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      additional_emails: newAdditionalEmails,
      additional_phones: newAdditionalPhones,
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      commodity: formData.get("commodity") || null,
      validity: formData.get("validity") || null,
      chargeable_weight: parseFloat(formData.get("chargeable_weight") as string) || null,
      cif_value_usd: parseFloat(formData.get("cif_value_usd") as string) || null,
      remarks: formData.get("remarks") || null,
      cargo_type: "general", 
      cargo_description: formData.get("cargo_details"),
      rate_usd: parseFloat(formData.get("rate") as string) || 0,
      status: "new",
    };
    createLeadMutation.mutate(data);
  };

  const handleUpdateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      id: leadToEdit.id,
      customer_name_raw: formData.get("customer_name"),
      contact_person: formData.get("contact_person") || null,
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      additional_emails: editAdditionalEmails,
      additional_phones: editAdditionalPhones,
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      commodity: formData.get("commodity") || null,
      validity: formData.get("validity") || null,
      chargeable_weight: parseFloat(formData.get("chargeable_weight") as string) || null,
      cif_value_usd: parseFloat(formData.get("cif_value_usd") as string) || null,
      remarks: formData.get("remarks") || null,
      cargo_description: formData.get("cargo_details"),
      rate_usd: parseFloat(formData.get("rate") as string) || 0,
    };
    updateLeadMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Leads & Inquiries">
        <Button onClick={() => setIsNewModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> New Inquiry
        </Button>
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
            placeholder="Search leads..." 
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
                  <TableCell colSpan={7}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
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
                  <span className="text-xs font-medium">{lead.chargeable_weight ? `${lead.chargeable_weight} kg` : "N/A"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium">{lead.cif_value_usd ? `$${lead.cif_value_usd.toLocaleString()}` : "N/A"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] font-semibold text-muted-foreground">{lead.validity || "15 Days"}</span>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <span className="text-xs text-muted-foreground truncate block">{lead.cargo_description}</span>
                  {lead.remarks && (
                    <span className="text-[9px] text-accent/70 block truncate italic">Note: {lead.remarks}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">{format(new Date(lead.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{lead.assigned_user?.full_name || "Unassigned"}</TableCell>
                <TableCell><StatusBadge status={lead.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="outline" className="h-8 w-8 hover:text-accent" onClick={() => setLogInteractionLeadId(lead.id)}>
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New Lead Sheet */}
      <Sheet open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle {...{children: "New Logistics Inquiry"} as any} />
            <SheetDescription {...{children: "Capture details for a new freight inquiry from a potential customer."} as any} />
          </SheetHeader>
          <form onSubmit={handleCreateLead} className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input id="customer_name" name="customer_name" placeholder="ABC Logistics Ltd" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input id="contact_person" name="contact_person" placeholder="John Doe" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border border-dashed">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Primary Email</Label>
                  <Input id="email" name="email" type="email" placeholder="contact@example.com" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Additional Emails</Label>
                  <StringArrayInput values={newAdditionalEmails} onChange={setNewAdditionalEmails} placeholder="Add CC email..." />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Primary Phone</Label>
                  <Input id="phone" name="phone" placeholder="+255..." />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Additional Phones</Label>
                  <StringArrayInput values={newAdditionalPhones} onChange={setNewAdditionalPhones} placeholder="Add phone..." />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin">Origin</Label>
                <Input id="origin" name="origin" placeholder="e.g. Dubai, UAE" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input id="destination" name="destination" placeholder="e.g. Arusha, TZ" required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commodity">Commodity</Label>
                <Input id="commodity" name="commodity" placeholder="e.g. Electronics" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chargeable_weight">Chg. Weight (kg)</Label>
                <Input id="chargeable_weight" name="chargeable_weight" type="number" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cif_value_usd">CIF Value (USD)</Label>
                <Input id="cif_value_usd" name="cif_value_usd" type="number" step="0.01" placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Quoted Rate (USD)</Label>
                <Input id="rate" name="rate" type="number" step="0.01" placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validity">Validity</Label>
                <Input id="validity" name="validity" placeholder="e.g. 30 Days" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo_details">Cargo Description</Label>
              <Textarea id="cargo_details" name="cargo_details" placeholder="What is being shipped? Weight, dimensions, hazmat, etc." rows={2} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" name="remarks" placeholder="Any special instructions or remarks..." rows={2} />
            </div>
            <SheetFooter className="pt-4">
              <Button type="submit" disabled={createLeadMutation.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

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

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">Cargo & Remarks</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-muted/50 rounded-md border text-xs">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Description</p>
                    <p className="italic text-muted-foreground">"{selectedLead.cargo_description}"</p>
                  </div>
                  {selectedLead.remarks && (
                    <div className="p-3 bg-amber-50/50 rounded-md border border-amber-100 text-xs">
                      <p className="text-[9px] uppercase font-bold text-amber-700 mb-1">Special Remarks</p>
                      <p className="text-amber-900">{selectedLead.remarks}</p>
                    </div>
                  )}
                </div>
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

              <div className="pt-6 grid grid-cols-2 gap-3">
                <Button 
                  variant="outline"
                  className="h-11 border-accent text-accent hover:bg-accent/5 font-bold gap-2"
                  onClick={() => {
                    setLeadToEdit(selectedLead);
                    setIsEditModalOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit Details
                </Button>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground h-11 font-bold shadow-lg"
                  onClick={() => navigate('/quotations', { state: { leadId: selectedLead.id } })}
                >
                  Create Quotation
                </Button>
              </div>
              {selectedLead.status !== 'declined' && selectedLead.status !== 'converted' && (
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                    onClick={() => setDeclineLead(selectedLead)}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Decline Lead
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Lead Sheet */}
      <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Update Inquiry Info</SheetTitle>
            <SheetDescription>Modify contact or shipment details for this inquiry.</SheetDescription>
          </SheetHeader>
          {leadToEdit && (
            <form onSubmit={handleUpdateLead} className="space-y-4 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_customer_name">Customer Name</Label>
                  <Input id="edit_customer_name" name="customer_name" defaultValue={leadToEdit.customer_name_raw} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_contact_person">Contact Person</Label>
                  <Input id="edit_contact_person" name="contact_person" defaultValue={leadToEdit.contact_person || ""} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border border-dashed">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_email">Primary Email</Label>
                    <Input id="edit_email" name="email" type="email" defaultValue={leadToEdit.email} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Additional Emails</Label>
                    <StringArrayInput values={editAdditionalEmails} onChange={setEditAdditionalEmails} placeholder="Add CC email..." />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_phone">Primary Phone</Label>
                    <Input id="edit_phone" name="phone" defaultValue={leadToEdit.phone} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Additional Phones</Label>
                    <StringArrayInput values={editAdditionalPhones} onChange={setEditAdditionalPhones} placeholder="Add phone..." />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_origin">Origin</Label>
                  <Input id="edit_origin" name="origin" defaultValue={leadToEdit.origin} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_destination">Destination</Label>
                  <Input id="edit_destination" name="destination" defaultValue={leadToEdit.destination} required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_commodity">Commodity</Label>
                  <Input id="edit_commodity" name="commodity" defaultValue={leadToEdit.commodity || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_chargeable_weight">Chg. Weight (kg)</Label>
                  <Input id="edit_chargeable_weight" name="chargeable_weight" type="number" step="0.01" defaultValue={leadToEdit.chargeable_weight || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_cif_value_usd">CIF Value (USD)</Label>
                  <Input id="edit_cif_value_usd" name="cif_value_usd" type="number" step="0.01" defaultValue={leadToEdit.cif_value_usd || ""} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_rate">Quoted Rate (USD)</Label>
                  <Input id="edit_rate" name="rate" type="number" step="0.01" defaultValue={leadToEdit.rate_usd} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_validity">Validity</Label>
                  <Input id="edit_validity" name="validity" defaultValue={leadToEdit.validity || ""} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_cargo_details">Cargo Description</Label>
                <Textarea id="edit_cargo_details" name="cargo_details" defaultValue={leadToEdit.cargo_description} rows={2} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_remarks">Remarks</Label>
                <Textarea id="edit_remarks" name="remarks" defaultValue={leadToEdit.remarks || ""} rows={2} />
              </div>
              <SheetFooter className="pt-4">
                <Button type="submit" disabled={updateLeadMutation.isPending} className="w-full bg-[#0a1e3f] hover:bg-[#0a1e3f]/90 text-white">
                  {updateLeadMutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <LogInteractionDrawer
        open={!!logInteractionLeadId}
        onOpenChange={(open) => !open && setLogInteractionLeadId(null)}
        leadId={logInteractionLeadId || undefined}
        customerId={leads?.find((l: any) => l.id === logInteractionLeadId)?.customer_id}
      />
      
      {declineLead && (
        <DeclineReasonModal
          open={!!declineLead}
          onOpenChange={(open) => !open && setDeclineLead(null)}
          entityType="lead"
          entityId={declineLead.id}
          customerId={declineLead.customer_id}
          routeOrigin={declineLead.origin}
          routeDestination={declineLead.destination}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            setSelectedLead({ ...declineLead, status: 'declined' });
            setDeclineLead(null);
          }}
        />
      )}
    </div>
  );
}
