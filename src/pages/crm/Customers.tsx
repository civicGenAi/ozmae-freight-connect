import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Phone, MessageSquare, Plus, ActivitySquare, AlertCircle } from "lucide-react";
import { useCustomerHealth } from "@/hooks/useCrm";
import { LogInteractionDrawer } from "@/components/LogInteractionDrawer";
import { cn } from "@/lib/utils";

const tabs = ["All", "Prospect", "Excellent", "Good", "At Risk", "Inactive", "Lost"];

const HealthBadge = ({ label }: { label: string }) => {
  const map: Record<string, string> = {
    excellent: "bg-emerald-100 text-emerald-800 border-emerald-200",
    good: "bg-blue-100 text-blue-800 border-blue-200",
    at_risk: "bg-amber-100 text-amber-800 border-amber-200",
    inactive: "bg-slate-100 text-slate-800 border-slate-200",
    lost: "bg-rose-100 text-rose-800 border-rose-200",
    prospect: "bg-purple-100 text-purple-800 border-purple-200"
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border", map[label] || map.inactive)}>
      {label.replace("_", " ")}
    </span>
  );
};

export default function Customers() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [interactionDrawerOpen, setInteractionDrawerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>();
  
  const { data: healthData, isLoading } = useCustomerHealth() as { data: any[] | undefined, isLoading: boolean };

  const filtered = healthData?.filter(h => {
    const label = h.health_label || 'inactive';
    const matchesTab = activeTab === "All" || label === activeTab.toLowerCase().replace(" ", "_");
    const matchesSearch = 
      h.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      h.display_contact?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const openLogInteraction = (e: React.MouseEvent, cid: string | null, lid?: string) => {
    e.stopPropagation();
    setSelectedCustomerId(cid || undefined);
    setSelectedLeadId(lid);
    setInteractionDrawerOpen(true);
  };

  const openAddTask = (e: React.MouseEvent, cid: string | null, lid?: string) => {
    e.stopPropagation();
    setSelectedCustomerId(cid || undefined);
    setSelectedLeadId(lid);
    setInteractionDrawerOpen(true); 
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Customers Portfolio">
        <Button onClick={() => navigate("/settings/company")} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex bg-muted p-1 rounded-lg overflow-x-auto max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap",
                activeTab === tab 
                  ? "bg-card text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search company or contact..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Health Score</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead className="text-center">Last Activity</TableHead>
              <TableHead className="text-center">Open Jobs</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                    <p>No customers found matching this criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered?.map((h) => (
              <TableRow 
                key={h.type === 'prospect' ? `l-${h.lead_id}` : `c-${h.customer_id}`} 
                className="cursor-pointer hover:bg-muted/30 transition-colors group"
                onClick={() => h.type === 'customer' && navigate(`/crm/customers/${h.customer_id}`)}
              >
                <TableCell>
                  <p className="font-bold text-foreground text-sm">{h.display_name}</p>
                  <p className={cn("text-[10px] flex items-center gap-1", h.type === 'prospect' ? "text-purple-600 font-medium" : "text-muted-foreground")}>
                    {h.type === 'prospect' && <Plus className="w-2.5 h-2.5" />}
                    {h.display_contact || 'No contact named'}
                  </p>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{h.display_location}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <HealthBadge label={h.health_label || 'inactive'} />
                    {h.type === 'customer' && (
                       <span className="text-[10px] text-muted-foreground font-mono">{h.health_score ?? 0}/100</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(h.total_revenue_usd || 0)}
                </TableCell>
                <TableCell className="text-center">
                  <p className="text-xs font-medium">{h.days_since_last_activity !== null ? `${h.days_since_last_activity} days ago` : 'Never'}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">{h.last_interaction_date ? new Date(h.last_interaction_date).toLocaleDateString() : ''}</p>
                </TableCell>
                <TableCell className="text-center font-bold text-xs">
                  {h.total_jobs || 0}
                </TableCell>
                <TableCell className={cn("text-right font-mono text-xs font-bold", (h.outstanding_balance_usd || 0) > 0 ? "text-rose-600" : "text-emerald-600")}>
                  {(h.outstanding_balance_usd || 0) > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(h.outstanding_balance_usd) : 'Paid'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={(e) => openLogInteraction(e, h.customer_id, h.lead_id)} title="Log Interaction">
                      <Phone className="h-3.5 w-3.5 text-accent" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={(e) => openAddTask(e, h.customer_id, h.lead_id)} title="Add Task">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LogInteractionDrawer 
        open={interactionDrawerOpen} 
        onOpenChange={setInteractionDrawerOpen} 
        customerId={selectedCustomerId}
        leadId={selectedLeadId}
      />
    </div>
  );
}
