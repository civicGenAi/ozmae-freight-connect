import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle, Clock, Calendar, AlertTriangle } from "lucide-react";
import { useCrmTasks, useCompleteTask } from "@/hooks/useCrm";
import { CrmTask } from "@/types";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function Tasks() {
  const [viewMode, setViewMode] = useState<"me" | "all">("me");
  
  const { data: tasks, isLoading } = useCrmTasks({ status: 'pending', assignedToMe: viewMode === "me" });
  const completeMutation = useCompleteTask();

  const handleComplete = (id: string) => {
    completeMutation.mutate(id);
  };

  const today = new Date();
  today.setHours(0,0,0,0);
  
  const weekOut = new Date(today);
  weekOut.setDate(weekOut.getDate() + 7);

  const overdue = tasks?.filter(t => new Date(t.due_date) < today) || [];
  const dueToday = tasks?.filter(t => new Date(t.due_date).getTime() === today.getTime()) || [];
  const upcoming = tasks?.filter(t => {
    const d = new Date(t.due_date);
    return d > today && d <= weekOut;
  }) || [];
  const later = tasks?.filter(t => new Date(t.due_date) > weekOut) || [];

  const TaskCard = ({ task }: { task: CrmTask }) => {
    const pColor: Record<string, string> = {
      urgent: "bg-rose-500", high: "bg-amber-500", medium: "bg-blue-500", low: "bg-slate-400"
    };
    
    return (
      <div className="bg-card border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
        <div>
          <div className="flex justify-between items-start mb-3">
            <span className={cn("px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-widest text-white shadow-sm", pColor[task.priority] || pColor.low)}>
              {task.priority}
            </span>
            {task.assignee && (
              <div className="flex items-center gap-1.5 opacity-60">
                {task.assignee.avatar_url ? (
                  <img src={task.assignee.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                    {task.assignee.full_name?.charAt(0)}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <h4 className="font-bold text-foreground mb-1 leading-snug">{task.title}</h4>
          <Link to={`/crm/customers/${task.customer_id}`} className="text-xs text-accent font-semibold hover:underline block mb-4">
            {task.customer?.company_name}
          </Link>
          
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
            <Calendar className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t flex items-center justify-between">
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground">Snooze +1d</Button>
          <Button 
            size="sm" 
            onClick={() => handleComplete(task.id)} 
            disabled={completeMutation.isPending}
            className="h-8 px-4 text-xs font-bold gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" /> Mark Done
          </Button>
        </div>
      </div>
    );
  };

  const Section = ({ title, items, colorClass, icon: Icon }: any) => {
    if (items.length === 0) return null;
    return (
      <div className={cn("p-6 rounded-3xl border", colorClass)}>
        <h3 className="font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
          <Icon className="h-4 w-4" /> {title} ({items.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((t: CrmTask) => <TaskCard key={t.id} task={t} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks & Follow-ups">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </PageHeader>

      <div className="flex bg-muted p-1 rounded-lg w-max">
        <button
          onClick={() => setViewMode("me")}
          className={cn("px-6 py-2 text-xs font-semibold rounded-md transition-all", viewMode === "me" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          My Tasks
        </button>
        <button
          onClick={() => setViewMode("all")}
          className={cn("px-6 py-2 text-xs font-semibold rounded-md transition-all", viewMode === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          Team Tasks
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 bg-card border rounded-2xl p-4">
              <div className="h-10 w-10 rounded-xl bg-muted/60 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 bg-muted/60 animate-pulse rounded" />
                <div className="h-2.5 w-1/2 bg-muted/40 animate-pulse rounded" />
              </div>
              <div className="h-8 w-20 bg-muted/50 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      ) : tasks?.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed rounded-3xl">
          <CheckCircle className="h-12 w-12 text-emerald-500/30 mx-auto mb-4" />
          <h3 className="text-lg font-black mb-1">Inbox Zero!</h3>
          <p className="text-sm text-muted-foreground">You have no pending tasks to complete.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="Overdue" items={overdue} colorClass="bg-rose-50/50 border-rose-100/50 text-rose-900" icon={AlertTriangle} />
          <Section title="Due Today" items={dueToday} colorClass="bg-amber-50/30 border-amber-100 text-amber-900" icon={Clock} />
          <Section title="Upcoming (7 Days)" items={upcoming} colorClass="bg-blue-50/30 border-blue-100 text-blue-900" icon={Calendar} />
          <Section title="Later" items={later} colorClass="bg-muted/30 border-border text-foreground" icon={Calendar} />
        </div>
      )}
    </div>
  );
}
