import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Pencil, Info, Search, Route } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RateCard() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: rates, isLoading } = useQuery({
    queryKey: ["rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_card")
        .select("*")
        .order("origin", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = rates?.filter((r: any) => 
    r.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.vehicle_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Rate Card">
        <span className="text-[10px] bg-muted px-2 py-1 rounded font-bold uppercase tracking-widest text-muted-foreground mr-4">Internal Reference Only</span>
        <Button className="h-10 border border-input bg-background hover:bg-accent hover:text-accent-foreground gap-2">
          <Pencil className="h-4 w-4" /> Edit Rates
        </Button>
      </PageHeader>

      <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-4 flex items-start gap-3 text-sm text-amber-800 shadow-sm transition-all hover:shadow-md">
        <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Important Notice</p>
          <p className="text-xs opacity-90">These rates are for internal reference only. All final quotations must be validated by the logistics manager before being sent to customers.</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Filter by route or vehicle..." 
          className="pl-9 h-11"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Vehicle Type</TableHead>
              <TableHead className="text-right">Base Rate</TableHead>
              <TableHead className="text-right">Per KM Rate</TableHead>
              <TableHead>Min Cargo</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No rates found.
                </TableCell>
              </TableRow>
            ) : filtered?.map((r: any) => (
              <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-2 group">
                    <Route className="h-4 w-4 text-accent opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="font-medium text-foreground">{r.origin} → {r.destination}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{r.vehicle_type}</TableCell>
                <TableCell className="text-right font-bold text-foreground">{formatCurrency(r.base_rate_usd)}</TableCell>
                <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(r.per_km_rate_usd)}</TableCell>
                <TableCell className="text-xs">{r.min_cargo || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground italic border-l pl-4 leading-tight max-w-xs">{r.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
