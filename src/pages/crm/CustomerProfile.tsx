import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { 
  Phone, Mail, MapPin, Briefcase, DollarSign, Activity, Truck, 
  CheckCircle, Clock, AlertTriangle, FileText, Calendar 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCustomerHealth, useCustomerTimeline, useCustomerInteractions, useCrmTasks } from "@/hooks/useCrm";
import { LogInteractionDrawer } from "@/components/LogInteractionDrawer";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

const HealthRing = ({ score, label }: { score: number, label: string }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const colors: Record<string, string> = {
    excellent: "#10b981",
    good: "#3b82f6",
    at_risk: "#f59e0b",
    inactive: "#94a3b8",
    lost: "#ef4444"
  };
  
  const color = colors[label] || colors.inactive;

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
        <circle 
          cx="64" cy="64" r={radius} stroke={color} strokeWidth="8" fill="transparent" 
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black tabular-nums tracking-tighter" style={{ color }}>{score}</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{label.replace("_", " ")}</span>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, highlight, isWarning }: { label: string, value: string | number, highlight?: boolean, isWarning?: boolean }) => (
  <div className={cn("p-3 bg-muted/30 rounded-lg border", isWarning ? "border-rose-200 bg-rose-50/50" : "")}>
    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-1">{label}</p>
    <p className={cn("text-lg font-black tabular-nums", isWarning ? "text-rose-600" : highlight ? "text-foreground" : "text-muted-foreground")}>
      {value}
    </p>
  </div>
);

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const customerId = id as string;
  const [activeTab, setActiveTab] = useState("Activity");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState("All");

  const { data: health, isLoading: healthLoading } = useCustomerHealth(customerId);
  const { data: timelineData, isLoading: timelineLoading } = useCustomerTimeline(customerId);
  const { data: tasks } = useCrmTasks({ customerId });

  const formatMoney = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const getRelativeTime = (dateString: string) => {
    const d = new Date(dateString);
    const diff = (new Date().getTime() - d.getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return formatDate(dateString);
  };

  const filteredTimeline = timelineData?.filter(e => {
    if (timelineFilter === "All") return true;
    if (timelineFilter === "Calls & Meetings") return e.event_type === 'interaction_logged';
    if (timelineFilter === "Quotes") return e.event_type.startsWith('quote_');
    if (timelineFilter === "Jobs") return e.event_type.startsWith('job_');
    if (timelineFilter === "Payments") return e.event_type === 'invoice_issued' || e.event_type === 'payment_received';
    return true;
  });

  if (healthLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse font-bold">Loading Customer Dossier...</div>;
  }

  if (!health) {
    return <div className="p-12 text-center text-muted-foreground">Customer data not found.</div>;
  }

  const c = health.customer!;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-80px)]">
      {/* Left Column: Fixed Width Profile Panel */}
      <div className="w-full lg:w-[320px] shrink-0 bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
        <div className="p-6 border-b space-y-4">
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight leading-tight">{c.company_name}</h1>
            <Button variant="link" className="h-auto p-0 text-[10px] uppercase font-bold text-accent tracking-widest mt-1">Edit Profile details</Button>
          </div>

          <div className="space-y-2 text-sm">
            {c.contact_person && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" /> <span className="font-medium text-foreground">{c.contact_person}</span>
              </div>
            )}
            {c.phone && (
              <div className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
                <Phone className="h-4 w-4" /> <a href={`tel:${c.phone}`} className="font-medium">{c.phone}</a>
              </div>
            )}
            {c.email && (
              <div className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
                <Mail className="h-4 w-4" /> <a href={`mailto:${c.email}`} className="font-medium break-all">{c.email}</a>
              </div>
            )}
            {c.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> <span>{c.address ? `${c.address}, ` : ''}{c.city}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border rounded-xl rounded-tl-none relative">
            <div className="absolute top-0 left-0 w-2 h-full rounded-l-xl" style={{ backgroundColor: health.health_label === 'lost' ? '#ef4444' : health.health_label === 'at_risk' ? '#f59e0b' : '#10b981' }} />
            <h4 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-4 w-full text-center">Relationship Health</h4>
            <HealthRing score={health.health_score} label={health.health_label} />
            <p className="text-[9px] text-muted-foreground mt-4">Updated: {formatDate(health.updated_at)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Total Jobs" value={health.total_jobs} highlight />
            <MetricCard label="Win Rate" value={`${Math.round(health.win_rate_pct)}%`} highlight={health.win_rate_pct > 50} />
            <MetricCard label="Avg Deal" value={formatMoney(health.avg_deal_size_usd)} />
            <MetricCard label="Total Rev" value={formatMoney(health.total_revenue_usd)} />
            <MetricCard label="Outstanding" value={formatMoney(health.outstanding_balance_usd)} isWarning={health.outstanding_balance_usd > 0} />
            <MetricCard label="Days Inactive" value={health.days_since_last_activity ?? 'N/A'} isWarning={(health.days_since_last_activity || 0) > 60} />
          </div>

          {health.preferred_route && (
            <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-xl space-y-2">
              <h4 className="text-[10px] uppercase tracking-widest font-black text-blue-800 flex items-center gap-2">
                <Truck className="h-3 w-3" /> Preferred Logistics
              </h4>
              <p className="text-sm font-bold text-foreground">{health.preferred_route}</p>
              <p className="text-xs text-muted-foreground">{health.preferred_vehicle_type || 'Mixed Fleet'}, {health.most_common_cargo_type || 'General Cargo'}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-muted/10 space-y-2 shrink-0">
          <Button onClick={() => setDrawerOpen(true)} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-accent/20">
            Log Interaction
          </Button>
          <Button variant="outline" className="w-full font-black uppercase text-[10px] tracking-widest h-10">
            Add Task
          </Button>
        </div>
      </div>

      {/* Right Column: Flexible Tabs Panel */}
      <div className="flex-1 bg-card border rounded-2xl shadow-sm flex flex-col min-w-0 h-full overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b overflow-x-auto shrink-0 scrollbar-hide">
          {["Activity", "Deals", "Jobs", "Financial", "Tasks", "Documents"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border-b-2",
                activeTab === tab 
                  ? "border-accent text-accent bg-accent/5" 
                  : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          {activeTab === "Activity" && (
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-xl border shadow-sm sticky top-0 z-10 overflow-x-auto">
                {["All", "Calls & Meetings", "Quotes", "Jobs", "Payments"].map(f => (
                  <button 
                    key={f} 
                    onClick={() => setTimelineFilter(f)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors",
                      timelineFilter === f ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {timelineLoading ? (
                <div className="space-y-8 animate-pulse">
                  {[1,2,3].map(i => <div key={i} className="flex gap-4"><div className="w-4 h-4 rounded-full bg-muted"/><div className="h-16 flex-1 bg-muted rounded-xl"/></div>)}
                </div>
              ) : filteredTimeline?.length === 0 ? (
                <div className="text-center py-20 bg-white border border-dashed rounded-2xl">
                  <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-sm font-bold mb-1">No Activity Found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">Log your first interaction or create a quote to start tracking this customer's history.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-12 pb-12">
                  {filteredTimeline?.map((evt, idx) => {
                    const colorMap: Record<string, string> = {
                      blue: "bg-blue-500 ring-blue-100",
                      green: "bg-emerald-500 ring-emerald-100",
                      amber: "bg-amber-500 ring-amber-100",
                      red: "bg-rose-500 ring-rose-100",
                      purple: "bg-purple-500 ring-purple-100",
                      teal: "bg-teal-500 ring-teal-100",
                      gray: "bg-slate-500 ring-slate-100",
                    };
                    const dotClass = colorMap[evt.icon_color] || colorMap.gray;

                    return (
                      <div key={evt.id} className="relative pl-8 group">
                        <div className={cn("absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 shadow-sm transition-transform group-hover:scale-125", dotClass)} />
                        
                        <div className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all group-hover:border-slate-300">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                              {evt.title}
                              {evt.linked_record_label && (
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider cursor-pointer hover:bg-slate-200">
                                  {evt.linked_record_label}
                                </span>
                              )}
                            </h4>
                            <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap ml-4">
                              {getRelativeTime(evt.event_at)}
                            </span>
                          </div>
                          
                          {evt.detail && <p className="text-sm text-slate-600 mb-2">{evt.detail}</p>}
                          
                          {evt.actor_name && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                              {evt.actor_avatar ? (
                                <img src={evt.actor_avatar} alt="" className="w-5 h-5 rounded-full" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[8px] font-bold text-accent">
                                  {evt.actor_name.charAt(0)}
                                </div>
                              )}
                              <span className="text-xs text-muted-foreground">Logged by <span className="font-medium text-foreground">{evt.actor_name}</span></span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "Tasks" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-lg">Follow-up Tasks</h3>
                <Button className="h-8 text-xs font-bold uppercase tracking-widest bg-accent hover:bg-accent/90">Add Task</Button>
              </div>
              
              {!tasks || tasks.length === 0 ? (
                <div className="text-center py-20 bg-white border border-dashed rounded-2xl">
                  <CheckCircle className="h-10 w-10 text-emerald-500/30 mx-auto mb-3" />
                  <h3 className="text-sm font-bold">All caught up!</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(t => (
                    <div key={t.id} className={cn("bg-white border p-4 rounded-xl flex justify-between items-center", t.status === 'done' ? 'opacity-60' : '')}>
                      <div className="flex items-center gap-4">
                        <div className={cn("w-2 h-10 rounded-full", t.status === 'done' ? 'bg-emerald-500' : t.priority === 'urgent' ? 'bg-rose-500' : t.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500')} />
                        <div>
                          <p className={cn("font-bold text-sm", t.status === 'done' ? 'line-through text-muted-foreground' : '')}>{t.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" /> Due: {formatDate(t.due_date)}
                            <span className="ml-2 inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[9px] uppercase font-bold tracking-widest">{t.priority}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {t.status !== 'done' && <Button variant="outline" size="sm" className="h-8 text-xs">Mark Done</Button>}
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">Edit</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeTab === "Deals" || activeTab === "Jobs" || activeTab === "Financial" || activeTab === "Documents") && (
            <div className="text-center py-32 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <h3 className="font-bold mb-1">Placeholder for {activeTab}</h3>
              <p className="text-xs">Tab specific implementation mapped in routing layout.</p>
            </div>
          )}
        </div>
      </div>

      <LogInteractionDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
        customerId={customerId}
      />
    </div>
  );
}
