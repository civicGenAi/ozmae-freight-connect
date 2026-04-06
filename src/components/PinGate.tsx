import { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PinGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pinHash: string;
}

export function PinGate({ open, onOpenChange, onSuccess, pinHash }: PinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simple SHA-256 hashing for the browser
  const hashPin = async (val: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(val);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) return;

    const hashed = await hashPin(pin);
    if (hashed === pinHash) {
      setSuccess(true);
      setError(false);
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setPin("");
        setSuccess(false);
      }, 800);
    } else {
      setError(true);
      setPin("");
      toast.error("Incorrect Security PIN");
      // Shake animation effect could be added here
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  // Ensure focus when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) setPin(""); onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white">
        <div className={cn(
          "h-32 flex flex-col items-center justify-center transition-colors duration-500 relative overflow-hidden",
          success ? "bg-emerald-500" : error ? "bg-rose-500" : "bg-slate-900"
        )}>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-2xl" />
          
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md shadow-lg border border-white/20">
            {success ? (
               <ShieldCheck className="h-8 w-8 text-white animate-bounce" />
            ) : error ? (
               <AlertCircle className="h-8 w-8 text-white animate-pulse" />
            ) : (
               <Lock className="h-8 w-8 text-white" />
            )}
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
              {success ? "Access Granted" : "Security Lock"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium leading-relaxed">
              {success ? "Verification successful. Redirecting..." : "Please enter the 4-digit company security PIN to continue."}
            </DialogDescription>
          </div>

          <div 
            className="relative group flex justify-center gap-3 cursor-text py-2"
            onClick={() => inputRef.current?.focus()}
          >
             {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all duration-300",
                    pin[i] ? "border-slate-900 bg-slate-50 text-slate-900 shadow-md" : "border-slate-100 bg-white text-slate-200",
                    error && "border-rose-500 text-rose-500",
                    success && "border-emerald-500 text-emerald-500"
                  )}
                >
                  {pin[i] ? "•" : ""}
                </div>
             ))}

            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="absolute opacity-0 inset-0 w-full h-full cursor-pointer z-10"
              autoFocus
              disabled={success}
            />
          </div>

          <form onSubmit={handleSubmit} className="hidden">
            <button type="submit" />
          </form>

          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 hover:bg-slate-50"
          >
            Cancel and Return
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
