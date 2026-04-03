import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle, Loader, Package, MapPin, ChevronRight, Clock, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const stages = ["planning", "dispatched", "in transit", "at destination", "delivered", "closed"] as const;

export default function Tracking() {
  const { data: trackingJobs, isLoading } = useQuery({
    queryKey: ["tracking_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select(`
          *,
          driver:drivers(full_name),
          vehicle:vehicles(plate_number)
        `)
        .not("status", "eq", "closed")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Live Shipment Tracking">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-3 py-1.5 rounded-full border border-dashed">
          <Loader className="h-3 w-3 animate-spin text-accent" /> Live Updates Active
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />
          ))
        ) : trackingJobs?.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-muted/10 rounded-2xl border-2 border-dashed flex flex-col items-center gap-4">
             <Package className="h-12 w-12 text-muted-foreground opacity-20" />
             <div>
                <p className="text-lg font-bold text-foreground">No Active Shipments</p>
                <p className="text-sm text-muted-foreground">All shipments are currently in 'Closed' status.</p>
             </div>
          </div>
        ) : trackingJobs?.map((job: any) => (
          <div key={job.id} className="relative bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all overflow-hidden group">
            {/* Top Bar */}
            <div className="flex items-start justify-between mb-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <span className="font-mono text-[10px] font-black bg-accent/10 text-accent px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm">
                      #{job.id.split('-')[0]}
                   </span>
                   <h3 className="font-bold text-foreground leading-tight">{job.customer_name}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <MapPin className="h-3 w-3" /> {job.origin} 
                  <ChevronRight className="h-3 w-3" /> 
                  <span className="text-foreground">{job.destination}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                  job.status === 'delivered' ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
                )}>
                  {job.status}
                </div>
              </div>
            </div>

            {/* Tracking Lane */}
            <div className="relative pt-2 pb-6 space-y-4">
              {stages.map((step, i) => {
                const currentIdx = stages.indexOf(job.status?.toLowerCase() as typeof stages[number]);
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                const isFuture = i > currentIdx;
                const isLast = i === stages.length - 1;

                if (step === 'closed') return null;

                return (
                  <div key={step} className="relative flex gap-6 items-start">
                    {/* Connector line + icon */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className={cn(
                        "z-10 h-6 w-6 rounded-full flex items-center justify-center transition-all duration-500",
                        isDone ? "bg-success scale-90" : isCurrent ? "bg-accent shadow-lg shadow-accent/20 ring-4 ring-accent/10" : "bg-muted scale-75"
                      )}>
                        {isDone ? <CheckCircle className="h-4 w-4 text-white" /> : 
                         isCurrent ? <Loader className="h-4 w-4 text-white animate-spin" /> : 
                         <Circle className="h-3 w-3 text-muted-foreground/30" />}
                      </div>
                      {!isLast && step !== 'delivered' && (
                        <div className={cn(
                          "absolute left-3 top-6 w-0.5 h-full -ml-[1px] transition-colors duration-1000",
                          isDone ? "bg-success" : "bg-muted"
                        )} />
                      )}
                    </div>

                    {/* Text */}
                    <div className={cn(
                      "flex-1 pb-4 transition-all duration-300",
                      isCurrent ? "translate-x-1" : ""
                    )}>
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-widest leading-none mb-1",
                        isDone && "text-foreground",
                        isCurrent && "text-accent",
                        isFuture && "text-muted-foreground/50"
                      )}>
                        {step}
                      </p>
                      {isCurrent && (
                        <p className="text-[11px] text-muted-foreground italic font-medium">
                          Vehicle {job.vehicle?.plate_number} is currently active in this stage.
                        </p>
                      )}
                    </div>
                    
                    {isCurrent && (
                        <div className="flex items-center gap-1.5 text-[10px] text-accent font-bold mt-1 bg-accent/5 px-2 py-1 rounded ring-1 ring-accent/10">
                            <Clock className="h-3 w-3" /> {format(new Date(job.updated_at), "HH:mm")}
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Personnel Badge */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Truck className="h-4 w-4" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">Vehicle</p>
                      <p className="text-xs font-mono font-bold">{job.vehicle?.plate_number || "Awaiting Assignment"}</p>
                   </div>
                </div>
                <div className="flex -space-x-2">
                    <div className="h-7 w-7 rounded-full border-2 border-background bg-accent text-white flex items-center justify-center text-[10px] font-bold">
                        {job.driver?.full_name?.split(' ').map((n:any)=>n[0]).join('') || '?'}
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
