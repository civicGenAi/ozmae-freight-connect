import { ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PinGate } from "./PinGate";
import { Button } from "./ui/button";
import { Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { LogisticsLoader } from "./LogisticsLoader";

const SESSION_KEY = "ozmae_vault_unlocked";

/**
 * Gates sensitive areas behind the company's 4-digit vault PIN (stored hashed in
 * company_profile.resource_pin_hash). Once entered correctly the area stays
 * unlocked for the rest of the browser session.
 *
 * If no PIN is configured yet, access is allowed but a prompt to set one up in
 * My Account is shown so admins aren't locked out before configuring it.
 */
export function VaultGuard({ children, title = "Protected Vault" }: { children: ReactNode; title?: string }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [gateOpen, setGateOpen] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ["vault_company_pin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_profile")
        .select("resource_pin_enabled, resource_pin_hash")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <LogisticsLoader message="Securing vault..." />;

  const pinConfigured = !!(company?.resource_pin_enabled && company?.resource_pin_hash);

  // Already unlocked, or no PIN set up yet → show content (with a setup nudge).
  if (unlocked || !pinConfigured) {
    if (!pinConfigured) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-amber-600" />
              <p className="text-[11px] font-bold text-amber-800">
                This is a sensitive area. Set up a vault PIN to protect it.
              </p>
            </div>
            <Link to="/settings/profile">
              <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest border-amber-300 text-amber-700 hover:bg-amber-100 gap-1">
                Set up PIN <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {children}
        </div>
      );
    }
    return <>{children}</>;
  }

  // Locked screen
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg mb-6">
        <Lock className="h-8 w-8 text-accent" />
      </div>
      <h2 className="text-xl font-black uppercase tracking-tight text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground font-medium max-w-sm mt-2">
        This area holds sensitive information. Enter the company security PIN to continue — even administrators must unlock it.
      </p>
      <Button onClick={() => setGateOpen(true)} className="mt-6 bg-accent hover:bg-accent/90 text-accent-foreground gap-2 h-11 px-8 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-accent/20">
        <ShieldCheck className="h-4 w-4" /> Unlock Vault
      </Button>

      <PinGate
        open={gateOpen}
        onOpenChange={setGateOpen}
        pinHash={company!.resource_pin_hash}
        onSuccess={() => {
          setUnlocked(true);
          sessionStorage.setItem(SESSION_KEY, "1");
        }}
      />
    </div>
  );
}
