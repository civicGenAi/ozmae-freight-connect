import { useState } from "react";
import { Plus, Search, MapPin, Truck, User, Calendar, DollarSign, Clock, CheckCircle2, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const stages = ["planning", "dispatched", "in transit", "at destination", "delivered", "closed"] as const;

export default function JobOrders() {
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: jobOrders, isLoading } = useQuery({
    queryKey: ["job_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select(`
          *,
          customer:customers(company_name),
          driver:drivers(full_name),
          vehicle:vehicles(plate_number)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: dataNeeded } = useQuery({
    queryKey: ["job_form_data"],
    queryFn: async () => {
      const [customers, drivers, vehicles] = await Promise.all([
        supabase.from("customers").select("id, company_name"),
        supabase.from("drivers").select("id, full_name"),
        supabase.from("vehicles").select("id, plate_number"),
      ]);
      return {
        customers: customers.data || [],
        drivers: drivers.data || [],
        vehicles: vehicles.data || [],
      };
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (newJob: any) => {
      const { error } = await supabase.from("job_orders").insert([newJob]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_orders"] });
      setIsNewModalOpen(false);
      toast.success("Job order created successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("job_orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_orders"] });
      toast.success("Job status updated");
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_orders"] });
      setSelectedJob(null);
      toast.success("Job order deleted");
    },
  });

  const filtered = jobOrders?.filter((j: any) => 
    j.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stageCounts = stages.map((s) => ({
    stage: s,
    count: jobOrders?.filter((j: any) => j.status?.toLowerCase() === s).length || 0,
  }));

  const handleCreateJob = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      customer_id: formData.get("customer_id"),
      driver_id: formData.get("driver_id"),
      vehicle_id: formData.get("vehicle_id"),
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      total_amount_usd: parseFloat(formData.get("amount") as string),
      status: "planning",
      payment_status: "unpaid",
    };
    createJobMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Job Orders">
        <Button onClick={() => setIsNewModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> Create Job Order
        </Button>
      </PageHeader>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stageCounts.map((s) => (
          <div key={s.stage} className="bg-card border rounded-xl p-4 shadow-sm transition-all hover:shadow-md group">
            <p className="text-2xl font-black text-foreground group-hover:text-accent transition-colors">{s.count}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{s.stage}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search jobs by ID or customer..." 
          className="pl-9 h-11"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Job ID</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Customer</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Route</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Personnel / Fleet</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-right">Value</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No active job orders found.</TableCell>
              </TableRow>
            ) : filtered?.map((job: any) => (
              <TableRow 
                key={job.id} 
                className="cursor-pointer hover:bg-muted/30 transition-colors group" 
                onClick={() => setSelectedJob(job)}
              >
                <TableCell className="font-mono text-[10px] font-bold text-accent uppercase">{job.id.split('-')[0]}</TableCell>
                <TableCell className="font-medium text-foreground">{job.customer?.company_name || 'N/A'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium">{job.origin}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{job.destination}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium">
                      <User className="h-3 w-3 text-muted-foreground" /> {job.driver?.full_name || "Unassigned"}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                      <Truck className="h-3 w-3" /> {job.vehicle?.plate_number || "None"}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold text-foreground">{formatCurrency(job.total_amount_usd || 0)}</TableCell>
                <TableCell><StatusBadge status={job.status} /></TableCell>
                <TableCell><StatusBadge status={job.payment_status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New Job Sheet */}
      <Sheet open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
             <SheetTitle>New Operational Job</SheetTitle>
             <SheetDescription>Initialize a new logistics job within the system.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateJob} className="space-y-4 py-6">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select name="customer_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {dataNeeded?.customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origin</Label>
                <Input name="origin" placeholder="Mombasa, KE" required />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input name="destination" placeholder="Kampala, UG" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Driver</Label>
                <Select name="driver_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Assign driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataNeeded?.drivers.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select name="vehicle_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Assign vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataNeeded?.vehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contract Value (USD)</Label>
              <Input name="amount" type="number" step="0.01" placeholder="8500.00" required />
            </div>
            <SheetFooter className="pt-4">
              <Button type="submit" disabled={createJobMutation.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-xs font-black uppercase tracking-widest">
                {createJobMutation.isPending ? "Creating..." : "Initialize Job Order"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Job Detail Drawer */}
      <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <div className="flex justify-between items-start">
               <div>
                  <SheetTitle>Job Order — #{selectedJob?.id.split('-')[0].toUpperCase()}</SheetTitle>
                  <SheetDescription>Comprehensive operational overview and live tracking.</SheetDescription>
               </div>
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  if (confirm("Delete this job order?")) {
                    deleteJobMutation.mutate(selectedJob.id);
                  }
                }}
                className="hover:bg-rose-500 hover:text-white transition-all rounded-full"
               >
                 <Trash2 className="h-4 w-4" />
               </Button>
            </div>
          </SheetHeader>
          
          {selectedJob && (
            <Tabs defaultValue="info" className="mt-8">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="info" className="rounded-lg font-bold uppercase text-[10px] tracking-widest">Job Info</TabsTrigger>
                <TabsTrigger value="docs" className="rounded-lg font-bold uppercase text-[10px] tracking-widest">Documents</TabsTrigger>
                <TabsTrigger value="timeline" className="rounded-lg font-bold uppercase text-[10px] tracking-widest">Live Timeline</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-6 bg-muted/30 p-6 rounded-xl border border-dashed">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer</p>
                    <p className="text-lg font-bold text-foreground leading-tight">{selectedJob.customer?.company_name || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Route</p>
                    <p className="font-bold text-foreground">{selectedJob.origin} → {selectedJob.destination}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b pb-1">Resources Assigned</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Driver</p>
                        <p className="text-sm font-bold">{selectedJob.driver?.full_name || "Unassigned"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Vehicle</p>
                        <p className="text-sm font-bold font-mono">{selectedJob.vehicle?.plate_number || "None"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Value</span>
                    <span className="font-black text-foreground">{formatCurrency(selectedJob.total_amount_usd || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Created</span>
                    <span>{format(new Date(selectedJob.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>

                <div className="pt-8 flex flex-col gap-3">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Update Operational Status</h4>
                   <div className="grid grid-cols-2 gap-2">
                      {stages.filter(s => s !== 'closed').map(stage => (
                        <Button 
                          key={stage}
                          className={cn(
                            "h-10 text-[10px] font-bold uppercase tracking-widest",
                            selectedJob.status === stage ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                          onClick={() => updateStageMutation.mutate({ id: selectedJob.id, status: stage })}
                        >
                          {stage}
                        </Button>
                      ))}
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="docs" className="mt-8 text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <div className="flex flex-col items-center gap-3">
                  <MapPin className="h-12 w-12 text-muted-foreground opacity-20" />
                  <div>
                    <p className="font-bold text-foreground">No Documents Found</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload BOL, Invoices, and Delivery Receipts here.</p>
                  </div>
                  <Button className="mt-4 border-dashed border-2 bg-transparent text-foreground hover:bg-muted/50">Add Document</Button>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-8">
                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-4 before:h-full before:w-0.5 before:bg-muted">
                  {stages.map((step, i) => {
                    const currentIdx = stages.indexOf(selectedJob.status?.toLowerCase() as typeof stages[number]);
                    const stepDone = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    
                    return (
                      <div key={step} className="relative flex items-center gap-8 pl-10">
                        <div className={cn(
                          "absolute left-2.5 h-3.5 w-3.5 rounded-full border-2 border-background ring-2 transition-all",
                          isCurrent ? "bg-accent ring-accent/30 scale-125" : stepDone ? "bg-success ring-success/20" : "bg-muted ring-muted/20"
                        )} />
                        <div className={cn(
                          "flex-1 p-4 rounded-xl border transition-all shadow-sm",
                          isCurrent ? "bg-accent/5 border-accent/20" : "bg-card border-muted-foreground/10"
                        )}>
                          <div className="flex justify-between items-center mb-1">
                             <p className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              isCurrent ? "text-accent" : stepDone ? "text-foreground" : "text-muted-foreground"
                            )}>{step}</p>
                            {stepDone && <CheckCircle2 className={cn("h-3.5 w-3.5", isCurrent ? "text-accent" : "text-success")} />}
                          </div>
                          <p className="text-[11px] text-muted-foreground italic">
                            {isCurrent ? "Current stage of shipment process." : stepDone ? "Completed successfully." : "Awaiting operational trigger."}
                          </p>
                          {isCurrent && (
                             <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-wider">
                                <Clock className="h-3 w-3" /> Updated {selectedJob.updated_at ? format(new Date(selectedJob.updated_at), "HH:mm") : "Recently"}
                             </div>
                          )}
                        </div>
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
