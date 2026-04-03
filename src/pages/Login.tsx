import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Truck, ArrowRight, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ozmaeLogoImg from "@/assets/ozmae-logo.png";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message === "Invalid login credentials" ? "Invalid email or password" : error.message);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_active, totp_enabled")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        toast.error("Error fetching user profile");
        await supabase.auth.signOut();
        return;
      }

      if (!profile.is_active) {
        toast.error("Your account has been deactivated. Contact your administrator.");
        await supabase.auth.signOut();
        return;
      }

      // Get IP Address
      let ip = "Unknown";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ip = ipData.ip;
      } catch (e) {
        try {
          const ipRes2 = await fetch("https://worldtimeapi.org/api/ip");
          const ipData2 = await ipRes2.json();
          ip = ipData2.client_ip;
        } catch (e2) {
          console.error("IP capture failed", e2);
        }
      }

      // Log success with IP
      await supabase.from("security_logs").insert({
        user_id: data.user.id,
        event_type: "login_success",
        details: { method: "password" },
        ip_address: ip
      });

      // Record Session
      await supabase.from("user_sessions").insert({
        user_id: data.user.id,
        ip_address: ip,
        user_agent: navigator.userAgent
      });

      if (profile.totp_enabled) {
        navigate("/verify-2fa");
      } else {
        navigate("/");
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex selection:bg-accent/20">
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float-1 { animation: float-slow 4s ease-in-out infinite; }
        .animate-float-2 { animation: float-slow 4.5s ease-in-out infinite 1s; }
        .animate-float-3 { animation: float-slow 5s ease-in-out infinite 2s; }
      `}</style>

      {/* Left — branding panel with creative moving SVGs using True Brand Colors */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#0f1d35] relative overflow-hidden flex-col justify-between p-12 lg:p-16">

        {/* Animated Background SVGs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#F26B2A', stopOpacity: 0.1 }} />
                <stop offset="100%" style={{ stopColor: '#FF925E', stopOpacity: 0.8 }} />
              </linearGradient>
            </defs>

            {/* Moving Grid Lines */}
            <g>
              <line x1="10%" y1="0" x2="10%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="30%" y1="0" x2="30%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="70%" y1="0" x2="70%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="90%" y1="0" x2="90%" y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

              <line x1="0" y1="20%" x2="100%" y2="20%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="40%" x2="100%" y2="40%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="60%" x2="100%" y2="60%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="80%" x2="100%" y2="80%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </g>

            {/* Glowing nodes & connecting lines */}
            <circle cx="30%" cy="40%" r="4" fill="#F26B2A">
              <animate attributeName="r" values="4;8;4" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="70%" cy="20%" r="6" fill="#F26B2A">
              <animate attributeName="r" values="6;10;6" dur="4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="50%" cy="80%" r="5" fill="#FF925E">
              <animate attributeName="r" values="5;9;5" dur="3.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3.5s" repeatCount="indefinite" />
            </circle>

            <path d="M 30% 40% L 70% 20%" stroke="url(#brandGrad)" strokeWidth="2" strokeDasharray="10 5" fill="none">
              <animate attributeName="stroke-dashoffset" from="15" to="0" dur="2s" repeatCount="indefinite" />
            </path>
            <path d="M 30% 40% L 50% 80%" stroke="url(#brandGrad)" strokeWidth="2" strokeDasharray="10 5" fill="none">
              <animate attributeName="stroke-dashoffset" from="15" to="0" dur="3s" repeatCount="indefinite" />
            </path>
            <path d="M 70% 20% L 50% 80%" stroke="url(#brandGrad)" strokeWidth="2" strokeDasharray="10 5" fill="none">
              <animate attributeName="stroke-dashoffset" from="15" to="0" dur="2.5s" repeatCount="indefinite" />
            </path>

            {/* Moving Freight Box Simulation */}
            <rect x="0" y="38%" width="12" height="12" fill="#F26B2A" rx="2">
              <animate attributeName="x" from="30%" to="70%" dur="8s" repeatCount="indefinite" />
              <animate attributeName="y" from="40%" to="20%" dur="8s" repeatCount="indefinite" />
            </rect>
            <rect x="0" y="0" width="10" height="10" fill="#FF925E" rx="2">
              <animate attributeName="x" from="70%" to="50%" dur="7s" repeatCount="indefinite" />
              <animate attributeName="y" from="20%" to="80%" dur="7s" repeatCount="indefinite" />
            </rect>
          </svg>
        </div>

        {/* Big decorative glow spots */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F26B2A] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#FF925E] rounded-full mix-blend-screen filter blur-[150px] opacity-10" />

        <div className="relative z-10 flex items-center gap-3 transition-transform hover:scale-105 duration-300">
          <img src={ozmaeLogoImg} alt="Ozmae Freight Solutions" className="h-10 lg:h-12 w-auto object-contain brightness-0 invert drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
        </div>

        <div className="relative z-10 space-y-6 max-w-lg mt-12">
          <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
            Moving East Africa <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F26B2A] to-[#FF925E]">
              Forward.
            </span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed font-medium">
            Architecting the future of freight with real-time operations, intelligent routing, and seamless financial control.
          </p>

          <div className="flex gap-10 pt-8 mt-8 border-t border-white/10">
            {[
              { value: "1,200+", label: "Shipments", animClass: "animate-float-1" },
              { value: "6", label: "Countries", animClass: "animate-float-2" },
              { value: "99.2%", label: "On-time", animClass: "animate-float-3" },
            ].map((stat) => (
              <div key={stat.label} className={cn("flex flex-col gap-1 transition-all hover:scale-110 cursor-pointer", stat.animClass)}>
                <p className="text-3xl font-black text-white drop-shadow-[0_2px_15px_rgba(242,107,42,0.4)]">{stat.value}</p>
                <p className="text-white/60 text-xs uppercase tracking-[0.2em] font-bold group-hover:text-[#F26B2A] transition-colors">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/30 text-xs font-medium tracking-wide">
          © {new Date().getFullYear()} Ozmae Freight Solutions. All rights reserved.
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 bg-white relative overflow-hidden">
        
        {/* Subtle background watermark */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] mix-blend-multiply">
          <img src={ozmaeLogoImg} alt="Watermark" className="w-[80%] max-w-[800px] object-contain rotate-[-5deg] grayscale" />
        </div>

        <div className="w-full max-w-[400px] space-y-10 relative z-10">
          
          <div className="flex items-center justify-center mb-10 w-full group">
              <img src={ozmaeLogoImg} alt="Ozmae" className="h-14 sm:h-16 w-auto object-contain transition-transform group-hover:scale-105 duration-300 drop-shadow-sm" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-foreground tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground text-sm font-medium">Access your global logistics dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Corporate Email</label>
              <Input
                type="email"
                placeholder="you@ozmaefreight.co.tz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-muted/40 border-muted focus-visible:ring-accent/30 text-base rounded-xl transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Secure Password</label>
              <div className="relative group">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-muted/40 border-muted focus-visible:ring-accent/30 pr-12 text-base font-medium font-mono rounded-xl transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background font-bold text-sm tracking-wide rounded-xl gap-2 shadow-xl shadow-foreground/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <Truck className="h-4 w-4 animate-bounce" />
              ) : (
                <>
                  Sign In to Workforce <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-6 border-t border-border flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Don't have an account?
            </p>

            <Popover>
              <PopoverTrigger asChild>
                <button className="text-sm font-bold text-foreground hover:text-accent transition-colors underline underline-offset-4 decoration-muted hover:decoration-accent/50 outline-none">
                  Request Access from Admin
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 rounded-2xl overflow-hidden shadow-2xl border-muted" align="center" sideOffset={12}>
                <div className="bg-muted/30 p-4 border-b">
                  <h4 className="font-bold text-foreground text-sm">Contact Support</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Reach out via these channels to get your account provisioned.</p>
                </div>
                <div className="p-2 space-y-1">
                  <a href="https://wa.me/255673045414" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 text-emerald-700 transition-colors group">
                    <div className="bg-emerald-100 p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider">WhatsApp HQ</span>
                      <span className="text-sm font-medium">+255 673 045 414</span>
                    </div>
                  </a>
                  <a href="mailto:info@ozmaelogistics.com" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-blue-700 transition-colors group">
                    <div className="bg-blue-100 p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider">Email Access</span>
                      <span className="text-sm font-medium">support@ozmaelogistics.com</span>
                    </div>
                  </a>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
