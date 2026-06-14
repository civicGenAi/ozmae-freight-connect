import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Users, Merge, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type Customer = { id: string; company_name: string; contact_person?: string; city?: string; created_at?: string };

export function MergeDuplicatesDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  // chosen primary id per duplicate group (keyed by normalized name)
  const [primaryByGroup, setPrimaryByGroup] = useState<Record<string, string>>({});

  const { data: customers, isLoading } = useQuery({
    queryKey: ["all_customers_for_merge"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, company_name, contact_person, city, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Customer[];
    },
  });

  // group by normalized company name; keep only groups with >1 record
  const groups = useMemo(() => {
    const map: Record<string, { name: string; records: Customer[] }> = {};
    (customers || []).forEach((c) => {
      const key = (c.company_name || "").trim().toLowerCase();
      if (!key) return;
      if (!map[key]) map[key] = { name: c.company_name, records: [] };
      map[key].records.push(c);
    });
    return Object.entries(map)
      .filter(([, g]) => g.records.length > 1)
      .map(([key, g]) => ({ key, ...g }));
  }, [customers]);

  const primaryFor = (key: string, records: Customer[]) => primaryByGroup[key] || records[0].id;

  const mergeOne = useMutation({
    mutationFn: async (group: { key: string; records: Customer[] }) => {
      const primary = primaryFor(group.key, group.records);
      const dupes = group.records.map((r) => r.id).filter((id) => id !== primary);
      const { error } = await supabase.rpc("merge_customers", { p_primary: primary, p_dupes: dupes });
      if (error) throw error;
      return dupes.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["all_customers_for_merge"] });
      queryClient.invalidateQueries({ queryKey: ["customer_health"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["job_form_data"] });
      toast.success(`Merged ${count} duplicate${count === 1 ? "" : "s"}`);
    },
    onError: (e: any) => toast.error(e?.message || "Merge failed (is the merge_customers function applied in Supabase?)"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 uppercase tracking-tight font-black">
            <Merge className="h-5 w-5 text-accent" /> Merge Duplicate Customers
          </DialogTitle>
          <DialogDescription>
            Same-named customer records split a business's quotes and jobs. Pick the record to keep for each
            group — everything else (leads, quotes, jobs, invoices, payments, CRM) is reassigned to it, then the
            duplicates are removed.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3 opacity-60" />
            <p className="text-sm font-bold">No duplicate customers found.</p>
            <p className="text-xs text-muted-foreground mt-1">Every business name is unique.</p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-amber-800">
                Merging cannot be undone. The kept record absorbs all linked data; the others are deleted.
              </p>
            </div>

            {groups.map((g) => {
              const primary = primaryFor(g.key, g.records);
              return (
                <div key={g.key} className="border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="h-4 w-4 text-accent shrink-0" />
                      <h4 className="font-black text-sm truncate">{g.name}</h4>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full shrink-0">
                        {g.records.length} records
                      </span>
                    </div>
                    <Button
                      size="sm"
                      disabled={mergeOne.isPending}
                      onClick={() => mergeOne.mutate(g)}
                      className="h-8 bg-accent hover:bg-accent/90 text-accent-foreground gap-1 text-[10px] font-black uppercase tracking-widest shrink-0"
                    >
                      {mergeOne.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Merge className="h-3 w-3" />} Merge
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {g.records.map((r) => {
                      const isPrimary = r.id === primary;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setPrimaryByGroup((p) => ({ ...p, [g.key]: r.id }))}
                          className={cn(
                            "w-full text-left flex items-center gap-3 p-2.5 rounded-xl border transition-all",
                            isPrimary ? "border-accent bg-accent/5 ring-1 ring-accent/30" : "border-muted hover:border-muted-foreground/30"
                          )}
                        >
                          <span className={cn("h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center", isPrimary ? "border-accent" : "border-muted-foreground/30")}>
                            {isPrimary && <span className="h-2 w-2 rounded-full bg-accent" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">
                              {r.contact_person || "No contact"} {r.city ? `· ${r.city}` : ""}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {r.id.split("-")[0]} · created {r.created_at ? format(new Date(r.created_at), "MMM d, yyyy") : "—"}
                            </p>
                          </div>
                          {isPrimary && <span className="text-[9px] font-black uppercase tracking-widest text-accent shrink-0">Keep</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-bold uppercase text-[10px] tracking-widest">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
