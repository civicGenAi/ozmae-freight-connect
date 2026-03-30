import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { documentVault } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Upload, FileText, FileCheck, Camera, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const docTypes = [
  { key: "quotation" as const, label: "Quotation PDF", icon: FileText },
  { key: "invoice" as const, label: "Invoice PDF", icon: FileCheck },
  { key: "pickup" as const, label: "Pickup Confirmation", icon: Camera },
  { key: "delivery" as const, label: "Delivery Note", icon: ClipboardCheck },
];

export default function Documents() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleExpand = (jobId: string) => {
    setExpanded(expanded === jobId ? null : jobId);
  };

  return (
    <div>
      <PageHeader title="Document Vault" />

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentVault.map((doc) => {
              const isExpanded = expanded === doc.jobId;
              const docCount = Object.values(doc.docs).filter(Boolean).length;
              return (
                <>
                  <TableRow key={doc.jobId} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(doc.jobId)}>
                    <TableCell>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium">{doc.jobId}</TableCell>
                    <TableCell>{doc.customer}</TableCell>
                    <TableCell>{doc.route}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        {docCount}/4
                      </span>
                    </TableCell>
                    <TableCell>{doc.lastUpdated}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={(e) => e.stopPropagation()}>
                        <Upload className="h-3.5 w-3.5" /> Upload
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${doc.jobId}-docs`}>
                      <TableCell colSpan={7} className="bg-muted/30 px-8 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {docTypes.map((dt) => {
                            const exists = doc.docs[dt.key];
                            return (
                              <div
                                key={dt.key}
                                className={cn(
                                  "flex items-center gap-2 p-3 rounded-lg border text-sm",
                                  exists ? "bg-card border-success/30" : "bg-card border-dashed border-muted-foreground/30"
                                )}
                              >
                                <dt.icon className={cn("h-4 w-4", exists ? "text-success" : "text-muted-foreground")} />
                                <span className={exists ? "text-foreground" : "text-muted-foreground"}>{dt.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
