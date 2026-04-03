import { Briefcase, FileText, Receipt, CheckCircle, Plus, ArrowUpRight, TrendingUp, Users, Truck, Shield, Activity, Clock } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useCrmTasks } from "@/hooks/useCrm";

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Dashboard() {
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
  });

  const { data: recentJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["recent_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select(`
          *,
          customer:customers(company_name),
          driver:drivers(full_name),
          vehicle:vehicles(plate_number)
        `)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
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
  });

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

  return (
    <div className="space-y-10">
      {/* Header with Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f1d35] border border-white/5 p-8 rounded-3xl text-white shadow-[0_8px_30px_rgba(20,41,76,0.12)] overflow-hidden relative group">
        <div className="relative z-10 space-y-2">
           <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-sm">Operations Control</h1>
           <p className="text-white/60 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#F26B2A]" /> Real-time System Overview
           </p>
        </div>
        <div className="flex flex-wrap gap-3 relative z-10">
          <Link to="/leads">
            <Button className="bg-[#F26B2A] hover:bg-[#d85e23] text-white shadow-lg shadow-[#F26B2A]/20 font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2 transition-all">
              <Plus className="h-4 w-4" /> New Inquiry
            </Button>
          </Link>
          <Link to="/job-orders">
            <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2 transition-all">
              <Plus className="h-4 w-4" /> Create Job
            </Button>
          </Link>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-[#F26B2A] rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
        <div className="absolute left-1/2 top-0 h-24 w-24 bg-[#FF925E] rounded-full blur-[50px] opacity-10" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-2xl border shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start">
               <div className={cn("p-3 rounded-xl shadow-inner", kpi.bg, kpi.color)}>
                  <kpi.icon className="h-6 w-6" />
               </div>
               <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
              <p className="text-3xl font-black text-foreground mt-1 tabular-nums">
                {statsLoading ? "—" : kpi.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-6 flex flex-col">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-xs uppercase tracking-widest text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" /> Revenue & Job Performance
              </h3>
            </div>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ADFA1D" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ADFA1D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#ADFA1D" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-6">
               <h3 className="font-black text-xs uppercase tracking-widest text-foreground flex items-center gap-2">
                 <Truck className="h-4 w-4 text-blue-500" /> Fleet Distribution
               </h3>
               <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fleetData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {fleetData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex gap-4 justify-center">
                  {fleetData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                       <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">{d.name}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-[#0f1d35] border border-white/5 rounded-2xl p-6 text-white shadow-[0_8px_30px_rgba(20,41,76,0.12)] flex flex-col justify-between relative overflow-hidden group">
               {/* Subtle background glow */}
               <div className="absolute top-0 right-0 h-32 w-32 bg-[#F26B2A] rounded-full blur-[70px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
               <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2">
                     <Shield className="h-4 w-4 text-[#F26B2A]" />
                     <h3 className="font-black text-[10px] uppercase tracking-widest text-[#FF925E]">Recent Security</h3>
                  </div>
                  <div className="space-y-3">
                     {securityLogs && securityLogs.length > 0 ? securityLogs.map((log: any) => (
                       <div key={log.id} className="flex items-start gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors rounded-xl border border-white/5">
                          <Activity className="h-3 w-3 text-[#F26B2A] mt-0.5" />
                          <div>
                             <p className="text-[11px] font-bold leading-tight text-white/90">{log.event_type.replace('_', ' ')}</p>
                             <p className="text-[9px] text-white/50 flex items-center gap-1 mt-0.5">
                                <Clock className="h-2 w-2" /> {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                          </div>
                       </div>
                     )) : (
                       <p className="text-[10px] text-white/40 italic">No recent activity detected.</p>
                     )}
                  </div>
               </div>
               <Link to="/settings/profile" className="mt-4 relative z-10">
                  <Button className="w-full bg-white/5 hover:bg-[#F26B2A] border border-white/10 hover:border-transparent text-white font-black uppercase text-[10px] tracking-widest h-10 transition-all">
                     View Security Logs
                  </Button>
               </Link>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Jobs Table */}
        <div className="lg:col-span-2 bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b flex justify-between items-center bg-muted/30">
            <h3 className="font-black text-xs uppercase tracking-widest text-foreground flex items-center gap-2">
               <Briefcase className="h-4 w-4 text-accent" /> Recent Operational Activity
            </h3>
            <Link to="/job-orders" className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline">View All Jobs</Link>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold uppercase text-[9px] tracking-widest text-muted-foreground">ID</TableHead>
                <TableHead className="font-bold uppercase text-[9px] tracking-widest text-muted-foreground">Customer</TableHead>
                <TableHead className="font-bold uppercase text-[9px] tracking-widest text-muted-foreground">Route</TableHead>
                <TableHead className="font-bold uppercase text-[9px] tracking-widest text-muted-foreground">Status</TableHead>
                <TableHead className="text-right font-bold uppercase text-[9px] tracking-widest text-muted-foreground">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><div className="h-8 bg-muted/50 animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))
              ) : recentJobs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">No recent jobs found.</TableCell>
                </TableRow>
              ) : recentJobs?.map((job: any) => (
                <TableRow key={job.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-[9px] font-bold text-accent uppercase">{job.id.split('-')[0]}</TableCell>
                  <TableCell className="text-xs font-bold text-foreground">{job.customer?.company_name || 'N/A'}</TableCell>
                  <TableCell className="text-[10px] text-muted-foreground font-medium">{job.origin} → {job.destination}</TableCell>
                  <TableCell><StatusBadge status={job.status} /></TableCell>
                  <TableCell className="text-right font-black text-xs">{formatCurrency(job.total_amount_usd || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Status Breakdown / Quick Info */}
        <div className="space-y-6">
           <div className="bg-[#0f1d35] border border-white/5 rounded-3xl p-6 text-white shadow-[0_8px_30px_rgba(20,41,76,0.12)] space-y-6 relative overflow-hidden group">
              <div className="absolute -left-10 bottom-0 h-40 w-40 bg-[#F26B2A] rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF925E] relative z-10">Fleet Statistics</h4>
              <div className="space-y-5 relative z-10">
                 <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-xl bg-[#F26B2A]/20 flex items-center justify-center">
                          <Truck className="h-5 w-5 text-[#F26B2A]" />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-white/90">Total Vehicles</p>
                          <p className="text-[9px] text-white/50 uppercase font-black tracking-wider">Company Assets</p>
                       </div>
                    </div>
                    <span className="text-xl font-black text-white mr-2">--</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-xl bg-[#FF925E]/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-[#FF925E]" />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-white/90">Total Drivers</p>
                          <p className="text-[9px] text-white/50 uppercase font-black tracking-wider">Authorized Personnel</p>
                       </div>
                    </div>
                    <span className="text-xl font-black text-white mr-2">--</span>
                 </div>
              </div>
              <Link to="/fleet" className="block relative z-10">
                 <Button className="w-full bg-white/5 hover:bg-[#F26B2A] border border-white/10 text-white shadow-lg font-black uppercase text-[10px] tracking-widest h-11 mt-2 transition-all">
                    Manage Fleet
                 </Button>
              </Link>
           </div>

           <div className="bg-card rounded-2xl border p-6 shadow-sm mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">My Follow-ups</h4>
                <Link to="/crm/tasks" className="text-[9px] font-bold text-accent uppercase tracking-widest hover:underline">View All</Link>
              </div>
              <div className="space-y-3">
                {tasksLoading ? (
                  <div className="h-10 animate-pulse bg-muted rounded-xl" />
                ) : crmTasks?.length === 0 ? (
                  <div className="text-center py-4 bg-muted/30 rounded-xl flex flex-col items-center">
                    <CheckCircle className="h-5 w-5 text-emerald-500/50 mb-1" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Inbox Zero</p>
                  </div>
                ) : (
                  crmTasks?.slice(0, 3).map((t: any) => (
                    <Link key={t.id} to={`/crm/tasks`} className="block">
                      <div className="p-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-xl flex items-center gap-3">
                        <div className={cn("h-8 w-1 rounded-full", t.priority === 'urgent' ? 'bg-rose-500' : t.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{t.title}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">{t.customer?.company_name}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
           </div>

           <div className="bg-card rounded-2xl border p-6 shadow-sm border-dashed">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Quick Shortcuts</h4>
              <div className="grid grid-cols-2 gap-3">
                 {[
                   { label: "Rate Card", path: "/rate-card" },
                   { label: "Payments", path: "/payments" },
                   { label: "Docs", path: "/documents" },
                   { label: "Settings", path: "/users-roles" }
                 ].map(link => (
                   <Link key={link.path} to={link.path}>
                      <div className="p-3 bg-muted/30 rounded-xl text-center hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer">
                         <p className="text-[9px] font-black uppercase tracking-tighter">{link.label}</p>
                      </div>
                   </Link>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
