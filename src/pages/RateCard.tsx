import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { rateCard, formatCurrency } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Pencil, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RateCard() {
  return (
    <div>
      <PageHeader title="Rate Card">
        <span className="text-sm text-muted-foreground hidden sm:inline">Last updated: March 2026</span>
        <Button variant="outline" className="gap-2"><Pencil className="h-4 w-4" /> Edit Rates</Button>
      </PageHeader>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-sm text-amber-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Rates are internal reference only. Sales team must check before quoting.</span>
      </div>

      <TableToolbar placeholder="Search routes..." />

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
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
            {rateCard.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.route}</TableCell>
                <TableCell>{r.vehicleType}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.baseRate)}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.perKmRate)}</TableCell>
                <TableCell>{r.minCargo}</TableCell>
                <TableCell className="text-muted-foreground">{r.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
