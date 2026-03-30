import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { jobOrders, formatCurrency } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const stages = ["Planning", "Dispatched", "In Transit", "At Destination", "Delivered"] as const;

export default function JobOrders() {
  const [selectedJob, setSelectedJob] = useState<typeof jobOrders[0] | null>(null);

  const stageCounts = stages.map((s) => ({
    stage: s,
    count: jobOrders.filter((j) => j.status === s).length,
  }));

  return (
    <div>
      <PageHeader title="Job Orders">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> Create Job Order
        </Button>
      </PageHeader>

      {/* Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {stageCounts.map((s) => (
          <div key={s.stage} className="bg-card border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{s.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.stage}</p>
          </div>
        ))}
      </div>

      <TableToolbar placeholder="Search jobs..." />

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobOrders.map((job) => (
              <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedJob(job)}>
                <TableCell className="font-medium">{job.id}</TableCell>
                <TableCell>{job.customer}</TableCell>
                <TableCell>{job.origin} → {job.destination}</TableCell>
                <TableCell>{job.driver}</TableCell>
                <TableCell>{job.vehicle}</TableCell>
                <TableCell>{job.cargo}</TableCell>
                <TableCell><StatusBadge status={job.status} /></TableCell>
                <TableCell><StatusBadge status={job.paymentStatus} /></TableCell>
                <TableCell className="text-right">{formatCurrency(job.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Job Detail Drawer */}
      <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Job Details — {selectedJob?.id}</SheetTitle>
          </SheetHeader>
          {selectedJob && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Job Info</TabsTrigger>
                <TabsTrigger value="docs">Documents</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="mt-4 space-y-3 text-sm">
                {[
                  ["Customer", selectedJob.customer],
                  ["Route", `${selectedJob.origin} → ${selectedJob.destination}`],
                  ["Cargo", selectedJob.cargo],
                  ["Driver", selectedJob.driver],
                  ["Vehicle", selectedJob.vehicle],
                  ["Value", formatCurrency(selectedJob.value)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={selectedJob.status} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment</span>
                  <StatusBadge status={selectedJob.paymentStatus} />
                </div>
              </TabsContent>
              <TabsContent value="docs" className="mt-4 text-sm text-muted-foreground">
                <p>Documents will be linked here once uploaded.</p>
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <div className="space-y-3">
                  {["Job Created", "Deposit Confirmed", "Dispatched", "Picked Up", "In Transit", "At Destination", "Delivered", "Closed"].map((step, i) => {
                    const currentIdx = stages.indexOf(selectedJob.status as typeof stages[number]);
                    const stepDone = i <= currentIdx + 2;
                    const isCurrent = i === currentIdx + 2;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full shrink-0 ${isCurrent ? "bg-accent" : stepDone ? "bg-success" : "bg-muted"}`} />
                        <span className={`text-sm ${isCurrent ? "font-semibold text-accent" : stepDone ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
