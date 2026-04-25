import React, { useState } from "react";
import { Search, MapPin, Truck, ChevronRight, Clock, CheckCircle2, ShieldCheck, Box, Package, User, Smartphone, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const stages = [
  "planning",
  "approved",
  "awaiting_deposit",
  "deposit_confirmed",
  "dispatched",
  "picked_up",
  "in_transit",
  "at_destination",
  "delivered",
  "closed"
] as const;

export default function PublicTracking() {
  const [accessCode, setAccessCode] = useState("");
  const [validatedCode, setValidatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ["public_job", validatedCode],
    queryFn: async () => {
      if (!validatedCode) return null;
      
      // We search by the short ID (first segment of UUID)
      const { data, error } = await supabase
        .from("job_orders")
        .select(`
          *,
          customer:customers(company_name),
          vehicle:vehicles(plate_number),
          driver:drivers(full_name)
        `)
        .ilike('id', `${validatedCode}%`)
        .single();

      if (error) {
        setError("Invalid access code or shipment not found.");
        throw error;
      }
      
      // Fetch progress reports
      const { data: reports } = await supabase
        .from("job_progress_reports")
        .select("*")
        .eq("job_order_id", data.id)
        .order("created_at", { ascending: false });

      return { ...data, reports: reports || [] };
    },
    enabled: !!validatedCode,
    retry: false
  });

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.length < 4) {
      setError("Please enter a valid 6-character access code.");
      return;
    }
    setError(null);
    setValidatedCode(accessCode.toLowerCase());
  };

  if (!validatedCode || isError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
             <div className="h-16 w-16 bg-accent rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-accent/40 ring-8 ring-accent/10">
                <Smartphone className="h-8 w-8 text-white" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">OZMAE TRACK</h1>
             <p className="text-slate-500 font-medium text-sm">Real-time Logistics Command Portal</p>
          </div>

          <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
            <CardHeader className="bg-slate-900 text-white p-8">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent" />
                Secure Access
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium">Verify your shipment tracking code</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleValidate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tracking Access Code</label>
                  <Input 
                    placeholder="e.g. 8B92D1" 
                    className="h-14 bg-slate-50 border-slate-100 rounded-2xl text-center text-xl font-black uppercase tracking-[0.5em] focus:ring-accent focus:border-accent"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                  />
                </div>
                {error && (
                  <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} className="text-xs font-bold text-rose-500 text-center bg-rose-50 p-3 rounded-xl border border-rose-100">
                    {error}
                  </motion.p>
                )}
                <button 
                  type="submit"
                  className="w-full h-14 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-accent/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                  Locate Shipment
                </button>
              </form>
            </CardContent>
          </Card>
          
          <p className="mt-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Don't have a code? Contact Ozmae Operations support.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 lg:p-20">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
           <div>
              <div className="flex items-center gap-2 mb-2">
                 <button 
                    onClick={() => setValidatedCode(null)}
                    className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-accent hover:text-white transition-all"
                 >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                 </button>
                 <span className="text-[10px] font-black bg-accent/10 text-accent px-3 py-1 rounded-full uppercase tracking-widest">Live Shipment Data</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic underline decoration-accent decoration-4 underline-offset-8">
                {job.customer?.company_name || "Active Shipment"}
              </h1>
           </div>
           <div className="bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                 <Box className="h-5 w-5" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shipment ID</p>
                 <p className="font-mono font-bold text-slate-900 uppercase tracking-tighter">#{job.id.split('-')[0]}</p>
              </div>
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Left Column: Route & Status */}
           <div className="lg:col-span-4 space-y-6">
              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                <CardHeader className="bg-accent p-6 text-white">
                   <CardTitle className="text-xs uppercase tracking-[0.2em] font-black opacity-80">Route Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8 bg-white">
                   <div className="relative pl-8 space-y-12 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                      <div className="relative">
                         <div className="absolute -left-8 top-0 h-6 w-6 rounded-full bg-white border-2 border-accent flex items-center justify-center z-10">
                            <MapPin className="h-3 w-3 text-accent" />
                         </div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Origin Point</p>
                         <p className="text-lg font-bold text-slate-900">{job.origin}</p>
                      </div>
                      <div className="relative">
                         <div className="absolute -left-8 top-0 h-6 w-6 rounded-full bg-accent flex items-center justify-center z-10 shadow-lg shadow-accent/30">
                            <Truck className="h-3 w-3 text-white" />
                         </div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Destination Point</p>
                         <p className="text-lg font-bold text-slate-900">{job.destination}</p>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-slate-50">
                      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                         <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Status</p>
                            <p className="text-sm font-black text-accent uppercase tracking-tight">{job.status.replace(/_/g, ' ')}</p>
                         </div>
                         <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <Loader2 className={cn("h-5 w-5 text-accent", job.status !== 'delivered' && "animate-spin")} />
                         </div>
                      </div>
                   </div>
                </CardContent>
              </Card>

              {/* Resource Preview */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-3">
                    <div className="h-9 w-9 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                       <User className="h-4 w-4" />
                    </div>
                    <div>
                       <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Personnel</p>
                       <p className="text-xs font-bold text-slate-900">{job.driver?.full_name || "Assigned"}</p>
                    </div>
                 </div>
                 <div className="bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-3">
                    <div className="h-9 w-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500">
                       <Truck className="h-4 w-4" />
                    </div>
                    <div>
                       <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Vehicle</p>
                       <p className="text-xs font-mono font-bold text-slate-900">{job.vehicle?.plate_number || "Active"}</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Column: Live Timeline */}
           <div className="lg:col-span-8">
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border p-8 md:p-12 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                       <History className="h-3 w-3" /> Continuous Timeline
                    </div>
                 </div>

                 <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-12 flex items-center gap-4">
                   Operational Milestones
                   <div className="h-1 flex-1 bg-slate-50" />
                 </h3>

                 <div className="relative pl-12 space-y-12 before:absolute before:left-[22px] before:top-4 before:bottom-0 before:w-[4px] before:bg-slate-50 before:rounded-full">
                    {job.reports?.length === 0 ? (
                       <div className="py-20 text-center">
                          <Package className="h-16 w-16 text-slate-100 mx-auto mb-4" />
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Waiting for first milestone...</p>
                       </div>
                    ) : (
                      job.reports.map((report: any, idx: number) => {
                        const isLatest = idx === 0;
                        return (
                          <motion.div 
                            key={report.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative"
                          >
                             {/* Glowing Point */}
                             <div className={cn(
                               "absolute -left-[45px] top-1.5 h-7 w-7 rounded-full border-4 border-white shadow-lg z-20 transition-all",
                               isLatest ? "bg-accent shadow-accent/40 scale-110 ring-4 ring-accent/10" : "bg-slate-200"
                             )}>
                                {isLatest && <div className="absolute inset-0 bg-accent rounded-full animate-ping opacity-25" />}
                             </div>

                             <div className={cn(
                                "p-6 rounded-[1.5rem] transition-all",
                                isLatest ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/20" : "bg-slate-50 border border-slate-100"
                             )}>
                                <div className="flex justify-between items-start mb-3">
                                   <div className={cn(
                                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                      isLatest ? "bg-accent text-white" : "bg-slate-200 text-slate-500"
                                   )}>
                                      {report.status.replace(/_/g, ' ')}
                                   </div>
                                   <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-60">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(report.created_at), "MMM d, HH:mm")}
                                   </div>
                                </div>
                                <p className={cn(
                                   "text-sm leading-relaxed",
                                   isLatest ? "font-bold text-slate-100" : "text-slate-600 font-medium"
                                )}>
                                   {report.update_text}
                                </p>
                                
                                {isLatest && (
                                   <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                                      <span className="text-[10px] font-black uppercase tracking-widest text-accent">Active Operational Stage</span>
                                   </div>
                                )}
                             </div>
                          </motion.div>
                        );
                      })
                    )}
                 </div>
              </div>

              {/* Legal Footer for Public Page */}
              <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40">
                 <p className="text-[10px] font-bold uppercase tracking-widest">© 2026 Ozmae Freight Solutions — Operations Hub</p>
                 <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                    <ShieldCheck className="h-3 w-3" /> Encrypted Transmission
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

const History = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);
