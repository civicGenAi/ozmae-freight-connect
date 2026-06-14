import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, CheckCircle2, AlertTriangle, XCircle, Bell, Check, Trash2, CheckCheck } from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { toast } from "sonner";

type Notif = { id: string; title: string; message: string; type: string; read?: boolean; created_at: string };

const TYPE_META: Record<string, { icon: any; cls: string; label: string }> = {
  success: { icon: CheckCircle2, cls: "text-emerald-500 bg-emerald-50", label: "Success" },
  warning: { icon: AlertTriangle, cls: "text-amber-500 bg-amber-50", label: "Warning" },
  error: { icon: XCircle, cls: "text-rose-500 bg-rose-50", label: "Error" },
  info: { icon: Info, cls: "text-blue-500 bg-blue-50", label: "Info" },
};
const metaFor = (t: string) => TYPE_META[t] || TYPE_META.info;

const STATUS_FILTERS = ["All", "Unread", "Read"] as const;
const TYPE_FILTERS = ["All", "info", "success", "warning", "error"] as const;

const bucketOf = (iso: string) => {
  try {
    const d = parseISO(iso);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    if (isThisWeek(d)) return "Earlier this week";
    return "Older";
  } catch {
    return "Older";
  }
};
const ORDER = ["Today", "Yesterday", "Earlier this week", "Older"];

export function NotificationsPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>("All");

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Notif[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (n: Notif) => {
      const { error } = await supabase.from("notifications").update({ read: !n.read }).eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e: any) => toast.error(e?.message || "Failed to update"),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); toast.success("All marked as read"); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e: any) => toast.error(e?.message || "Failed to delete"),
  });

  const counts = useMemo(() => {
    const list = notifications || [];
    return {
      total: list.length,
      unread: list.filter((n) => !n.read).length,
      byType: TYPE_FILTERS.slice(1).reduce((acc: Record<string, number>, t) => {
        acc[t] = list.filter((n) => (n.type || "info") === t).length;
        return acc;
      }, {}),
    };
  }, [notifications]);

  const filtered = useMemo(() => {
    return (notifications || []).filter((n) => {
      if (statusFilter === "Unread" && n.read) return false;
      if (statusFilter === "Read" && !n.read) return false;
      if (typeFilter !== "All" && (n.type || "info") !== typeFilter) return false;
      return true;
    });
  }, [notifications, statusFilter, typeFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, Notif[]> = {};
    filtered.forEach((n) => { const b = bucketOf(n.created_at); (map[b] ||= []).push(n); });
    return ORDER.filter((b) => map[b]?.length).map((b) => ({ bucket: b, items: map[b] }));
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                statusFilter === s ? "bg-slate-900 text-white" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {s}{s === "Unread" && counts.unread > 0 ? ` (${counts.unread})` : ""}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" disabled={markAllRead.isPending || counts.unread === 0} onClick={() => markAllRead.mutate()} className="gap-2 h-9 text-[10px] font-black uppercase tracking-widest">
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </Button>
      </div>

      {/* Type chips */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors",
              typeFilter === t ? "border-accent bg-accent/10 text-accent" : "border-muted text-muted-foreground hover:border-muted-foreground/40")}>
            {t === "All" ? "All types" : metaFor(t).label}{t !== "All" ? ` (${counts.byType[t] || 0})` : ""}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 items-center bg-white border rounded-2xl p-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-2.5 w-2/3" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed rounded-2xl">
          <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-bold">No notifications</p>
          <p className="text-xs text-muted-foreground mt-1">Nothing matches the current filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.bucket} className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">{group.bucket}</h4>
              <div className="space-y-2">
                {group.items.map((n) => {
                  const m = metaFor(n.type || "info");
                  return (
                    <div key={n.id} className={cn("flex gap-3 items-start bg-white border rounded-2xl p-4 transition-colors group", !n.read && "border-accent/40 bg-accent/[0.03]")}>
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", m.cls)}>
                        <m.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
                          <p className="text-sm font-bold text-foreground truncate">{n.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/70 font-medium mt-1">{n.created_at ? format(parseISO(n.created_at), "MMM d, yyyy · HH:mm") : ""}</p>
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title={n.read ? "Mark unread" : "Mark read"} onClick={() => markRead.mutate(n)}>
                          <Check className={cn("h-3.5 w-3.5", n.read ? "text-muted-foreground" : "text-emerald-600")} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" title="Delete" onClick={() => remove.mutate(n.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
