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

  const { data: customers } = useQuery({
    queryKey: ["customers_list"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, company_name").order("company_name");
      return data || [];
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    logMutation.mutate({
      customer_id: selectedCustomerId,
      lead_id: leadId || null,
      quotation_id: quotationId || null,
      job_order_id: jobOrderId || null,
      interaction_type: interactionType,
      subject: formData.get("subject"),
      summary: formData.get("summary"),
      outcome: outcome,
      next_action: formData.get("next_action"),
      next_action_date: formData.get("next_action_date"),
      duration_minutes: formData.get("duration_minutes") ? parseInt(formData.get("duration_minutes") as string) : null,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    });
  };

  const showDuration = ["call_outbound", "call_inbound", "meeting"].includes(interactionType);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log Interaction</SheetTitle>
          <SheetDescription>Record a communication or note for this customer.</SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-6">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} required={!customerId}>
              <SelectTrigger disabled={!!customerId} className="bg-muted/30">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Input id="subject" name="subject" placeholder="e.g. Follow-up on QTE-2041 pricing" required />
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
