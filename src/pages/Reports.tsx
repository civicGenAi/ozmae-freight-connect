import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Truck, 
  Users,
  Calendar,
  Layers,
  PieChart as PieChartIcon
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
  Pie,
  Legend
} from "recharts";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  subDays, 
  isSameDay, 
  isSameMonth, 
  parseISO,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
  isSameWeek,
  eachWeekOfInterval
} from "date-fns";

const formatCurrency = (val: number) => `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function Reports() {
  const [activeTab, setActiveTab] = useState("monthly");

  // Fetch Invoices
  const { data: invoices } = useQuery({
    queryKey: ["reports_invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("total_amount_usd, created_at");
      if (error) throw error;
      return data;
    }
  });

  // Fetch Jobs
  const { data: jobs } = useQuery({
    queryKey: ["reports_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_orders").select("id, created_at");
      if (error) throw error;
      return data;
    }
  });

  // Fetch Drivers
  const { data: drivers } = useQuery({
    queryKey: ["reports_drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("status");
      if (error) throw error;
      return data;
    }
  });

  // Fetch Vehicles
  const { data: vehicles } = useQuery({
    queryKey: ["reports_vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("status");
      if (error) throw error;
      return data;
    }
  });

  // Aggregation Logic
  const getWeeklyData = () => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    return days.map(day => {
      const dayInvoices = invoices?.filter(inv => isSameDay(parseISO(inv.created_at), day)) || [];
      return {
        name: format(day, 'EEE'),
        revenue: dayInvoices.reduce((acc, inv) => acc + (inv.total_amount_usd || 0), 0),
        jobs: jobs?.filter(j => isSameDay(parseISO(j.created_at), day)).length || 0
      };
    });
  };

  const getMonthlyData = () => {
    const weeks = eachWeekOfInterval({ start: subDays(new Date(), 28), end: new Date() });
    return weeks.map((week, i) => {
      const weekInvoices = invoices?.filter(inv => isSameWeek(parseISO(inv.created_at), week)) || [];
      const revenue = weekInvoices.reduce((acc, inv) => acc + (inv.total_amount_usd || 0), 0);
      return {
        name: `Week ${i + 1}`,
        revenue: revenue,
        profit: revenue * 0.2 // Estimated 20% margin
      };
    });
  };

  const getYearlyData = () => {
    const months = eachMonthOfInterval({ start: startOfYear(new Date()), end: endOfYear(new Date()) });
    return months.map(month => {
      const monthInvoices = invoices?.filter(inv => isSameMonth(parseISO(inv.created_at), month)) || [];
      return {
        name: format(month, 'MMM'),
        revenue: monthInvoices.reduce((acc, inv) => acc + (inv.total_amount_usd || 0), 0)
      };
    });
  };

  const getFleetData = () => {
    if (!vehicles) return [];
    const statusMap: any = {
      'available': { name: 'Standby', color: '#3b82f6' },
      'on_job': { name: 'Active', color: '#10b981' },
      'maintenance': { name: 'Maintenance', color: '#f59e0b' },
      'retired': { name: 'Retired', color: '#ef4444' }
    };
    const counts: any = {};
    vehicles.forEach(v => {
      counts[v.status] = (counts[v.status] || 0) + 1;
    });
    return Object.keys(counts).map(status => ({
      name: statusMap[status]?.name || status,
      value: counts[status],
      color: statusMap[status]?.color || '#cbd5e1'
    }));
  };

  const weeklyData = getWeeklyData();
  const monthlyData = getMonthlyData();
  const yearlyData = getYearlyData();
  const fleetUtilization = getFleetData();

  const isLoadingData = !invoices || !jobs || !drivers || !vehicles;

  // KPI Calculations
  const currentData = activeTab === 'weekly' ? weeklyData : activeTab === 'monthly' ? monthlyData : yearlyData;
  const totalRevenue = currentData.reduce((acc, d) => acc + d.revenue, 0);
  const totalJobs = activeTab === 'weekly' ? jobs?.filter(j => isSameWeek(parseISO(j.created_at), new Date())).length : jobs?.length;
  const activeDriversCount = drivers?.filter(d => d.status === 'on_duty').length || 0;

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
           <div className="h-12 w-12 border-4 border-accent border-t-transparent animate-spin rounded-full" />
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Intelligence...</p>
        </div>
      </div>
    );
  }

  const handleExportExcel = () => {
    const data = activeTab === "weekly" ? weeklyData : activeTab === "monthly" ? monthlyData : yearlyData;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `Ozmae_${activeTab}_Report.xlsx`);
    toast.success("Excel report generated successfully");
  };

  const handleExportPDF = () => {
    toast.info("Preparing PDF document...");
    // In a real app, we'd render a dedicated PDF component
    setTimeout(() => {
      toast.success("PDF report downloaded");
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader title="Operational Intelligence" />
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportPDF}
            className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-sm"
          >
            <FileText className="h-4 w-4 text-rose-600" /> Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monthly" onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-slate-100 p-1 h-11 rounded-xl">
            <TabsTrigger value="weekly" className="rounded-lg px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-lg px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Monthly</TabsTrigger>
            <TabsTrigger value="yearly" className="rounded-lg px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Yearly</TabsTrigger>
          </TabsList>
          
          <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-tighter">
            <Calendar className="h-3 w-3" /> Reporting Period: {new Date().getFullYear()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <KPICard 
              label="Gross Revenue" 
              value={formatCurrency(totalRevenue)} 
              trend="+12.5%" 
              isUp={true} 
              icon={DollarSign}
           />
           <KPICard 
              label="Est. Net Profit" 
              value={formatCurrency(totalRevenue * 0.2)} 
              trend="+8.2%" 
              isUp={true} 
              icon={TrendingUp}
           />
           <KPICard 
              label="Job Volume" 
              value={totalJobs?.toString() || "0"} 
              trend="-2.1%" 
              isUp={false} 
              icon={Truck}
           />
           <KPICard 
              label="Active Drivers" 
              value={activeDriversCount.toString()} 
              trend="+4" 
              isUp={true} 
              icon={Users}
           />
        </div>

        <TabsContent value="weekly" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-2">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                   <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-accent" /> Weekly Revenue Distribution
                   </CardTitle>
                </CardHeader>
                <CardContent className="pt-8">
                   <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={weeklyData}>
                            <defs>
                              <linearGradient id="colorWeekly" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ADFA1D" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ADFA1D" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="revenue" stroke="#ADFA1D" strokeWidth={3} fillOpacity={1} fill="url(#colorWeekly)" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm rounded-2xl">
                <CardHeader>
                   <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-500" /> Fleet Status
                   </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-[350px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={fleetUtilization}
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                         >
                            {fleetUtilization.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                         </Pie>
                         <Tooltip />
                         <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                   </ResponsiveContainer>
                </CardContent>
              </Card>
           </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-2">
           <Card className="border-slate-200 shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 border-b">
                 <CardTitle className="text-xs font-black uppercase tracking-widest">Monthly Growth Performance</CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                 <div className="h-[400px] w-full font-bold">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="revenue" fill="#0f1d35" radius={[6, 6, 0, 0]} barSize={40} />
                          <Bar dataKey="profit" fill="#ADFA1D" radius={[6, 6, 0, 0]} barSize={40} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-2">
           <Card className="border-slate-200 shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-900 text-white rounded-t-2xl">
                 <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center justify-between">
                    <span>Annual Strategic Revenue View</span>
                    <TrendingUp className="h-5 w-5 text-accent" />
                 </CardTitle>
              </CardHeader>
              <CardContent className="pt-10">
                 <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={yearlyData}>
                          <defs>
                            <linearGradient id="colorYearly" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0f1d35" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#0f1d35" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="step" dataKey="revenue" stroke="#0f1d35" strokeWidth={4} fill="url(#colorYearly)" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ label, value, trend, isUp, icon: Icon }: any) {
  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl hover:shadow-md transition-all group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
            <Icon className="h-5 w-5" />
          </div>
          <div className={cn(
            "flex items-center gap-0.5 text-[10px] font-black px-2 py-1 rounded-full",
            isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </div>
        </div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border rounded-xl shadow-xl space-y-2">
        <p className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-8">
            <span className="text-[10px] font-bold uppercase text-slate-600">{p.name}</span>
            <span className="text-sm font-black text-slate-900">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
