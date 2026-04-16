import { 
  Briefcase, 
  FileText, 
  Receipt, 
  CheckCircle, 
  Plus, 
  ArrowUpRight, 
  TrendingUp, 
  Users, 
  Truck, 
  Shield, 
  Activity, 
  Clock,
  MessageSquare,
  Zap,
  Target,
  BarChart3,
  MapPin,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie 
} from "recharts";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useCrmTasks } from "@/hooks/useCrm";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// --- COMPACT VIEW COMPONENTS (MOCKUPS) ---

const LeadsDashboardMockup = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-2xl border shadow-sm border-l-4 border-l-blue-500">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Inquiry Velocity</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-2xl font-black">24 <span className="text-[10px] text-emerald-500">+12%</span></p>
          <MessageSquare className="h-5 w-5 text-blue-500 opacity-20" />
        </div>
      </div>
      <div className="bg-white p-4 rounded-2xl border shadow-sm border-l-4 border-l-amber-500">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Avg Response Time</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-2xl font-black">18m <span className="text-[10px] text-emerald-500">-4m</span></p>
          <Clock className="h-5 w-5 text-amber-500 opacity-20" />
        </div>
      </div>
      <div className="bg-white p-4 rounded-2xl border shadow-sm border-l-4 border-l-emerald-500">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Hot Prospects</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-2xl font-black">12</p>
          <Zap className="h-5 w-5 text-emerald-500 opacity-20" />
        </div>
      </div>
    </div>

    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex justify-between items-center bg-muted/20">
        <h4 className="text-[10px] font-black uppercase tracking-widest">Action Required: New Leads</h4>
        <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest">View Queue</Button>
      </div>
      <div className="p-0">
        <Table>
          <TableBody>
            {[
              { name: "Global Logistics Ltd", source: "WhatsApp", time: "2m ago", priority: "high" },
              { name: "John Doe (Retail)", source: "Email", time: "15m ago", priority: "medium" },
              { name: "Arusha Trading", source: "Website", time: "1h ago", priority: "low" },
            ].map((lead, i) => (
              <TableRow key={i} className="hover:bg-muted/10">
                <TableCell className="py-2 text-xs font-bold">{lead.name}</TableCell>
                <TableCell className="py-2 text-[10px] uppercase font-bold text-muted-foreground">{lead.source}</TableCell>
                <TableCell className="py-2 text-[10px] text-right text-muted-foreground">{lead.time}</TableCell>
                <TableCell className="py-2 w-10 text-right">
                  <div className={cn("h-1.5 w-1.5 rounded-full ml-auto", lead.priority === 'high' ? 'bg-red-500' : 'bg-blue-500')} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
);

const SalesDashboardMockup = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-[#0f1d35] p-5 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">Monthly Target</p>
        <p className="text-2xl font-black mt-1">$142k / <span className="text-white/30 text-lg">$200k</span></p>
        <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
           <div className="h-full bg-accent" style={{ width: '71%' }} />
        </div>
        <Target className="absolute -right-2 -bottom-2 h-12 w-12 text-white/5" />
      </div>
      <div className="bg-white p-5 rounded-2xl border shadow-sm">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Conversion Rate</p>
        <p className="text-2xl font-black mt-1">34.2%</p>
        <div className="mt-2 flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500">+2.4% vs last mo</span>
        </div>
      </div>
      <div className="bg-white p-5 rounded-2xl border shadow-sm">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Quotations</p>
        <p className="text-2xl font-black mt-1">48</p>
        <p className="text-[10px] font-bold text-muted-foreground mt-2">Value: $284,500</p>
      </div>
      <div className="bg-white p-5 rounded-2xl border shadow-sm">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Avg Ticket Size</p>
        <p className="text-2xl font-black mt-1">$4,820</p>
        <p className="text-[10px] font-bold text-red-500 mt-2">-5.2% trend</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Pipeline by Region</h4>
          <div className="h-[180px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{n:'Ke',v:45},{n:'Tz',v:32},{n:'Ug',v:28},{n:'Rw',v:15}]}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="n" fontSize={10} axisLine={false} tickLine={false} />
                   <YAxis fontSize={10} axisLine={false} tickLine={false} />
                   <Bar dataKey="v" fill="#F26B2A" radius={[4,4,0,0]} />
                </BarChart>
             </ResponsiveContainer>
          </div>
       </div>
       <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Top Customers (By Margin)</h4>
          <div className="space-y-3">
             {[
               { n: "Peak Logistics", v: "$12,400", p: "75%" },
               { n: "Safeway Trans", v: "$9,200", p: "62%" },
               { n: "Swift Movers", v: "$8,500", p: "58%" }
             ].map((c, i) => (
               <div key={i} className="flex items-center justify-between">
                 <div>
                    <p className="text-xs font-bold">{c.n}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-black">{c.v}</p>
                 </div>
                 <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black">{c.p}</div>
               </div>
             ))}
          </div>
       </div>
    </div>
  </div>
);

const OperationsDashboardMockup = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
       {[
         { l: 'IN TRANSIT', v: '18', c: 'bg-blue-500' },
         { l: 'PICKED UP', v: '12', c: 'bg-emerald-500' },
         { l: 'AT BORDER', v: '5', c: 'bg-amber-500' },
         { l: 'DELAYED', v: '2', c: 'bg-red-500' },
         { l: 'PENDING', v: '4', c: 'bg-slate-400' }
       ].map((s, i) => (
         <div key={i} className="min-w-[140px] bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-1">
            <div className={cn("h-1 w-8 rounded-full mb-1", s.c)} />
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{s.l}</p>
            <p className="text-2xl font-black">{s.v}</p>
         </div>
       ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex justify-between items-center bg-muted/20">
             <h4 className="text-[10px] font-black uppercase tracking-widest">Active Shipments Map View</h4>
             <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[9px] font-black px-2 uppercase">Heatmap</Button>
                <Button variant="outline" size="sm" className="h-7 text-[9px] font-black px-2 uppercase bg-accent text-accent-foreground">Live Feed</Button>
             </div>
          </div>
          <div className="p-8 flex flex-col items-center justify-center text-center bg-slate-50 border-b">
             <MapPin className="h-8 w-8 text-accent mb-4 opacity-50" />
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Map Interface Placeholder</p>
             <p className="text-[10px] text-muted-foreground mt-1">18 Vehicles active across East Africa corridor.</p>
          </div>
          <div className="p-4 space-y-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-red-500" />
                   <p className="text-xs font-bold uppercase tracking-tight">Critically Delayed: TZ-2088-A</p>
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] font-black text-accent uppercase">Intervene</Button>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-amber-500" />
                   <p className="text-xs font-bold uppercase tracking-tight">Border Clearance Alert: KE-441-X</p>
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] font-black text-accent uppercase">Update Doc</Button>
             </div>
          </div>
       </div>

       <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border shadow-sm">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Fleet Utilization</h4>
             <div className="space-y-4">
                <div>
                   <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span>Own Trucks</span>
                      <span>88%</span>
                   </div>
                   <div className="h-1.5 bg-muted rounded-full">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }} />
                   </div>
                </div>
                <div>
                   <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span>Third Party</span>
                      <span>42%</span>
                   </div>
                   <div className="h-1.5 bg-muted rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '42%' }} />
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl text-white">
             <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Logistics Alerts</h4>
             </div>
             <div className="space-y-4">
                <div className="flex gap-3">
                   <div className="h-7 w-7 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold">1</div>
                   <div>
                      <p className="text-[11px] font-black uppercase text-white/90">Namanga Border Delay</p>
                      <p className="text-[9px] text-white/50 lowercase mt-0.5">+4h avg wait time today</p>
                   </div>
                </div>
                <div className="flex gap-3">
                   <div className="h-7 w-7 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold">2</div>
                   <div>
                      <p className="text-[11px] font-black uppercase text-white/90">Fuel Update Req.</p>
                      <p className="text-[9px] text-white/50 lowercase mt-0.5">Price surge detected @ Mombasa Hub</p>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  </div>
);

