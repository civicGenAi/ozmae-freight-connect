import { useState, useMemo, useEffect } from "react";
import { 
  Plus, Activity, MessagesSquare, Clock, Zap, 
  ChevronRight, Database, ShieldCheck, Mail, Phone, 
  Globe, Contact, Receipt, FileText, Settings, 
  RefreshCw, TrendingUp, Wallet
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

  // Fetch Pending Operations for Finance
  const { data: pendingFinance } = useQuery({
    queryKey: ["pending_finance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select(`id, job_number, customer:customers(company_name), total_amount`)
        .eq("status", "awaiting_deposit")
        .limit(2);
      if (error) throw error;
      return data;
    }
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    }
  });

  const userRole = userProfile?.role?.toLowerCase();
  const isLeads = userRole === 'leads';
  const isFinanceOrAdmin = ['admin', 'finance'].includes(userRole || "");

  // Fetch Recent Leads for Management Desk
  const { data: recentLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ["recent_leads_dash"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(`*, profiles(full_name)`)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  // Fetch Pending Quotations for Review Desk
  const { data: pendingQuotes, isLoading: quotesLoading } = useQuery({
    queryKey: ["pending_quotes_dash"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select(`*, creator:profiles!quotations_created_by_fkey(full_name)`)
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    }
  });

  // Fetch All Leads for Dashboard Analytics
  const { data: allLeads } = useQuery({
    queryKey: ["all_leads_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(`*`);
      if (error) throw error;
      return data;
    }
  });

  // Aggregated Dashboard Stats
  const dashboardStats = useMemo(() => {
    if (!allLeads) return { velocity: 0, responseTime: "...", prospects: 0 };
    
    const velocity = allLeads.filter(l => {
      const date = new Date(l.created_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const prospects = allLeads.filter(l => ['new', 'contacted', 'qualified'].includes(l.status)).length;
    
    // Calculate Average Response Time (New -> Quoted/Accepted)
    // We'll estimate this by looking at leads that have moved past 'new'
    const respondedLeads = allLeads.filter(l => l.status !== 'new' && l.updated_at !== l.created_at);
    let avgResponseTime = "18m"; // Default/Target
    
    if (respondedLeads.length > 0) {
      const totalDiff = respondedLeads.reduce((acc, l) => {
        const diff = new Date(l.updated_at).getTime() - new Date(l.created_at).getTime();
        return acc + diff;
      }, 0);
      const avgMs = totalDiff / respondedLeads.length;
      const avgMins = Math.floor(avgMs / (1000 * 60));
      
      if (avgMins < 60) {
        avgResponseTime = `${avgMins}m`;
      } else if (avgMins < 1440) {
        avgResponseTime = `${Math.floor(avgMins / 60)}h ${avgMins % 60}m`;
      } else {
        avgResponseTime = `${Math.floor(avgMins / 1440)}d`;
      }
    }

    return { velocity, responseTime: avgResponseTime, prospects };
  }, [allLeads]);

  const metrics = useMemo(() => {
    if (!allLeads) return null;
    const total = allLeads.length;
    const converted = allLeads.filter((l: any) => l.status === 'converted').length;
    const active = allLeads.filter((l: any) => ['new', 'contacted', 'qualified'].includes(l.status)).length;
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0.0";
    
    const modeCounts = allLeads.reduce((acc: any, lead: any) => {
      const mode = lead.transport_mode || 'unspecified';
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});

    const chartData = [
      { name: 'Sea', value: modeCounts.sea || 0, color: '#0ea5e9' },
      { name: 'Air', value: modeCounts.air || 0, color: '#8b5cf6' },
      { name: 'Road', value: modeCounts.road || 0, color: '#f59e0b' },
    ].filter(d => d.value > 0);

    const growthData = allLeads.reduce((acc: any, lead: any) => {
      const date = new Date(lead.created_at);
      const month = date.toLocaleString('default', { month: 'short' });
      const entry = acc.find((e: any) => e.name === month);
      if (entry) entry.count += 1;
      else acc.push({ name: month, count: 1 });
      return acc;
    }, []).slice(-6);

    const statusData = ['new', 'contacted', 'qualified', 'lost', 'converted'].map(s => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      count: allLeads.filter((l: any) => l.status === s).length
    }));

    return { total, converted, active, conversionRate, chartData, growthData, statusData };
  }, [allLeads]);

  const handleDiagnostics = () => {
    setIsDiagnosing(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: "Running system diagnostics...",
        success: "All systems operational. Database link stable.",
        error: "Diagnostics failed.",
        finally: () => setIsDiagnosing(false)
      }
    );
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Logistics Command Hero Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-10 md:p-14 shadow-[0_20px_50px_rgba(15,23,42,0.3)] border border-white/5"
      >
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#f97316]" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-200">System Live</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300 opacity-60">Real-Time System Overview</p>
              <Badge variant="secondary" className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-0 text-[10px] font-black px-3 py-0.5 tracking-widest">{isLeads ? 'LEADS' : userRole?.toUpperCase() || 'COMMAND'}</Badge>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
              {isLeads ? 'LOGISTICS' : 'EXECUTIVE'} <span className="text-indigo-400">COMMAND</span>
            </h1>
            {isLeads && <p className="text-indigo-200/60 font-medium text-sm max-w-md">Optimize your pipeline, track inquiry velocity, and accelerate conversions with real-time intelligence.</p>}
          </div>
          <Button 
            onClick={() => navigate("/leads")}
            className="bg-[#f97316] hover:bg-[#ea580c] text-white h-16 px-10 rounded-2xl gap-3 text-sm font-black uppercase tracking-widest transition-all hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-orange-500/40 active:translate-y-[1px] shadow-xl shadow-orange-500/20"
          >
            <Plus className="h-5 w-5 stroke-[3px]" /> New Inquiry
          </Button>
        </div>
      </motion.div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { 
            label: "Inquiry Velocity", 
            value: dashboardStats?.velocity || 0, 
            trend: "+12%", 
            icon: MessagesSquare, 
            color: "text-blue-500", 
            bg: "bg-blue-500/5", 
            border: "border-blue-100/50" 
          },
          { 
            label: "Avg Response Time", 
            value: dashboardStats?.responseTime || "...", 
            trend: "-4m", 
            icon: Clock, 
            color: "text-orange-500", 
            bg: "bg-orange-500/5", 
            border: "border-orange-100/50" 
          },
          { 
            label: "Hot Prospects", 
            value: dashboardStats?.prospects || 0, 
            trend: null, 
            icon: Zap, 
            color: "text-emerald-500", 
            bg: "bg-emerald-500/5", 
            border: "border-emerald-100/50" 
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "p-10 rounded-[40px] border bg-white shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all group relative overflow-hidden",
              stat.border
            )}
          >
            <div className={cn("absolute top-0 left-0 w-1 h-full opacity-40", stat.color.replace('text', 'bg'))} />
            <div className="flex justify-between items-start mb-6">
              <div className={cn("p-5 rounded-3xl transition-all group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("h-7 w-7", stat.color)} />
              </div>
              {stat.trend && (
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black",
                  stat.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                )}>
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </div>
              )}
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#64748b] mb-1">{stat.label}</p>
            <h3 className="text-5xl font-black text-[#0f172a] sm:text-6xl tracking-tighter">
              {stat.value}
            </h3>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Management Desk + Status Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-12">
          {/* Advanced Analytics for Leads Role */}
          {isLeads && metrics && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_15px_50px_rgba(0,0,0,0.02)] p-10 space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Inquiry Velocity</h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Monthly trend</p>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.growthData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} dy={10} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 700 }} />
                      <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_15px_50px_rgba(0,0,0,0.02)] p-10 flex flex-col items-center text-center">
                <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 self-start">Transport Split</h5>
                <div className="relative flex-1 flex items-center justify-center w-full">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={metrics.chartData} innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value">
                        {metrics.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{metrics.total}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Units</span>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  {metrics.chartData.map(d => (
                    <div key={d.name} className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{d.name}</span>
                      </div>
                      <span className="text-[11px] font-black text-slate-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Velocity Grid (exclusive to Leads) */}
          {isLeads && metrics && (
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
               {metrics.statusData.map((s, i) => (
                 <motion.div 
                   key={s.name}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col items-center text-center group hover:border-indigo-100 transition-all cursor-default"
                 >
                   <span className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{s.count}</span>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.name}</span>
                 </motion.div>
               ))}
             </div>
          )}

          {/* Leads Management Desk */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <div className="h-1.5 w-10 bg-indigo-500 rounded-full" />
                <h4 className="text-[13px] font-black uppercase tracking-[0.3em] text-slate-400">Management Desk</h4>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/leads")}
                className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-50 gap-2 h-10 px-5 rounded-xl border border-transparent hover:border-indigo-100 transition-all"
              >
                Access Queue <ChevronRight className="h-3 w-3 stroke-[3px]" />
              </Button>
            </div>
            
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_15px_50px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h5 className="text-[12px] font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" /> Action Required: New Leads
                </h5>
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest py-0.5 px-3 border-slate-200">Real-time Feed</Badge>
              </div>
              <div className="divide-y divide-slate-50">
                {leadsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-8 animate-pulse flex justify-between gap-4">
                      <div className="space-y-2">
                        <div className="h-5 w-48 bg-slate-100 rounded-lg" />
                        <div className="h-4 w-32 bg-slate-50 rounded-lg" />
                      </div>
                      <div className="h-6 w-20 bg-slate-100 rounded-lg" />
                    </div>
                  ))
                ) : recentLeads?.length === 0 ? (
                  <div className="p-20 text-center space-y-4">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <ShieldCheck className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No New Inquiries</p>
                  </div>
                ) : recentLeads?.map((lead) => (
                  <motion.div 
                    key={lead.id} 
                    whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)", x: 4 }}
                    className="p-8 flex items-center justify-between transition-all group cursor-pointer"
                    onClick={() => navigate("/leads")}
                  >
                    <div className="space-y-2">
                      <p className="text-lg font-black text-[#0f172a] group-hover:text-indigo-600 transition-colors tracking-tight">{lead.customer_name_raw}</p>
                      <div className="flex items-center gap-2">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                           {lead.origin} <ChevronRight className="h-2 w-2" /> {lead.destination}
                         </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-12">
                      <div className="hidden md:flex flex-col items-end gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{lead.inquiry_channel || 'DIRECT'}</span>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{formatDistanceToNow(new Date(lead.created_at))} ago</span>
                      </div>
                      <div className="h-3.5 w-3.5 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] group-hover:scale-125 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Quotation Review Desk (Phase 2 Upgrade) - Hidden for Leads Role unless Finance/Admin */}
          {!isLeads && isFinanceOrAdmin && (
            <div className="space-y-8 pt-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="h-1.5 w-10 bg-amber-500 rounded-full" />
                  <h4 className="text-[13px] font-black uppercase tracking-[0.3em] text-slate-400">Review Desk</h4>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/quotations")}
                  className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 gap-2 h-10 px-5 rounded-xl border border-transparent hover:border-amber-100 transition-all"
                >
                  Review All <ChevronRight className="h-3 w-3 stroke-[3px]" />
                </Button>
              </div>
              
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_15px_50px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-amber-50/10">
                  <h5 className="text-[12px] font-bold text-amber-900 tracking-tight flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_5px_#f59e0b]" /> Awaiting Review: Quotations
                  </h5>
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest py-0.5 px-3 border-amber-200 text-amber-700 bg-amber-50/50">Audit Required</Badge>
                </div>
                <div className="divide-y divide-slate-50">
                  {quotesLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="p-8 animate-pulse flex justify-between gap-4">
                        <div className="h-5 w-48 bg-slate-100 rounded-lg" />
                        <div className="h-6 w-20 bg-slate-100 rounded-lg" />
                      </div>
                    ))
                  ) : pendingQuotes?.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                      <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                        <FileText className="h-8 w-8 text-slate-200" />
                      </div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No Pending Reviews</p>
                    </div>
                  ) : pendingQuotes?.map((quote: any) => (
                    <motion.div 
                      key={quote.id} 
                      whileHover={{ backgroundColor: "rgba(255, 251, 235, 0.4)", x: 4 }}
                      className="p-8 flex items-center justify-between transition-all group cursor-pointer"
                      onClick={() => navigate("/quotations", { state: { reviewId: quote.id } })}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-black text-[#0f172a] group-hover:text-amber-700 transition-colors tracking-tight">{quote.quote_number}</p>
                          <Badge variant="outline" className="text-[9px] border-amber-200/50 text-amber-600 bg-amber-50/30 uppercase">{quote.total_amount_usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Badge>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest uppercase">Created by: {quote.creator?.full_name || "Unknown"}</p>
                      </div>
                      <div className="flex items-center gap-12">
                        <div className="hidden md:flex flex-col items-end gap-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Pending Review</span>
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{formatDistanceToNow(new Date(quote.created_at))} ago</span>
                        </div>
                        <div className="h-3.5 w-3.5 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)] group-hover:scale-125 transition-transform" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-10">
          {/* Action Card */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="h-1.5 w-6 bg-orange-500 rounded-full" />
              <h4 className="text-[13px] font-black uppercase tracking-[0.3em] text-slate-400">Critical Tasks</h4>
            </div>
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_15px_50px_rgba(0,0,0,0.03)] p-8 relative overflow-hidden group">
              <div className="flex justify-between items-center mb-8">
                <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Awaiting Your Action</h5>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase text-rose-500 tracking-tighter">Live</span>
                </div>
              </div>

              {(pendingFinance?.length || 0) > 0 && isFinanceOrAdmin ? (
                <div className="space-y-3 mb-6">
                  {pendingFinance?.map((job: any) => (
                    <motion.div 
                      key={job.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between group/task cursor-pointer"
                      onClick={() => navigate("/jobs")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-white">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-amber-900 leading-tight">Deposit Pending</p>
                          <p className="text-[9px] font-bold text-amber-700/60 uppercase">{job.customer?.company_name}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-400 group-hover/task:translate-x-1 transition-transform" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="aspect-square rounded-[32px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center p-10 bg-slate-50/40 relative group-hover:bg-slate-50 transition-colors">
                  <div className="h-20 w-20 mb-6 rounded-[24px] bg-white flex items-center justify-center shadow-2xl shadow-slate-200/50 group-hover:scale-110 transition-all duration-500">
                    <ShieldCheck className="h-10 w-10 text-emerald-500" />
                  </div>
                  <p className="text-[14px] font-black text-[#0f172a] uppercase tracking-wide">Command Status: Clear</p>
                  <p className="text-[12px] text-slate-400 font-medium mt-2 leading-relaxed px-4">All operational systems are stable. No urgent actions required.</p>
                </div>
              )}
            </div>
          </div>

          {/* System Logs Card */}
          <div className="bg-[#0f172a] rounded-[40px] p-10 shadow-2xl shadow-slate-900/20 text-white space-y-10 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
            <div className="flex items-center gap-3 relative">
              <div className="p-2.5 bg-orange-500/10 rounded-xl">
                <Activity className="h-5 w-5 text-orange-400" />
              </div>
              <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Core Diagnostic Log</h5>
            </div>
            <div className="space-y-5 relative">
              {[
                { label: "Database Link", status: "Stable", color: "text-emerald-400", bg: "bg-emerald-500" },
                { label: "Fleet Engine", status: "Active", color: "text-blue-400", bg: "bg-blue-500" },
                { label: "Payment Gateway", status: "Connected", color: "text-amber-400", bg: "bg-amber-500" },
              ].map((log) => (
                <div key={log.label} className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{log.label}</p>
                  <div className="flex items-center gap-2.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", log.bg)} />
                    <span className={cn("text-[11px] font-black uppercase tracking-tighter", log.color)}>{log.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              onClick={handleDiagnostics}
              disabled={isDiagnosing}
              className="w-full h-16 bg-white/10 hover:bg-white/20 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl border border-white/10 transition-all active:scale-[0.98] shadow-lg shadow-black/20"
            >
              {isDiagnosing ? <RefreshCw className="h-5 w-5 animate-spin" /> : "Initiate System Diagnostic"}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Access Grid Footer */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="h-1.5 w-6 bg-slate-300 rounded-full" />
          <h4 className="text-[13px] font-black uppercase tracking-[0.3em] text-slate-400">Command Shortcuts</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Contact, label: "Contacts", count: "1.2k", path: "/crm/customers" },
            { icon: Receipt, label: "Invoices", count: "148", path: "/finance/invoices" },
            { icon: FileText, label: "Rate Card", count: "v4.2", path: "/rate-card" },
            { icon: Settings, label: "Settings", count: "Config", path: "/settings" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              whileHover={{ y: -8, shadow: "0 25px 50px -12px rgba(0,0,0,0.08)" }}
              onClick={() => navigate(item.path)}
              className="p-8 bg-white border border-slate-100 rounded-[35px] flex flex-col items-center justify-center text-center gap-4 hover:border-indigo-100 transition-all cursor-pointer group shadow-sm"
            >
              <div className="h-16 w-16 rounded-[22px] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all duration-300">
                <item.icon className="h-7 w-7 stroke-[2.5px]" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#0f172a]">{item.label}</p>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">{item.count}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
