import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface DeclineReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'lead' | 'quotation';
  entityId: string;
  customerId: string;
  routeOrigin?: string;
  routeDestination?: string;
  dealValue?: number;
  onSuccess: () => void;
}

const reasonsMap = [
  { value: "price_too_high", label: "Price was too high" },
  { value: "chose_competitor", label: "Customer chose a competitor" },
  { value: "no_longer_needed", label: "Customer no longer needs this service" },
  { value: "timing", label: "Timing / scheduling mismatch" },
  { value: "service_mismatch", label: "We couldn't offer the required service" },
  { value: "bad_experience", label: "Previous bad experience with Ozmae" },
  { value: "other", label: "Other" },
];

export function DeclineReasonModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  customerId,
  routeOrigin,
  routeDestination,
  dealValue,
  onSuccess
}: DeclineReasonModalProps) {
  const [reasonCategory, setReasonCategory] = useState("");
  
  const submitDecline = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        lead_id: entityType === 'lead' ? entityId : null,
        quotation_id: entityType === 'quotation' ? entityId : null,
        customer_id: customerId,
        reason_category: reasonCategory,
        competitor_name: formData.get("competitor") || null,
        details: formData.get("details") || null,
        route_origin: routeOrigin || null,
        route_destination: routeDestination || null,
        deal_value_usd: dealValue || null,
        logged_by: user?.id
      };

      const { error: insertError } = await supabase.from("decline_reasons").insert(payload);
      if (insertError) throw insertError;

      // Update the target entity immediately to declined
      const table = entityType === 'lead' ? 'leads' : 'quotations';
      const { error: updateError } = await supabase
        .from(table)
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq("id", entityId);
        
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
      toast.success("Decline recorded contextually");
    },
    onError: (err: any) => {
      toast.error("Failed to record decline: " + err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitDecline.mutate(new FormData(e.currentTarget));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Reason for Rejection</DialogTitle>
          </div>
          <DialogDescription>
            You are about to decline this {entityType}. Please record why so we can improve our services.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-foreground font-semibold">Primary Reason <span className="text-destructive">*</span></Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasonsMap.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reasonCategory === "chose_competitor" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="competitor" className="text-foreground font-semibold">Competitor Name</Label>
              <Input id="competitor" name="competitor" placeholder="Who won the business?" required />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="details" className="text-foreground font-semibold">Additional Details (Optional)</Label>
            <Textarea 
              id="details" 
              name="details" 
              placeholder="Any extra context about why this was declined?" 
              rows={3} 
            />
          </div>

          <DialogFooter className="pt-4 border-t mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitDecline.isPending || !reasonCategory} variant="destructive">
              {submitDecline.isPending ? "Recording..." : `Decline ${entityType === 'lead' ? 'Lead' : 'Quotation'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
