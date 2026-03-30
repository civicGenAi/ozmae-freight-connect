import { useState } from "react";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { invoices, formatCurrency } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Invoices() {
  const [viewInvoice, setViewInvoice] = useState<typeof invoices[0] | null>(null);

  return (
    <div>
      <PageHeader title="Invoices">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </PageHeader>

      <TableToolbar placeholder="Search invoices..." />

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Deposit (60%)</TableHead>
              <TableHead className="text-right">Balance (40%)</TableHead>
              <TableHead>Deposit</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.id}</TableCell>
                <TableCell>{inv.jobId}</TableCell>
                <TableCell>{inv.customer}</TableCell>
                <TableCell className="text-right">{formatCurrency(inv.total)}</TableCell>
                <TableCell className="text-right">{formatCurrency(inv.deposit)}</TableCell>
                <TableCell className="text-right">{formatCurrency(inv.balance)}</TableCell>
                <TableCell><StatusBadge status={inv.depositStatus} /></TableCell>
                <TableCell><StatusBadge status={inv.balanceStatus} /></TableCell>
                <TableCell>{inv.dueDate}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setViewInvoice(inv)} className="gap-1.5 text-xs">
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Modal */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice — {viewInvoice?.id}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-5 text-sm">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Ozmae Freight Solutions</h3>
                  <p className="text-muted-foreground">Plot 14, Nyerere Road, Dar es Salaam, Tanzania</p>
                  <p className="text-muted-foreground">info@ozmaefreight.co.tz | +255 222 123 456</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{viewInvoice.id}</p>
                  <p className="text-muted-foreground">Date: 15 Mar 2026</p>
                  <p className="text-muted-foreground">Due: {viewInvoice.dueDate}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Bill To</p>
                <p className="font-medium">{viewInvoice.customer}</p>
                <p className="text-muted-foreground">Dar es Salaam, Tanzania</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-2">Service</th>
                      <th className="text-right px-4 py-2">Qty</th>
                      <th className="text-right px-4 py-2">Unit Price</th>
                      <th className="text-right px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-2">Freight Transport — {viewInvoice.jobId}</td>
                      <td className="px-4 py-2 text-right">1</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(viewInvoice.total)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(viewInvoice.total)}</td>
                    </tr>
                    <tr className="border-t bg-muted/50">
                      <td colSpan={3} className="px-4 py-2 text-right font-medium">Subtotal</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(viewInvoice.total)}</td>
                    </tr>
                    <tr className="border-t bg-muted/50">
                      <td colSpan={3} className="px-4 py-2 text-right font-medium">Tax (0%)</td>
                      <td className="px-4 py-2 text-right">$0.00</td>
                    </tr>
                    <tr className="border-t bg-muted font-bold">
                      <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(viewInvoice.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                <p className="font-semibold text-foreground">Payment Terms</p>
                <p className="text-muted-foreground">60% deposit required before dispatch. Balance due on delivery.</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                <p className="font-semibold text-foreground">Bank Details</p>
                <p className="text-muted-foreground">Bank: CRDB Bank, Dar es Salaam</p>
                <p className="text-muted-foreground">Account: 0150123456789</p>
                <p className="text-muted-foreground">SWIFT: CORUTZTZ</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
