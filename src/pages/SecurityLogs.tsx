import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Shield, ShieldCheck, KeyRound, LogIn, Activity } from "lucide-react";
import { format } from "date-fns";

const eventLabel = (e: string) =>
  e === "login_success" ? "Sign In Success" :
  e === "login_failed" ? "Sign In Failed" :
  e === "password_change" ? "Password Updated" :
  e === "mfa_enabled" ? "2FA Activated" :
  e === "mfa_disabled" ? "2FA Disabled" :
  (e || "").replace(/_/g, " ");

const eventIcon = (e: string) =>
  e?.startsWith("login") ? LogIn : e === "password_change" ? KeyRound : e?.startsWith("mfa") ? ShieldCheck : Shield;

export default function SecurityLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["security_logs_all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let q = supabase.from("security_logs").select("*").order("created_at", { ascending: false }).limit(500);
      if (user) q = q.eq("user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader title="Security Audit Log">
        <Link to="/settings/profile">
          <Button variant="outline" className="gap-2 h-10"><ArrowLeft className="h-4 w-4" /> Back to Account</Button>
        </Link>
      </PageHeader>

      <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
        <Activity className="h-4 w-4 text-accent" />
        Complete history of security events on your account.
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={4}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell></TableRow>
              ))
            ) : (logs || []).length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-16 text-muted-foreground">No security events recorded.</TableCell></TableRow>
            ) : (logs || []).map((log: any) => {
              const Icon = eventIcon(log.event_type);
              return (
                <TableRow key={log.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5 text-accent" /></div>
                      <span className="text-xs font-bold">{eventLabel(log.event_type)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground max-w-[260px] truncate">
                    {log.details ? (typeof log.details === "string" ? log.details : JSON.stringify(log.details)) : "—"}
                  </TableCell>
                  <TableCell className="text-[11px] font-mono text-muted-foreground">{log.ip_address || "Unknown"}</TableCell>
                  <TableCell className="text-right text-[11px] text-muted-foreground whitespace-nowrap">
                    {log.created_at ? format(new Date(log.created_at), "MMM d, yyyy · HH:mm") : "—"}
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