// --- MAIN DASHBOARD CONTAINER ---

export default function Dashboard() {
  const { roles, isAdmin, isLeads, isSales, isOperations } = useAuth();
  
  const { data: crmTasks, isLoading: tasksLoading } = useCrmTasks({ status: 'pending', assignedToMe: true });
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const [
        { count: activeJobs },
        { count: pendingQuotes },
        { count: outstandingInvoices },
        { count: completedMonth }
      ] = await Promise.all([
        supabase.from("job_orders").select("*", { count: "exact", head: true }).not("status", "eq", "closed"),
        supabase.from("quotations").select("*", { count: "exact", head: true }).in("status", ["draft", "sent"]),
        supabase.from("invoices").select("*", { count: "exact", head: true }).or("deposit_status.neq.paid,balance_status.neq.paid"),
        supabase.from("job_orders").select("*", { count: "exact", head: true }).eq("status", "closed")
      ]);

      return {
        activeJobs: activeJobs || 0,
        pendingQuotes: pendingQuotes || 0,
        outstandingInvoices: outstandingInvoices || 0,
        completedMonth: completedMonth || 0,
      };
    },
    enabled: isAdmin // Only run for Admin
  });

  const { data: recentJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["recent_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select(`
          id,
          job_number,
          customer_id,
          origin,
          destination,
          status,
          total_amount,
          created_at,
          customer:customers(company_name),
          driver:drivers!job_orders_assigned_driver_id_fkey(full_name),
          vehicle:vehicles!job_orders_assigned_vehicle_id_fkey(plate_number),
          quotation:quotations(total_amount_usd)
        `)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin // Only run for Admin
  });

  const { data: securityLogs } = useQuery({
    queryKey: ["recent_security_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return [];
      return data;
    },
    enabled: isAdmin // Only run for Admin
  });

  // Mock admin data
  const chartData = [
    { name: 'Mon', jobs: 4, revenue: 2400 },
    { name: 'Tue', jobs: 3, revenue: 1398 },
    { name: 'Wed', jobs: 2, revenue: 9800 },
    { name: 'Thu', jobs: 6, revenue: 3908 },
    { name: 'Fri', jobs: 8, revenue: 4800 },
    { name: 'Sat', jobs: 5, revenue: 3800 },
    { name: 'Sun', jobs: 3, revenue: 4300 },
  ];

  const fleetData = [
    { name: 'Active', value: 12, color: '#10b981' },
    { name: 'Maintenance', value: 3, color: '#f59e0b' },
    { name: 'Idle', value: 5, color: '#3b82f6' },
  ];

  const kpis = [
    { label: "Active Jobs", value: stats?.activeJobs.toString() || "0", icon: Briefcase, color: "text-accent", bg: "bg-accent/10" },
    { label: "Pending Quotations", value: stats?.pendingQuotes.toString() || "0", icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Outstanding Invoices", value: stats?.outstandingInvoices.toString() || "0", icon: Receipt, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Total Completed", value: stats?.completedMonth.toString() || "0", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  // Helper to render sections only if role is present
  const RoleGate = ({ roles: allowedRoles, children }: { roles: UserRole[], children: any }) => {
    const { hasRole } = useAuth();
    if (!hasRole(allowedRoles)) return null;
    return children;
  };

  return (
    <div className="space-y-10">
      {/* Header with Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f1d35] border border-white/5 p-8 rounded-3xl text-white shadow-[0_8px_30px_rgba(20,41,76,0.12)] overflow-hidden relative group">
        <div className="relative z-10 space-y-2">
           <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-sm">Logistics Command</h1>
           <div className="flex items-center gap-3">
             <p className="text-white/60 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#F26B2A]" /> Real-time System Overview
             </p>
             <div className="flex gap-1">
               {roles.map(r => (
                 <span key={r} className="text-[8px] font-black uppercase tracking-tighter bg-white/10 px-1.5 py-0.5 rounded border border-white/10 text-white/50">
                   {r}
                 </span>
               ))}
             </div>
           </div>
        </div>
        <div className="flex flex-wrap gap-3 relative z-10">
          <RoleGate roles={["Admin", "Leads", "Sales"]}>
            <Link to="/leads">
              <Button className="bg-[#F26B2A] hover:bg-[#d85e23] text-white shadow-lg shadow-[#F26B2A]/20 font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2 transition-all">
                <Plus className="h-4 w-4" /> New Inquiry
              </Button>
            </Link>
          </RoleGate>
          <RoleGate roles={["Admin", "Operations"]}>
            <Link to="/job-orders">
              <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2 transition-all">
                <Plus className="h-4 w-4" /> Create Job
              </Button>
            </Link>
          </RoleGate>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-[#F26B2A] rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
        <div className="absolute left-1/2 top-0 h-24 w-24 bg-[#FF925E] rounded-full blur-[50px] opacity-10" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Main Dashboard Content (Left/Center Column) */}
        <div className="xl:col-span-2 space-y-12">
           
           {/* 1. ADMIN - Existing Functionality */}
           {isAdmin && (
             <div className="space-y-12">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {kpis.map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start">
                         <div className={cn("p-2 rounded-lg shadow-inner", kpi.bg, kpi.color)}>
                            <kpi.icon className="h-4 w-4" />
                         </div>
                         <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                        <p className="text-2xl font-black text-foreground mt-0.5 tabular-nums">
                          {statsLoading ? "—" : kpi.value}
                        </p>
                      </div>
                    </div>
                  ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-accent" /> Network Performance
                    </h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ADFA1D" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#ADFA1D" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#64748b'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#64748b'}} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '9px', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#ADFA1D" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-4">
                       <BarChart3 className="h-4 w-4 text-blue-500" />
                       <h3 className="font-black text-[10px] uppercase tracking-widest text-foreground text-opacity-70">Region Statistics</h3>
                    </div>
                    <div className="space-y-4 flex-1">
                       {[
                         { l: "Nairobi Hub", v: 85, c: "bg-blue-500" },
                         { l: "Mombasa Port", v: 62, c: "bg-emerald-500" },
                         { l: "Kampala Transit", v: 45, c: "bg-amber-500" },
                         { l: "Dar es Salaam", v: 38, c: "bg-purple-500" }
                       ].map(r => (
                         <div key={r.l}>
                            <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                               <span>{r.l}</span>
                               <span>{r.v}% Load</span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                               <div className={cn("h-full rounded-full transition-all", r.c)} style={{ width: `${r.v}%` }} />
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               </div>

               <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b flex justify-between items-center bg-muted/10">
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-foreground flex items-center gap-2">
                       <Briefcase className="h-3.5 w-3.5 text-accent" /> Global Activity Logs
                    </h3>
                  </div>
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold uppercase text-[8px] tracking-widest h-8 px-5">Ref</TableHead>
                        <TableHead className="font-bold uppercase text-[8px] tracking-widest h-8 px-3">Client</TableHead>
                        <TableHead className="font-bold uppercase text-[8px] tracking-widest h-8 px-3">Status</TableHead>
                        <TableHead className="text-right font-bold uppercase text-[8px] tracking-widest h-8 px-5">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {recentJobs?.map((job: any) => (
                         <TableRow key={job.id} className="h-10 hover:bg-muted/10 transition-colors">
                            <TableCell className="font-mono text-[9px] font-bold text-accent uppercase px-5">{job.id.split('-')[0]}</TableCell>
                            <TableCell className="text-[10px] font-bold text-foreground px-3 truncate max-w-[120px]">{job.customer?.company_name}</TableCell>
                            <TableCell className="px-3"><StatusBadge status={job.status} /></TableCell>
                            <TableCell className="text-right font-black text-[10px] px-5">{formatCurrency(job.quotation?.total_amount_usd || job.total_amount || 0)}</TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                  </Table>
               </div>
             </div>
           )}

           {/* 2. LEADS - NEW MOCKUP */}
           {isLeads && (
             <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                   <div className="h-1 w-8 bg-blue-500 rounded-full" />
                   <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lead Management Desk</h2>
                </div>
                <LeadsDashboardMockup />
             </section>
           )}

           {/* 3. SALES - NEW MOCKUP */}
           {isSales && (
             <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                   <div className="h-1 w-8 bg-[#F26B2A] rounded-full" />
                   <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Revenue Control Panel</h2>
                </div>
                <SalesDashboardMockup />
             </section>
           )}

           {/* 4. OPERATIONS - NEW MOCKUP */}
           {isOperations && (
             <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                   <div className="h-1 w-8 bg-emerald-500 rounded-full" />
                   <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ops Center & Fleet Tracking</h2>
                </div>
                <OperationsDashboardMockup />
             </section>
           )}

        </div>

        {/* Action Center & Sidebar (Right Column) */}
        <div className="space-y-8">
           
           {/* Unified "My Work" Section */}
           <div className="bg-white rounded-3xl border shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-center">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Awaiting Your Action</h4>
                 <div className="bg-[#F26B2A] text-white text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse">LIVE</div>
              </div>
              <div className="space-y-3">
                 {tasksLoading ? (
                   <div className="h-20 animate-pulse bg-muted rounded-2xl" />
                 ) : crmTasks?.length === 0 ? (
                   <div className="text-center py-6 bg-slate-50 border border-dashed rounded-2xl">
                      <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2 opacity-50" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">No Pending Actions</p>
                   </div>
                 ) : (
                   crmTasks?.map((t: any) => (
                     <motion.div 
                       key={t.id}
                       whileHover={{ scale: 1.02 }}
                       className="p-4 bg-slate-50 border hover:border-accent group rounded-2xl flex items-center gap-3 transition-all cursor-pointer"
                     >
                        <div className={cn(
                          "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-colors",
                          t.priority === 'urgent' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        )}>
                           <Shield className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-xs font-black text-foreground truncate">{t.title}</p>
                           <p className="text-[10px] font-medium text-muted-foreground">{t.customer?.company_name}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:text-accent" />
                     </motion.div>
                   ))
                 )}
              </div>
           </div>

           {/* Security / System Health (Unified) */}
           <div className="bg-[#0f1d35] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-32 w-32 bg-accent rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2">
                   <Activity className="h-4 w-4 text-accent" />
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50">System Logs</h4>
                </div>
                <div className="space-y-3">
                   {/* Simplified health indicator */}
                   <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-black text-white/40 uppercase">Database Link</span>
                      <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1">
                        <div className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" /> STABLE
                      </span>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-black text-white/40 uppercase">Fleet Core</span>
                      <span className="text-[9px] font-black text-emerald-500 uppercase">ACTIVE</span>
                   </div>
                </div>
                <Button className="w-full bg-white/10 hover:bg-accent border-white/10 text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl">
                   Run Diagnostics
                </Button>
              </div>
           </div>

           {/* Quick Access Grid */}
           <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Contacts", path: "/crm/customers", icon: Users },
                { label: "Invoices", path: "/invoices", icon: Receipt },
                { label: "Rate Card", path: "/rate-card", icon: FileText },
                { label: "Settings", path: "/settings/profile", icon: Shield }
              ].map(item => (
                <Link key={item.label} to={item.path} className="group">
                   <div className="p-4 bg-white border border-transparent group-hover:border-accent/40 rounded-2xl text-center transition-all shadow-sm hover:shadow-md">
                      <item.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-accent transition-colors" />
                      <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground group-hover:text-foreground">{item.label}</p>
                   </div>
                </Link>
              ))}
           </div>

        </div>

      </div>
    </div>
  );
}
