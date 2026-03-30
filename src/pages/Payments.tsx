import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { payments, formatCurrency } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Clock, AlertCircle } from "lucide-react";

const summaryCards = [
  { label: "Total Collected This Month", value: "$19,720.00", icon: DollarSign, color: "text-success" },
  { label: "Outstanding Deposits", value: "$4,080.00", icon: Clock, color: "text-warning" },
  { label: "Outstanding Balances", value: "$9,800.00", icon: AlertCircle, color: "text-accent" },
];

export default function Payments() {
  return (
    <div>
      <PageHeader title="Payments" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-card border rounded-lg p-5 flex items-start gap-4">
            <div className={`p-2.5 rounded-lg bg-muted ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-xl font-bold text-foreground">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <TableToolbar placeholder="Search payments..." />

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment ID</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.id}</TableCell>
                <TableCell>{p.invoiceId}</TableCell>
                <TableCell>{p.customer}</TableCell>
                <TableCell>{p.type}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                <TableCell>{p.method}</TableCell>
                <TableCell>{p.date}</TableCell>
                <TableCell>{p.recordedBy}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
