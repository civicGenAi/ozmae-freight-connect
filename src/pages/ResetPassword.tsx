import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Truck, ArrowRight, Eye, EyeOff, Wand2, ShieldCheck, AlertCircle } from "lucide-react";
import ozmaeLogoImg from "@/assets/ozmae-logo.png";
import { useAuth } from "@/hooks/useAuth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pass: string) => {
    const minLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    
    return {
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
      checks: { minLength, hasUpper, hasLower, hasNumber, hasSpecial }
    };
  };

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0, n = charset.length; i < 12; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    // Ensure it meets requirements by appending if necessary (simplified for UX)
    retVal += "A1!"; 
    setPassword(retVal);
    setConfirmPassword(retVal);
    toast.success("Strong password generated!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { isValid } = validatePassword(password);

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!isValid) {
      toast.error("Password does not meet complexity requirements");
      return;
    }

    setIsLoading(true);

    try {
      // Direct fetch of the current user to avoid reliance on hook state during recovery
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        toast.error("Auth session not found. Please try the reset link again.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        // We use the authUser.id directly from the session
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            password_updated_at: new Date().toISOString(),
            is_using_default_password: false
          })
          .eq("id", authUser.id);

        if (profileError) {
          console.error("Profile security update failed:", profileError);
          toast.error("Account security sync failed. Please contact admin.");
          setIsLoading(false);
          return; // Stop here if we can't clear the default password flag
        }

        toast.success("Security verified. Password updated successfully!");
        
        // Brief delay to ensure database consistency before redirecting to guarded routes
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 500);
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const validation = validatePassword(password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <img src={ozmaeLogoImg} alt="Ozmae" className="h-10 mb-8" />
          <h2 className="text-2xl font-bold text-foreground">Set New Password</h2>
          <p className="text-muted-foreground mt-2">Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Password</label>
              <button 
                type="button" 
                onClick={generatePassword}
                className="text-[9px] font-black uppercase tracking-tighter text-accent hover:text-accent/80 flex items-center gap-1"
              >
                <Wand2 className="h-3 w-3" /> Auto-Generate
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-card pr-10 border-2 focus:border-accent transition-all font-bold"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Checklist */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-xl mt-3 border border-dashed">
               {[
                 { label: "8+ Chars", ok: validation.checks.minLength },
                 { label: "Uppercase", ok: validation.checks.hasUpper },
                 { label: "Lowercase", ok: validation.checks.hasLower },
                 { label: "Number/Special", ok: validation.checks.hasNumber && validation.checks.hasSpecial }
               ].map(check => (
                 <div key={check.label} className={cn(
                   "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight transition-colors",
                   check.ok ? "text-emerald-600" : "text-muted-foreground/50"
                 )}>
                   {check.ok ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                   {check.label}
                 </div>
               ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Confirm Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 bg-card border-2 focus:border-accent transition-all font-bold"
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
                Update Password <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
