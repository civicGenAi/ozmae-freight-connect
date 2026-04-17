import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Truck, ArrowRight, MessageCircle, Mail, TrendingUp, Globe, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ozmaeLogoImg from "@/assets/ozmae-logo.png";
import React from "react";
import { LogisticsLoader } from "@/components/LogisticsLoader";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const SLIDES = [
  {
    id: 1,
    title: "Moving East Africa Forward",
    subtitle: "Scaling logistics infrastructure across 6+ nations with digital precision.",
    icon: Globe,
    chartType: "bar",
    data: [
      { name: "TZ", value: 450 },
      { name: "KE", value: 780 },
      { name: "UG", value: 620 },
      { name: "RW", value: 1200 },
    ]
  },
  {
    id: 2,
    title: "Intelligent Freight Routing",
    subtitle: "Real-time AI analytics optimizing every mile of the logistics journey.",
    icon: TrendingUp,
    chartType: "pie",
    data: [
      { name: "On-Time", value: 99.2 },
      { name: "Transit", value: 0.8 },
    ]
  },
  {
    id: 3,
    title: "Seamless Financial Control",
    subtitle: "Transparent auditing and automated cost management for global trade.",
    icon: ShieldCheck,
    chartType: "bar",
    data: [
      { name: "Audits", value: 2400 },
      { name: "Savings", value: 3100 },
      { name: "Accuracy", value: 9800 },
      { name: "Volume", value: 1500 },
    ]
  }
];

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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

      // Check account is active
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_active")
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
        } catch (_e2) { /* silent */ }
      }

      // Log the sign-in event
      await supabase.from("security_logs").insert({
        user_id: data.user.id,
        event_type: "login_success",
        details: { method: "password" },
        ip_address: ip
      });

      // Record session
      await supabase.from("user_sessions").insert({
        user_id: data.user.id,
        ip_address: ip,
        user_agent: navigator.userAgent
      });

      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
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
      <AnimatePresence>
        {isLoading && <LogisticsLoader message="Authenticating Credentials..." />}
      </AnimatePresence>
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float-1 { animation: float-slow 4s ease-in-out infinite; }
      `}</style>

      {/* Left — branding panel with creative moving SVGs */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#0f1d35] relative overflow-hidden flex-col justify-between p-12 lg:p-16 text-white">

        {/* Animated Background SVGs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#F26B2A', stopOpacity: 0.1 }} />
                <stop offset="100%" style={{ stopColor: '#FF925E', stopOpacity: 0.8 }} />
              </linearGradient>
            </defs>
            <g>
              {[10, 30, 50, 70, 90].map(x => (
                <line key={`x-${x}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              ))}
              {[20, 40, 60, 80].map(y => (
                <line key={`y-${y}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              ))}
            </g>
          </svg>
        </div>

        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F26B2A] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#FF925E] rounded-full mix-blend-screen filter blur-[150px] opacity-10" />

        <div className="relative z-10 flex items-center gap-3 transition-transform hover:scale-105 duration-300">
          <img src={ozmaeLogoImg} alt="Ozmae Freight Solutions" className="h-10 lg:h-12 w-auto object-contain brightness-0 invert drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
        </div>

        <div className="relative z-10 w-full max-w-lg mt-12 flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  {React.createElement(SLIDES[currentSlide].icon, { className: "w-4 h-4 text-[#F26B2A]" })}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#F26B2A]">
                    Logistics 4.0
                  </span>
                </div>
                
                <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
                  {SLIDES[currentSlide].title.split(' ').map((word, i, arr) => (
                    <span key={i}>
                      {i === arr.length - 1 ? (
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F26B2A] to-[#FF925E]">
                          {word}
                        </span>
                      ) : (
                        word + ' '
                      )}
                    </span>
                  ))}
                </h1>
                
                <p className="text-white/70 text-lg leading-relaxed font-medium">
                  {SLIDES[currentSlide].subtitle}
                </p>
              </div>

              {/* Chart Visualization */}
              <div className="h-72 w-full bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-xl relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F26B2A]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <ResponsiveContainer width="100%" height="100%">
                  {SLIDES[currentSlide].chartType === "bar" ? (
                    <BarChart data={SLIDES[currentSlide].data}>
                      <XAxis dataKey="name" hide />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#0f1d35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#F26B2A" 
                        radius={[6, 6, 0, 0]} 
                        animationDuration={1500}
                      />
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={SLIDES[currentSlide].data}
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        animationDuration={1500}
                        stroke="none"
                      >
                        {SLIDES[currentSlide].data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? "#F26B2A" : "rgba(255,255,255,0.1)"} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f1d35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  )}
                </ResponsiveContainer>

                {SLIDES[currentSlide].chartType === "pie" && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-3xl font-black text-white">99.2%</p>
                    <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest leading-none">On-Time</p>
                  </div>
                )}
              </div>

              {/* Slide Indicators */}
              <div className="flex gap-2">
                {SLIDES.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      i === currentSlide ? "w-8 bg-[#F26B2A]" : "w-1.5 bg-white/20"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="relative z-10 text-white/30 text-xs font-medium tracking-wide">
          © {new Date().getFullYear()} Ozmae Freight Solutions. All rights reserved.
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 bg-white relative overflow-hidden">
        
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
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 bg-background rounded-full animate-bounce" />
                   <div className="h-2 w-2 bg-background rounded-full animate-bounce [animation-delay:0.2s]" />
                   <div className="h-2 w-2 bg-background rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
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
