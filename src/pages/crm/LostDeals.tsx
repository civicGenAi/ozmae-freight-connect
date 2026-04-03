import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeclineReasons, useCustomerInteractions } from "@/hooks/useCrm";
import { cn } from "@/lib/utils";
import { AlertCircle, TrendingDown, Clock, Search } from "lucide-react";

export default function LostDeals() {
  const { data: declines, isLoading } = useDeclineReasons();
  const { data: allInteractions } = useCustomerInteractions();

  if (isLoading) {
    return <div className="p-12 text-center animate-pulse font-bold text-muted-foreground">Analyzing Lost Deals...</div>;
  }

  const list = declines || [];
  
  const totalValue = list.reduce((sum, d) => sum + (d.deal_value_usd || 0), 0);
  const declinedLeads = list.filter(d => Boolean(d.lead_id)).length;
  const declinedQuotes = list.filter(d => Boolean(d.quotation_id)).length;

  const reasonsCount = list.reduce((acc: Record<string, number>, curr) => {
    acc[curr.reason_category] = (acc[curr.reason_category] || 0) + 1;
    return acc;
  }, {});

  const sortedReasons = Object.entries(reasonsCount)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count, pct: Math.round((count / list.length) * 100) || 0 }));

  const topReason = sortedReasons.length > 0 ? sortedReasons[0].category.replace(/_/g, " ") : "N/A";

  const hasFollowedUp = (customerId: string, declineDate: string) => {
    if (!allInteractions) return false;
    return allInteractions.some(i => i.customer_id === customerId && new Date(i.created_at) > new Date(declineDate));
  };

  const humanizeReason = (cat: string) => {
    const map: Record<string, string> = {
      price_too_high: "Price too high",
      chose_competitor: "Lost to competitor",
      no_longer_needed: "Requirement dissolved",
      timing: "Schedule mismatch",
      service_mismatch: "Service limitations",
      bad_experience: "Previous bad experience",
      other: "Other"
    };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Lost Deals Analysis" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card p-4 rounded-xl border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Declined Leads</p>
          <p className="text-2xl font-black text-rose-600">{declinedLeads}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Declined Quotes</p>
          <p className="text-2xl font-black text-purple-600">{declinedQuotes}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Pipeline Value Lost</p>
          <p className="text-2xl font-black text-foreground">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValue)}
          </p>
        </div>
        <div className="bg-card p-4 rounded-xl border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Top Reason</p>
          <p className="text-sm font-bold capitalize pt-1">{topReason}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-rose-500" /> Rejection Patterns
          </h3>
          <div className="space-y-4">
            {sortedReasons.map(r => (
              <div key={r.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{humanizeReason(r.category)}</span>
                  <span>{r.count} ({r.pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-rose-400 rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-card border rounded-2xl p-6 shadow-sm">
           <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-2">
             <AlertCircle className="h-4 w-4 text-accent" /> Actionable Insights
           </h3>
           <p className="text-sm text-muted-foreground mb-6">AI generated summary of pipeline leaks over the current period.</p>
           
           <div className="space-y-3">
             <div className="p-4 bg-muted/30 rounded-xl border border-dashed text-sm text-foreground">
               <span className="font-bold text-rose-600">Pricing pressure:</span> {sortedReasons.find(r => r.category === 'price_too_high')?.count || 0} deals were lost purely on price constraints.
             </div>
             {sortedReasons.find(r => r.category === 'chose_competitor') && (
               <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-900 border-dashed">
                 <span className="font-bold">Competitor threat:</span> You are actively losing deals. Consider tracking which competitor is winning in the UI.
               </div>
             )}
             <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-900 border-dashed">
               <span className="font-bold">Recovery:</span> Ensure your sales team logs follow-up calls within 30 days of a decline to stay top of mind.
             </div>
           </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
         <div className="p-4 border-b bg-muted/30 font-black text-xs tracking-widest uppercase">
           Recent Declines Manifest
         </div>
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Date</TableHead>
               <TableHead>Type</TableHead>
               <TableHead>Customer</TableHead>
               <TableHead>Reason</TableHead>
               <TableHead>Value Lost</TableHead>
               <TableHead>Followed Up</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {list.map(d => {
               const followed = hasFollowedUp(d.customer_id, d.created_at);
               return (
                 <TableRow key={d.id}>
                   <TableCell className="text-xs">
                     <p className="font-bold">{new Date(d.created_at).toLocaleDateString()}</p>
                     <p className="text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                   </TableCell>
                   <TableCell>
                     <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest", d.quotation_id ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800")}>
                       {d.quotation_id ? "Quote" : "Lead"}
                     </span>
                   </TableCell>
                   <TableCell className="font-bold text-sm">{d.customer?.company_name}</TableCell>
                   <TableCell>
                     <p className="text-sm font-semibold">{humanizeReason(d.reason_category)}</p>
                     {(d.competitor_name || d.details) && (
                       <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                         {d.competitor_name ? `To: ${d.competitor_name}` : d.details}
                       </p>
                     )}
                   </TableCell>
                   <TableCell className="font-mono text-xs font-bold text-rose-600">
                     {d.deal_value_usd ? `$${d.deal_value_usd.toLocaleString()}` : '-'}
                   </TableCell>
                   <TableCell>
                     {followed ? (
                       <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Yes</span>
                     ) : (
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-2 py-1 rounded">No</span>
                         <Button size="sm" variant="outline" className="h-6 text-[10px] uppercase font-bold px-2">Log Follow-up</Button>
                       </div>
                     )}
                   </TableCell>
                 </TableRow>
               );
             })}
           </TableBody>
         </Table>
      </div>
    </div>
  );
}
