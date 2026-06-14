import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Database, ShieldCheck, HardDrive, Globe, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import { format } from "date-fns";

type Health = { ok: boolean; latency: number; detail?: string };

const timed = async (fn: () => Promise<any>): Promise<Health> => {
  const start = performance.now();
  try {
    const res = await fn();
    const latency = Math.round(performance.now() - start);
    if (res && res.error) return { ok: false, latency, detail: res.error.message };
    return { ok: true, latency };
  } catch (e: any) {
    return { ok: false, latency: Math.round(performance.now() - start), detail: e?.message || "Unreachable" };
  }
};

const SERVICES = [
  { key: "database", label: "Database (Postgres)", icon: Database, desc: "Primary data store & queries" },
  { key: "auth", label: "Authentication", icon: ShieldCheck, desc: "Login, sessions & roles" },
  { key: "storage", label: "File Storage", icon: HardDrive, desc: "Documents & uploads" },
  { key: "network", label: "Network / API", icon: Globe, desc: "Connectivity to Supabase" },
] as const;

export function SystemStatusPanel() {
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["system_status"],
    refetchInterval: 30000,
    staleTime: 0,
    queryFn: async () => {
      const [database, auth, storage] = await Promise.all([
        timed(() => supabase.from("company_profile").select("id", { count: "exact", head: true })),
        timed(() => supabase.auth.getSession()),
        timed(() => supabase.storage.from("logistic-files").list("", { limit: 1 })),
      ]);
      const network: Health = {
        ok: database.ok || auth.ok || storage.ok,
        latency: Math.min(database.latency, auth.latency, storage.latency),
      };
      setLastChecked(new Date());
      return { database, auth, storage, network } as Record<string, Health>;
    },
  });

  const services = SERVICES.map((s) => ({ ...s, health: data?.[s.key] }));
  const downCount = services.filter((s) => s.health && !s.health.ok).length;
  const allUp = data && downCount === 0;
  const partial = downCount > 0 && downCount < services.length;

  const overall = !data
    ? { label: "Checking systems…", cls: "bg-muted text-muted-foreground border-border", Icon: Activity }
    : allUp
    ? { label: "All Systems Operational", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 }
    : partial
    ? { label: "Partial Service Disruption", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: AlertTriangle }
    : { label: "Major Outage", cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: XCircle };

  const avgLatency = data ? Math.round(services.reduce((a, s) => a + (s.health?.latency || 0), 0) / services.length) : 0;

  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl border p-6 flex items-center justify-between gap-4", overall.cls)}>
        <div className="flex items-center gap-4">
          <overall.Icon className="h-8 w-8" />
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">{overall.label}</h2>
            <p className="text-[11px] font-bold opacity-80">Last checked {format(lastChecked, "MMM d, HH:mm:ss")} · auto-refreshes every 30s</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Avg latency</p>
            <p className="text-2xl font-black tabular-nums">{avgLatency}ms</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} className="bg-card/60 h-10 w-10 shrink-0">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map((s) => {
          const h = s.health;
          const status = !h ? "checking" : h.ok ? "operational" : "down";
          return (
            <div key={s.key} className="bg-card rounded-2xl border shadow-sm p-5 flex items-start gap-4">
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                status === "operational" ? "bg-emerald-50 text-emerald-600" : status === "down" ? "bg-rose-50 text-rose-600" : "bg-muted text-muted-foreground")}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-sm text-foreground">{s.label}</h3>
                  <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                    status === "operational" ? "bg-emerald-100 text-emerald-700" : status === "down" ? "bg-rose-100 text-rose-700" : "bg-muted text-muted-foreground")}>
                    <span className={cn("h-1.5 w-1.5 rounded-full",
                      status === "operational" ? "bg-emerald-500 animate-pulse" : status === "down" ? "bg-rose-500" : "bg-muted-foreground")} />
                    {status === "operational" ? "Operational" : status === "down" ? "Down" : "Checking"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
                <div className="flex items-center gap-4 mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span>Latency: <span className="text-foreground tabular-nums">{h ? `${h.latency}ms` : "—"}</span></span>
                  {h && !h.ok && h.detail && <span className="text-rose-500 truncate normal-case tracking-normal font-medium">{h.detail}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center font-medium">
        Status reflects live checks from your browser against the Supabase backend. Latency includes your network round-trip.
      </p>
    </div>
  );
}
