import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Truck, User, Calendar, MapPin, ArrowRight, AlertCircle, CalendarCheck } from "lucide-react";

// Job stages that still need active dispatch/scheduling attention.
const ACTIVE_STATUSES = ["planning", "awaiting_deposit", "deposit_confirmed", "dispatched", "picked_up", "in_transit", "at_destination"];

const VEHICLE_STATUS_LABELS: Record<string, string> = { available: "Available", on_job: "On Job", maintenance: "Maintenance", retired: "Retired" };
const DRIVER_STATUS_LABELS: Record<string, string> = { available: "Available", on_duty: "On Duty", off: "Off Duty", inactive: "Inactive" };

export function FleetSchedule() {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["fleet_schedule_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select(`
          id, job_number, status, origin, destination, estimated_departure, estimated_arrival,
          customer:customers(company_name),
          driver:drivers!job_orders_assigned_driver_id_fkey(full_name),
          vehicle:vehicles!job_orders_assigned_vehicle_id_fkey(plate_number)
        `)
        .in("status", ACTIVE_STATUSES)
        .order("estimated_departure", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: vehicleCounts } = useQuery({
    queryKey: ["fleet_vehicle_status_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((v: any) => { counts[v.status] = (counts[v.status] || 0) + 1; });
      return counts;
    },
  });

  const { data: driverCounts } = useQuery({
    queryKey: ["fleet_driver_status_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((d: any) => { counts[d.status] = (counts[d.status] || 0) + 1; });
      return counts;
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "estimated_departure" | "estimated_arrival"; value: string }) => {
      const { error } = await supabase.from("job_orders").update({ [field]: value || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet_schedule_jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job_orders"] });
      toast.success("Schedule updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update schedule"),
  });

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (jobs || []).forEach((j: any) => {
      const key = j.estimated_departure || "unscheduled";
      if (!groups[key]) groups[key] = [];
      groups[key].push(j);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === "unscheduled") return -1;
        if (b === "unscheduled") return 1;
        return a.localeCompare(b);
      })
      .map(([key, rows]) => ({ key, rows }));
  }, [jobs]);

  return (
    <div className="space-y-8">
      {/* Fleet availability snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border shadow-sm p-5">
          <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-accent" /> Vehicle Availability
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(VEHICLE_STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-xl font-black tabular-nums">{vehicleCounts?.[key] || 0}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border shadow-sm p-5">
          <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-accent" /> Driver Availability
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(DRIVER_STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-xl font-black tabular-nums">{driverCounts?.[key] || 0}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-accent" />
          <h3 className="font-bold text-lg text-foreground tracking-tight">Vehicle & Driver Schedule</h3>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-16 text-center bg-muted/10 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3">
            <Calendar className="h-10 w-10 text-muted-foreground opacity-20" />
            <p className="text-sm font-bold text-foreground">No active jobs to schedule</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.key} className="bg-card rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-muted/30 border-b flex items-center gap-2">
                {group.key === "unscheduled" ? (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                ) : (
                  <Calendar className="h-4 w-4 text-accent" />
                )}
                <h4 className="font-black text-[10px] uppercase tracking-widest text-foreground">
                  {group.key === "unscheduled" ? "Unscheduled — needs a departure date" : format(parseISO(group.key), "EEEE, MMM d, yyyy")}
                </h4>
                <span className="text-[9px] font-black bg-muted px-1.5 py-0.5 rounded ml-auto">{group.rows.length} job{group.rows.length === 1 ? "" : "s"}</span>
              </div>
              <div className="divide-y">
                {group.rows.map((job: any) => (
                  <div key={job.id} className="p-4 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px] space-y-0.5">
                      <p className="font-mono text-[10px] font-black text-accent uppercase tracking-tighter">{job.job_number || `#${job.id.split("-")[0]}`}</p>
                      <p className="text-xs font-bold text-foreground truncate">{job.customer?.company_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {job.origin} <ArrowRight className="h-3 w-3" /> {job.destination}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground min-w-[110px]">
                      <Truck className="h-3.5 w-3.5 text-muted-foreground" /> {job.vehicle?.plate_number || "Unassigned"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground min-w-[130px]">
                      <User className="h-3.5 w-3.5 text-muted-foreground" /> {job.driver?.full_name || "Unassigned"}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Depart</p>
                        <Input
                          key={`dep-${job.id}-${job.estimated_departure}`}
                          type="date"
                          defaultValue={job.estimated_departure || ""}
                          onBlur={(e) => {
                            if (e.target.value !== (job.estimated_departure || "")) {
                              updateScheduleMutation.mutate({ id: job.id, field: "estimated_departure", value: e.target.value });
                            }
                          }}
                          className="h-8 text-xs w-36"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Arrive</p>
                        <Input
                          key={`arr-${job.id}-${job.estimated_arrival}`}
                          type="date"
                          defaultValue={job.estimated_arrival || ""}
                          onBlur={(e) => {
                            if (e.target.value !== (job.estimated_arrival || "")) {
                              updateScheduleMutation.mutate({ id: job.id, field: "estimated_arrival", value: e.target.value });
                            }
                          }}
                          className="h-8 text-xs w-36"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
