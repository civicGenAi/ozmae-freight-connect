import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { FilterTabs } from "@/components/FilterTabs";
import { StatusBadge } from "@/components/StatusBadge";
import { leads } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const tabs = ["All", "New", "Quoted", "Converted", "Declined"];

export default function Leads() {
  const [activeTab, setActiveTab] = useState("All");
  const [selectedLead, setSelectedLead] = useState<typeof leads[0] | null>(null);

  const filtered = activeTab === "All" ? leads : leads.filter((l) => l.status === activeTab);

  return (
    <div>
      <PageHeader title="Leads & Inquiries">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> New Inquiry
        </Button>
      </PageHeader>

      <FilterTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <TableToolbar placeholder="Search leads..." />

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Date Received</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lead) => (
              <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLead(lead)}>
                <TableCell className="font-medium">{lead.id}</TableCell>
                <TableCell>{lead.customer}</TableCell>
                <TableCell>{lead.origin}</TableCell>
                <TableCell>{lead.destination}</TableCell>
                <TableCell>{lead.cargo}</TableCell>
                <TableCell>{lead.dateReceived}</TableCell>
                <TableCell>{lead.assignedTo}</TableCell>
                <TableCell><StatusBadge status={lead.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Lead Details — {selectedLead?.id}</SheetTitle>
          </SheetHeader>
          {selectedLead && (
            <div className="mt-6 space-y-4 text-sm">
              {[
                ["Customer", selectedLead.customer],
                ["Origin", selectedLead.origin],
                ["Destination", selectedLead.destination],
                ["Cargo Type", selectedLead.cargo],
                ["Date Received", selectedLead.dateReceived],
                ["Assigned To", selectedLead.assignedTo],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selectedLead.status} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
