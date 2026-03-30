import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Truck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ozmaeLogoImg from "@/assets/ozmae-logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate("/");
    }, 1200);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-primary relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/10" />
        <div className="absolute bottom-20 -right-20 h-72 w-72 rounded-full bg-accent/15" />
        <div className="absolute top-1/2 left-1/3 h-40 w-40 rounded-full bg-accent/5" />

        <div className="relative z-10">
          <img src={ozmaeLogoImg} alt="Ozmae Freight Solutions" className="h-10 brightness-0 invert" />
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl xl:text-5xl font-bold text-primary-foreground leading-tight">
            Moving East Africa<br />
            <span className="text-accent">Forward.</span>
          </h1>
          <p className="text-primary-foreground/60 text-lg max-w-md">
            Manage freight operations, track shipments, and grow your logistics business — all in one place.
          </p>

          {/* Stats row */}
          <div className="flex gap-8 pt-4">
            {[
              { value: "1,200+", label: "Shipments" },
              { value: "6", label: "Countries" },
              { value: "99.2%", label: "On-time" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-accent">{stat.value}</p>
                <p className="text-primary-foreground/50 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-primary-foreground/30 text-sm">
          © 2026 Ozmae Freight Solutions. All rights reserved.
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <img src={ozmaeLogoImg} alt="Ozmae" className="h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-1">Sign in to your Ozmae account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="you@ozmaefreight.co.tz"
                defaultValue="alice@ozmaefreight.co.tz"
                className="h-11 bg-card"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                <button type="button" className="text-xs text-accent hover:underline">Forgot password?</button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  defaultValue="password123"
                  className="h-11 bg-card pr-10"
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
                  Sign In <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button className="text-accent font-medium hover:underline">Contact Admin</button>
          </div>
        </div>
      </div>
    </div>
  );
}
