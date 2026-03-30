import { Briefcase, FileText, Receipt, CheckCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { jobOrders, formatCurrency } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";

const kpis = [
  { label: "Active Jobs", value: "12", icon: Briefcase, color: "text-accent" },
  { label: "Pending Quotations", value: "5", icon: FileText, color: "text-blue-500" },
  { label: "Outstanding Invoices", value: "3", icon: Receipt, color: "text-warning" },
  { label: "Completed This Month", value: "28", icon: CheckCircle, color: "text-success" },
];

const recentJobs = jobOrders.slice(0, 6);

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-lg border p-5 flex items-start gap-4">
            <div className={`p-2.5 rounded-lg bg-muted ${kpi.color}`}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/leads">
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
            <Plus className="h-4 w-4" /> New Inquiry
          </Button>
        </Link>
        <Link to="/quotations">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Create Quotation
          </Button>
        </Link>
        <Link to="/job-orders">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> New Job Order
          </Button>
        </Link>
      </div>

      {/* Recent Jobs */}
      <div className="bg-card rounded-lg border">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-foreground">Recent Jobs</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.id}</TableCell>
                <TableCell>{job.customer}</TableCell>
                <TableCell>{job.origin} → {job.destination}</TableCell>
                <TableCell><StatusBadge status={job.status} /></TableCell>
                <TableCell>{job.driver}</TableCell>
                <TableCell className="text-right">{formatCurrency(job.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
