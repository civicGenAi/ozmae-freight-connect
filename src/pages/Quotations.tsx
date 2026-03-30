import { useState } from "react";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { FilterTabs } from "@/components/FilterTabs";
import { StatusBadge } from "@/components/StatusBadge";
import { quotations, formatCurrency } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const tabs = ["All", "Draft", "Sent", "Accepted", "Declined", "Expired"];

export default function Quotations() {
  const [activeTab, setActiveTab] = useState("All");
  const [viewQuote, setViewQuote] = useState<typeof quotations[0] | null>(null);

  const filtered = activeTab === "All" ? quotations : quotations.filter((q) => q.status === activeTab);

  return (
    <div>
      <PageHeader title="Quotations">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> Create Quotation
        </Button>
      </PageHeader>

      <FilterTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <TableToolbar placeholder="Search quotations..." />

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">{q.id}</TableCell>
                <TableCell>{q.customer}</TableCell>
                <TableCell>{q.route}</TableCell>
                <TableCell>{q.cargo}</TableCell>
                <TableCell className="text-right">{formatCurrency(q.amount)}</TableCell>
                <TableCell>{q.validUntil}</TableCell>
                <TableCell><StatusBadge status={q.status} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setViewQuote(q)} className="gap-1.5 text-xs">
                    <Eye className="h-3.5 w-3.5" /> View PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Quotation Template Modal */}
      <Dialog open={!!viewQuote} onOpenChange={() => setViewQuote(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotation — {viewQuote?.id}</DialogTitle>
          </DialogHeader>
          {viewQuote && (
            <div className="space-y-6 text-sm">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Ozmae Freight Solutions</h3>
                  <p className="text-muted-foreground">Plot 14, Nyerere Road, Dar es Salaam, Tanzania</p>
                  <p className="text-muted-foreground">info@ozmaefreight.co.tz | +255 222 123 456</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{viewQuote.id}</p>
                  <p className="text-muted-foreground">Date: 15 Mar 2026</p>
                  <p className="text-muted-foreground">Valid Until: {viewQuote.validUntil}</p>
                </div>
              </div>

              {/* To */}
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">To</p>
                <p className="font-medium">{viewQuote.customer}</p>
                <p className="text-muted-foreground">Dar es Salaam, Tanzania</p>
              </div>

              {/* Route */}
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Route</p>
                <p>{viewQuote.route}</p>
              </div>

              {/* Cargo */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-2">Description</th>
                      <th className="text-left px-4 py-2">Weight</th>
                      <th className="text-left px-4 py-2">Volume</th>
                      <th className="text-left px-4 py-2">Special Handling</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-2">{viewQuote.cargo}</td>
                      <td className="px-4 py-2">Included</td>
                      <td className="px-4 py-2">Standard</td>
                      <td className="px-4 py-2">None</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pricing */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-2">Item</th>
                      <th className="text-right px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-2">Base Rate</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(viewQuote.amount * 0.8)}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2">Fuel Surcharge</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(viewQuote.amount * 0.12)}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2">Handling Fee</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(viewQuote.amount * 0.08)}</td>
                    </tr>
                    <tr className="border-t bg-muted font-semibold">
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(viewQuote.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms */}
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Terms & Conditions</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>60% deposit required before dispatch.</li>
                  <li>Balance due upon delivery confirmation.</li>
                  <li>Rates are valid for the period specified above.</li>
                  <li>Ozmae Freight Solutions is not liable for delays caused by customs or border authorities.</li>
                </ul>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Authorized Signature</p>
                  <div className="h-8 border-b border-dashed w-40 mt-2" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Decline</Button>
                  <Button className="bg-success hover:bg-success/90 text-success-foreground">Accept</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
