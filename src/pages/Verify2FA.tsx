import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Truck, ArrowRight } from "lucide-react";
import ozmaeLogoImg from "@/assets/ozmae-logo.png";

export default function Verify2FA() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
      if (!totpFactor) {
        toast.error("No verified 2FA factor found. Please contact support.");
        return;
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError) throw challengeError;

      const { error } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (error) {
        toast.error("Invalid 2FA code. Please try again.");
      } else {
        toast.success("Identity verified");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to verify code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <img src={ozmaeLogoImg} alt="Ozmae" className="h-10 mb-8" />
          <h2 className="text-2xl font-bold text-foreground">Two-Factor Authentication</h2>
          <p className="text-muted-foreground mt-2">Enter the 6-digit code from your authenticator app.</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-14 text-center text-2xl tracking-[0.5em] font-bold"
              maxLength={6}
              autoFocus
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2"
          >
            {isLoading ? (
              <Truck className="h-4 w-4 animate-bounce" />
            ) : (
              <>
                Verify Code <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}
          >
            Cancel and Sign Out
          </Button>
        </form>
      </div>
    </div>
  );
}
