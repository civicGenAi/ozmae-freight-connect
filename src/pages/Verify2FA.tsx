import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, ArrowRight, LogOut, KeyRound } from "lucide-react";
import ozmaeLogoImg from "@/assets/ozmae-logo.png";
import { cn } from "@/lib/utils";

export default function Verify2FA() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If already at AAL2, no need to verify again — go straight to dashboard
  useEffect(() => {
    (async () => {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal2") {
        navigate("/", { replace: true });
      }
    })();
  }, [navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Please enter a complete 6-digit code.");
      return;
    }
    setIsLoading(true);

    try {
      // 1. List factors and find verified TOTP
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors.all.find(
        (f) => f.factor_type === "totp" && f.status === "verified"
      );

      if (!totpFactor) {
        toast.error("No active 2FA factor found. Please set up 2FA again from your account settings.");
        await supabase.auth.signOut();
        navigate("/login");
        return;
      }

      // 2. Challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeError) throw challengeError;

      // 3. Verify
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        toast.error("Invalid code. Please check your authenticator app and try again.");
        setCode("");
        return;
      }

      // 4. Log the successful 2FA verification
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("security_logs").insert({
          user_id: user.id,
          event_type: "login_success",
          details: { method: "totp_2fa" },
        });
      }

      toast.success("Identity verified. Welcome back!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to verify code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setCode(val);
    // Auto-submit when 6 digits entered
    if (val.length === 6) {
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
      setTimeout(() => handleVerify(syntheticEvent), 100);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1d35] p-6">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center text-center space-y-4">
          <img src={ozmaeLogoImg} alt="Ozmae" className="h-10" />
          <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Verify Your Identity</h2>
            <p className="text-slate-400 mt-1 text-sm leading-relaxed">
              Enter the 6-digit code from your<br className="hidden sm:block" />
              Google Authenticator or Authy app.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-6 backdrop-blur-sm">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <div className="relative flex items-center justify-center">
                <KeyRound className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="000000"
                  value={code}
                  onChange={handleCodeChange}
                  className={cn(
                    "h-16 text-center text-3xl tracking-[0.75em] font-black rounded-xl pl-12",
                    "bg-white/5 border-white/10 text-white placeholder:text-slate-600",
                    "focus:border-accent/50 focus:ring-accent/20"
                  )}
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 text-center font-medium">
                Auto-submits when all 6 digits are entered
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-accent/20"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                <>Confirm Access <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center"><span className="bg-transparent text-[10px] text-slate-500 px-2 uppercase tracking-widest">or</span></div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-slate-400 hover:text-white hover:bg-white/5 gap-2 text-xs font-bold uppercase tracking-widest"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}
          >
            <LogOut className="h-3.5 w-3.5" /> Cancel & Sign Out
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-center text-[10px] text-slate-600 leading-relaxed">
          Lost access to your authenticator app?<br />
          Contact your system administrator for a reset.
        </p>
      </div>
    </div>
  );
}
