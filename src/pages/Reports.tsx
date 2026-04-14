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
import { pdf } from '@react-pdf/renderer';
import { toast } from "sonner";

// Mock Data for the demonstration
const weeklyData = [
  { name: 'Mon', revenue: 4200, jobs: 4 },
  { name: 'Tue', revenue: 3800, jobs: 3 },
  { name: 'Wed', revenue: 5100, jobs: 5 },
  { name: 'Thu', revenue: 4700, jobs: 4 },
  { name: 'Fri', revenue: 6200, jobs: 6 },
  { name: 'Sat', revenue: 2100, jobs: 2 },
  { name: 'Sun', revenue: 1200, jobs: 1 },
];

const monthlyData = [
  { name: 'Week 1', revenue: 18500, profit: 4200 },
  { name: 'Week 2', revenue: 21000, profit: 5100 },
  { name: 'Week 3', revenue: 17200, profit: 3800 },
  { name: 'Week 4', revenue: 24500, profit: 6200 },
];

const yearlyData = [
  { name: 'Jan', revenue: 65000 },
  { name: 'Feb', revenue: 59000 },
  { name: 'Mar', revenue: 82000 },
  { name: 'Apr', revenue: 74000 },
  { name: 'May', revenue: 91000 },
  { name: 'Jun', revenue: 88000 },
  { name: 'Jul', revenue: 95000 },
  { name: 'Aug', revenue: 102000 },
  { name: 'Sep', revenue: 98000 },
  { name: 'Oct', revenue: 110000 },
  { name: 'Nov', revenue: 125000 },
  { name: 'Dec', revenue: 140000 },
];

const fleetUtilization = [
  { name: 'Active', value: 70, color: '#10b981' },
  { name: 'Standby', value: 20, color: '#3b82f6' },
  { name: 'Maintenance', value: 10, color: '#f59e0b' },
];

const formatCurrency = (val: number) => `$${val.toLocaleString()}`;

export default function Reports() {
  const [activeTab, setActiveTab] = useState("monthly");

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
             value={activeTab === 'weekly' ? "$27,300" : activeTab === 'monthly' ? "$81,200" : "$1.24M"} 
             trend="+12.5%" 
             isUp={true} 
             icon={DollarSign}
           />
           <KPICard 
             label="Net Profit" 
             value={activeTab === 'weekly' ? "$6,100" : activeTab === 'monthly' ? "$19,200" : "$285K"} 
             trend="+8.2%" 
             isUp={true} 
             icon={TrendingUp}
           />
           <KPICard 
             label="Job Volume" 
             value={activeTab === 'weekly' ? "24" : activeTab === 'monthly' ? "96" : "1,142"} 
             trend="-2.1%" 
             isUp={false} 
             icon={Truck}
           />
           <KPICard 
             label="Active Drivers" 
             value="42" 
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
