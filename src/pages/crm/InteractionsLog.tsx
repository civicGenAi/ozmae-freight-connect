import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, Search, Phone, PhoneIncoming, MessageCircle, 
  Mail, MailCheck, Users as UsersIcon, MapPin, FileText, 
  ChevronDown, ChevronUp, Clock 
} from "lucide-react";
import { useCustomerInteractions } from "@/hooks/useCrm";
import { LogInteractionDrawer } from "@/components/LogInteractionDrawer";
import { cn } from "@/lib/utils";

const getTypeProps = (type: string) => {
  const map: Record<string, { icon: any, label: string }> = {
    call_outbound: { icon: Phone, label: "Outbound Call" },
    call_inbound: { icon: PhoneIncoming, label: "Inbound Call" },
    whatsapp: { icon: MessageCircle, label: "WhatsApp" },
    email_sent: { icon: Mail, label: "Email Sent" },
    email_received: { icon: MailCheck, label: "Email Received" },
    meeting: { icon: UsersIcon, label: "Meeting" },
    site_visit: { icon: MapPin, label: "Site Visit" },
    note: { icon: FileText, label: "Note" },
  };
  return map[type] || map.note;
};

const OutcomeBadge = ({ outcome }: { outcome?: string | null }) => {
  if (!outcome) return <span className="text-muted-foreground">-</span>;
  
  const map: Record<string, string> = {
    interested: "bg-emerald-100 text-emerald-800",
    converted: "bg-blue-100 text-blue-800",
    follow_up_required: "bg-amber-100 text-amber-800",
    not_interested: "bg-slate-100 text-slate-800",
    declined: "bg-rose-100 text-rose-800",
    no_answer: "bg-slate-100 text-slate-600",
    information_shared: "bg-purple-100 text-purple-800"
  };

  return (
    <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest", map[outcome] || "bg-muted text-muted-foreground")}>
      {outcome.replace("_", " ")}
    </span>
  );
};

export default function InteractionsLog() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: interactions, isLoading } = useCustomerInteractions();

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const filtered = interactions?.filter(i => 
    i.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Interactions Log">
        <Button onClick={() => setDrawerOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> Log Interaction
        </Button>
      </PageHeader>

      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by customer or subject..." 
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Mock Filter dropdowns would go here */}
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-1/3">Subject</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Logged By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading interactions...</TableCell></TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No interactions logged yet.</TableCell></TableRow>
            ) : filtered?.map((interaction) => {
              const isExpanded = expandedIds.has(interaction.id);
              const { icon: TypeIcon, label: typeLabel } = getTypeProps(interaction.interaction_type);

              return (
                <React.Fragment key={interaction.id}>
                  <TableRow 
                    className={cn("cursor-pointer transition-colors", isExpanded ? "bg-muted/30" : "hover:bg-muted/10")} 
                    onClick={(e) => toggleExpand(interaction.id, e)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-semibold text-foreground">{new Date(interaction.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-2 w-2" />
                        {new Date(interaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <TypeIcon className="h-4 w-4 text-accent" />
                        {typeLabel}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-sm text-foreground">{interaction.customer?.company_name}</TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]">{interaction.subject}</TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={interaction.outcome} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        {interaction.logger?.avatar_url ? (
                          <img src={interaction.logger.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">
                            {interaction.logger?.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="text-muted-foreground">{interaction.logger?.full_name || 'System'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-muted/10">
                      <TableCell colSpan={7} className="p-0 border-b">
                        <div className="p-6 ml-8 max-w-4xl space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Interaction Summary</h4>
                            <p className="text-sm leading-relaxed text-foreground bg-white p-4 rounded-xl border border-dashed shadow-sm">
                              {interaction.summary}
                            </p>
                          </div>
                          
                          {interaction.next_action && (
                            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                              <div className="mt-0.5"><Clock className="h-4 w-4 text-amber-600" /></div>
                              <div>
                                <h4 className="text-[10px] uppercase font-black tracking-widest text-amber-800 mb-1">Next Action Required</h4>
                                <p className="text-sm font-semibold text-slate-900">{interaction.next_action}</p>
                                <p className="text-xs text-amber-700 mt-1">Due: {interaction.next_action_date ? new Date(interaction.next_action_date).toLocaleDateString() : 'Unscheduled'}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            {(interaction.lead || interaction.quotation || interaction.job_order) && (
                              <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-slate-100 rounded text-slate-600 flex items-center gap-2">
                                Linked context: 
                                {interaction.lead && <span className="text-blue-600 cursor-pointer">{interaction.lead.lead_number || 'Lead ' + interaction.lead.id.split('-')[0]}</span>}
                                {interaction.quotation && <span className="text-purple-600 cursor-pointer">{interaction.quotation.quote_number || 'Quote ' + interaction.quotation.id.split('-')[0]}</span>}
                                {interaction.job_order && <span className="text-emerald-600 cursor-pointer">{interaction.job_order.job_number || 'Job ' + interaction.job_order.id.split('-')[0]}</span>}
                              </div>
                            )}
                            {interaction.duration_minutes && (
                              <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-slate-100 rounded text-slate-600">
                                Duration: {interaction.duration_minutes} min
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <LogInteractionDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
