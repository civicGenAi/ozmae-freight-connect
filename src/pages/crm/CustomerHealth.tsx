import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Phone, MessageSquare, AlertTriangle } from "lucide-react";
import { useCustomerHealth } from "@/hooks/useCrm";
import { cn } from "@/lib/utils";

const HealthBadge = ({ label }: { label: string }) => {
  const map: Record<string, string> = {
    excellent: "bg-emerald-100 text-emerald-800",
    good: "bg-blue-100 text-blue-800",
    at_risk: "bg-amber-100 text-amber-800",
    inactive: "bg-slate-200 text-slate-800",
    lost: "bg-rose-100 text-rose-800"
  };
  return (
    <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest", map[label] || map.inactive)}>
      {label.replace("_", " ")}
    </span>
  );
};

export default function CustomerHealth() {
  const navigate = useNavigate();
  const { data: healthData, isLoading } = useCustomerHealth();

  if (isLoading) {
    return <div className="p-12 text-center animate-pulse font-bold text-muted-foreground">Loading Health Metrics...</div>;
  }

  const all = Array.isArray(healthData) ? healthData : [];
  const total = all.length;
  const counts = {
    excellent: all.filter(h => h.health_label === 'excellent').length,
    good: all.filter(h => h.health_label === 'good').length,
    at_risk: all.filter(h => h.health_label === 'at_risk').length,
    inactive: all.filter(h => h.health_label === 'inactive').length,
    lost: all.filter(h => h.health_label === 'lost').length,
  };

  const Card = ({ title, count, colorClass }: any) => (
    <div className={cn("p-4 rounded-xl border", colorClass)}>
      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{title}</h4>
      <p className="text-3xl font-black">{count}</p>
    </div>
  );

  const getRecommendedAction = (h: any) => {
    if ((h.days_since_last_activity ?? 0) > 180) return "Send re-engagement message";
    if (h.outstanding_balance_usd > 0) return "Follow up on outstanding payment";
    if (h.win_rate_pct < 30 && h.total_quotes_sent > 3) return "Review pricing for this customer";
    if ((h.days_since_last_activity ?? 0) > 90 && h.outstanding_balance_usd === 0) return "Schedule a check-in call";
    return "Monitor relationship";
  };

  const atRisk = all.filter(h => ['at_risk', 'inactive', 'lost'].includes(h.health_label));

  return (
    <div className="space-y-8">
      <PageHeader title="Customer Portfolio Health">
        <Button variant="outline" className="gap-2" onClick={() => navigate("/crm/customers")}>
          View All Customers
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card title="Total" count={total} colorClass="bg-card" />
        <Card title="Excellent" count={counts.excellent} colorClass="bg-emerald-50 text-emerald-900 border-emerald-100" />
        <Card title="Good" count={counts.good} colorClass="bg-blue-50 text-blue-900 border-blue-100" />
        <Card title="At Risk" count={counts.at_risk} colorClass="bg-amber-50 text-amber-900 border-amber-100" />
        <Card title="Inactive" count={counts.inactive} colorClass="bg-slate-100 text-slate-800 border-slate-200" />
        <Card title="Lost" count={counts.lost} colorClass="bg-rose-50 text-rose-900 border-rose-100" />
      </div>

      <div className="bg-card rounded-2xl border p-6 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest mb-4">Health Distribution</h3>
        <div className="h-4 flex rounded-full overflow-hidden w-full bg-slate-100">
          <div style={{ width: `${(counts.excellent / total) * 100}%` }} className="bg-emerald-500 h-full" title="Excellent" />
          <div style={{ width: `${(counts.good / total) * 100}%` }} className="bg-blue-500 h-full" title="Good" />
          <div style={{ width: `${(counts.at_risk / total) * 100}%` }} className="bg-amber-500 h-full" title="At Risk" />
          <div style={{ width: `${(counts.inactive / total) * 100}%` }} className="bg-slate-400 h-full" title="Inactive" />
          <div style={{ width: `${(counts.lost / total) * 100}%` }} className="bg-rose-500 h-full" title="Lost" />
        </div>
        <div className="flex gap-4 mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground justify-center">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Excellent</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"/> Good</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"/> At Risk</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400"/> Inactive</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"/> Lost</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-rose-50/30 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          <h3 className="font-black text-rose-900 text-sm tracking-tight">Accounts Requiring Attention</h3>
        </div>
        
        {atRisk.length === 0 ? (
          <div className="p-12 text-center text-emerald-600 font-bold">No accounts currently at risk. Great job!</div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Health Score</TableHead>
                <TableHead>Days Inactive</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Recommended Action</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRisk.map(h => (
                <TableRow key={h.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/crm/customers/${h.customer_id}`)}>
                  <TableCell className="font-bold text-sm">{h.customer?.company_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <HealthBadge label={h.health_label} />
                      <span className="font-mono text-xs">{h.health_score}/100</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-rose-600 font-bold font-mono">
                    {h.days_since_last_activity || '999+'} <span className="text-muted-foreground font-sans font-medium text-xs">days</span>
                  </TableCell>
                  <TableCell className={cn("text-right font-mono font-bold text-xs", h.outstanding_balance_usd > 0 ? "text-rose-600" : "text-emerald-600")}>
                    ${h.outstanding_balance_usd.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700 bg-amber-50/50">
                    {getRecommendedAction(h)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" className="h-7 w-7" title="Log Interaction" onClick={(e) => { e.stopPropagation(); }}>
                        <Phone className="h-3.5 w-3.5 text-accent" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-7 w-7" title="Add Task" onClick={(e) => { e.stopPropagation(); }}>
                        <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
