import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
const WARNING_BEFORE = 5 * 60 * 1000; // 5 minutes

// Pages that don't require AAL2 check (the 2FA gate itself)
const MFA_EXEMPT_PATHS = ["/verify-2fa", "/login", "/reset-password"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. No session → send to login
      if (!session) {
        if (location.pathname !== "/login" && location.pathname !== "/reset-password") {
          navigate("/login");
        }
        setIsLoading(false);
        return;
      }

      // 2. Session exists → check MFA assurance level
      // Only enforce on protected pages (not /verify-2fa itself)
      if (!MFA_EXEMPT_PATHS.includes(location.pathname)) {
        try {
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (
            aalData &&
            aalData.currentLevel === "aal1" &&
            aalData.nextLevel === "aal2"
          ) {
            // User has a verified MFA factor but hasn't completed it for this session
            navigate("/verify-2fa");
            setIsLoading(false);
            return;
          }
        } catch (_e) {
          // Non-critical: if MFA check fails, allow through (Supabase handles this server-side too)
        }
      }

      setIsLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Activity tracking
  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      localStorage.setItem("lastActivity", now.toString());
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
    };
  }, []);

  // Inactivity check
  useEffect(() => {
    const interval = setInterval(async () => {
      const last = parseInt(localStorage.getItem("lastActivity") || Date.now().toString());
      const now = Date.now();
      const diff = now - last;

      if (diff >= INACTIVITY_TIMEOUT) {
        await supabase.auth.signOut();
        toast.info("Session expired due to inactivity.");
        navigate("/login");
      } else if (diff >= INACTIVITY_TIMEOUT - WARNING_BEFORE) {
        toast.warning("Your session will expire in 5 minutes. Click to stay logged in.");
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
