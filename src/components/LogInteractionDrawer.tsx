import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, PhoneIncoming, MessageCircle, Mail, MailCheck, Users, MapPin, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useLogInteraction } from "@/hooks/useCrm";
import { useEffect } from "react";

interface LogInteractionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  leadId?: string;
  quotationId?: string;
  jobOrderId?: string;
  onSuccess?: () => void;
}

const interactionTypes = [
  { value: "call_outbound", label: "Outbound Call", icon: Phone },
  { value: "call_inbound", label: "Inbound Call", icon: PhoneIncoming },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email_sent", label: "Email Sent", icon: Mail },
  { value: "email_received", label: "Email Received", icon: MailCheck },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "site_visit", label: "Site Visit", icon: MapPin },
  { value: "note", label: "Internal Note", icon: FileText },
];

const outcomes = [
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "follow_up_required", label: "Follow-up Required" },
  { value: "converted", label: "Converted" },
  { value: "declined", label: "Declined" },
  { value: "no_answer", label: "No Answer" },
  { value: "information_shared", label: "Info Shared" },
  { value: "other", label: "Other" },
];

export function LogInteractionDrawer({
  open,
  onOpenChange,
  customerId,
  leadId,
  quotationId,
  jobOrderId,
  onSuccess
}: LogInteractionDrawerProps) {
  const logMutation = useLogInteraction();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || "");
  const [interactionType, setInteractionType] = useState("call_outbound");
  const [outcome, setOutcome] = useState("follow_up_required");
  const [subject, setSubject] = useState("");

  // Sync customer selection when prop changes (handles both set and reset)
  useEffect(() => {
    setSelectedCustomerId(customerId || "");
  }, [customerId]);

  // Fetch contextual details to automate the Subject
  const { data: contextData } = useQuery({
    queryKey: ["interaction_context", leadId, quotationId],
    queryFn: async () => {
      if (leadId) {
        const { data } = await supabase.from("leads").select("origin, destination, cargo_description, customer_name_raw").eq("id", leadId).single();
        return { type: 'lead', details: data };
      }
      if (quotationId) {
        const { data } = await supabase.from("quotations").select("quote_number, origin, destination").eq("id", quotationId).single();
        return { type: 'quote', details: data };
      }
      return null;
    },
    enabled: !!leadId || !!quotationId
  });

  // Automate Subject pre-filling
  useEffect(() => {
    if (contextData?.type === 'lead' && contextData.details) {
      const details = contextData.details as any;
      setSubject(`Follow-up: ${details.origin} -> ${details.destination} (${details.cargo_description || 'General Cargo'})`);
    } else if (contextData?.type === 'quote' && contextData.details) {
      const details = contextData.details as any;
      setSubject(`Quote Follow-up: ${details.quote_number} (${details.origin} to ${details.destination})`);
    } else {
      setSubject("");
    }
  }, [contextData]);

  const { data: customers, isLoading: isLoadingCustomers, error: customersError } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {

      const { data, error } = await supabase.from("customers").select("id, company_name").order("company_name");
      if (error) {
        console.error("Error fetching customers:", error);
        throw error;
      }
      return data || [];
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    logMutation.mutate({
       customer_id: selectedCustomerId === "raw_lead" ? null : selectedCustomerId,
       lead_id: leadId || null,
       quotation_id: quotationId || null,
       job_order_id: jobOrderId || null,
       interaction_type: interactionType,
       subject: subject,
       summary: formData.get("summary"),
       outcome: outcome,
       next_action: formData.get("next_action"),
       next_action_date: formData.get("next_action_date"),
       duration_minutes: formData.get("duration_minutes") ? parseInt(formData.get("duration_minutes") as string) : null,
     }, {
       onSuccess: () => {
         onOpenChange(false);
         setSubject(""); // Reset for next time
         if (onSuccess) onSuccess();
       }
     });
   };

  const showDuration = ["call_outbound", "call_inbound", "meeting"].includes(interactionType);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent key={`${leadId}-${customerId}-${quotationId}`} className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log Interaction</SheetTitle>
          <SheetDescription>Record a communication or note for this customer.</SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-6">
           <div className="space-y-2">
            <Label>Customer</Label>
            <Select 
              value={selectedCustomerId} 
              onValueChange={setSelectedCustomerId} 
              required
            >
              <SelectTrigger disabled={!!customerId} className="bg-muted/30">
                <SelectValue placeholder={isLoadingCustomers ? "Syncing customers..." : "Choose a customer"} />
              </SelectTrigger>
              <SelectContent>
                {/* Fallback for Lead: Allow logging even if they aren't a 'Customer' yet */}
                {contextData?.type === 'lead' && !customerId && (
                  <SelectItem value="raw_lead" className="font-medium text-accent border-b pb-2 mb-2">
                    <div className="flex flex-col">
                      <span>{(contextData.details as any).customer_name_raw || 'Unnamed Lead'}</span>
                      <span className="text-[10px] text-muted-foreground font-normal italic">Current Lead (Unregistered)</span>
                    </div>
                  </SelectItem>
                )}
                
                {customers?.length === 0 && !isLoadingCustomers && !leadId && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No registered customers found.
                  </div>
                )}
                
                {customers?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customersError && <p className="text-[10px] text-destructive">Connection issue: Unable to load customer list.</p>}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={interactionType} onValueChange={setInteractionType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select interaction type" />
              </SelectTrigger>
              <SelectContent>
                {interactionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2 text-sm">
                      <type.icon className="h-4 w-4 text-muted-foreground" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input 
              id="subject" 
              name="subject" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Follow-up on QTE-2041 pricing" 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea 
              id="summary" 
              name="summary" 
              placeholder="What was discussed? What did the customer say? Key decisions made?" 
              rows={4} 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {outcomes.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {showDuration && (
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Duration (mins)</Label>
                <Input id="duration_minutes" name="duration_minutes" type="number" min="1" placeholder="15" />
              </div>
            )}
          </div>

          {outcome === "follow_up_required" && (
            <div className="bg-accent/5 p-4 rounded-xl border border-accent/10 space-y-4 mt-2">
              <div className="space-y-2">
                <Label className="text-accent-foreground font-semibold">Next Action</Label>
                <Input name="next_action" placeholder="e.g. Call to finalize quote" required={outcome === "follow_up_required"} />
              </div>
              <div className="space-y-2">
                <Label className="text-accent-foreground font-semibold">Due Date</Label>
                <Input name="next_action_date" type="date" required={outcome === "follow_up_required"} />
              </div>
              <p className="text-[10px] text-muted-foreground italic">A follow-up task will be automatically created and assigned to you.</p>
            </div>
          )}

          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={logMutation.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {logMutation.isPending ? "Logging..." : "Save Interaction"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
