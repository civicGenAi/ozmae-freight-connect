import { useState } from "react";
import { Plus, Search, MapPin, Truck, User, Calendar, DollarSign, Clock, CheckCircle2, ChevronRight, Trash2, Info, Pencil } from "lucide-react";
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
import { HybridSelect } from "@/components/HybridSelect";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFormDraft } from "@/hooks/useFormDraft";
import { motion, AnimatePresence } from "framer-motion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 15;

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const stages = [
  "planning",
  "awaiting_deposit",
  "deposit_confirmed",
  "dispatched",
  "picked_up",
  "in_transit",
  "at_destination",
  "delivered",
  "closed",
  "cancelled"
] as const;

const jobSchema = z.object({
  selectedEntityId: z.string().min(1, "Please select a customer or prospect"),
  origin: z.string().min(2, "Origin is required"),
  destination: z.string().min(2, "Destination is required"),
  driverRef: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
  }).refine(data => data.id || data.name, "Please select or type a driver"),
  vehicleRef: z.object({
    id: z.string().optional(),
    plate: z.string().optional(),
  }).refine(data => data.id || data.plate, "Please select or type a vehicle"),
  amount: z.string().min(1, "Value is required"),
});

type JobFormValues = z.infer<typeof jobSchema>;

export default function JobOrders() {
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      selectedEntityId: "",
      origin: "",
      destination: "",
      driverRef: {},
      vehicleRef: {},
      amount: "",
    }
  });

  const { hasDraft, restoreDraft, discardDraft } = useFormDraft({
    key: "ozmae_job_new",
    form,
    enabled: isNewModalOpen
  });

  const selectedEntityId = form.watch("selectedEntityId");
  const origin = form.watch("origin");
  const destination = form.watch("destination");
  const amount = form.watch("amount");

  const [isConfirming, setIsConfirming] = useState(false);

  const { data: jobData, isLoading, error: fetchError } = useQuery({
    queryKey: ["job_orders", currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("job_orders")
        .select(`
          id,
          job_number,
          customer_id,
          quotation_id,
          origin,
          destination,
          status,
          total_amount,
          assigned_driver_id,
          assigned_vehicle_id,
          created_at,
          customer:customers(company_name),
          driver:drivers!job_orders_assigned_driver_id_fkey(full_name),
          vehicle:vehicles!job_orders_assigned_vehicle_id_fkey(plate_number),
          quotation:quotations(total_amount_usd)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        toast.error(`Database error: ${error.message}`);
        throw error;
      }
      return { jobs: data, totalCount: count || 0 };
    },
    retry: 1
  });

  const jobOrders = jobData?.jobs || [];
  const totalCount = jobData?.totalCount || 0;

  const { data: dataNeeded } = useQuery({
    queryKey: ["job_form_data"],
    queryFn: async () => {
      const [customers, leads, drivers, vehicles, quotations] = await Promise.all([
        supabase.from("customers").select("id, company_name"),
        supabase.from("leads").select("id, customer_name_raw, origin, destination").is("customer_id", null),
        supabase.from("drivers").select("id, full_name"),
        supabase.from("vehicles").select("id, plate_number"),
        supabase.from("quotations")
          .select("id, customer_id, lead_id, total_amount_usd, status, created_at, origin, destination")
          .order("created_at", { ascending: false })
      ]);
      return {
        customers: (customers.data || []).map(c => ({ value: c.id, label: c.company_name, type: 'customer' })),
        prospects: (leads.data || []).map(l => ({
          value: l.id,
          label: `${l.customer_name_raw} (Prospect)`,
          type: 'prospect',
          origin: l.origin,
          destination: l.destination,
          raw_name: l.customer_name_raw
        })),
        drivers: (drivers.data || []).map(d => ({ value: d.id, label: d.full_name })),
        vehicles: (vehicles.data || []).map(v => ({ value: v.id, label: v.plate_number })),
        quotations: quotations.data || []
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000,   // Keep in memory for 30 minutes
  });

  const [suggestedAmount, setSuggestedAmount] = useState<string | null>(null);

  // Auto-fill route logic
  useEffect(() => {
    if (selectedEntityId && dataNeeded) {
      // 1. Find best quotation for this entity (Priority: Accepted > Most Recent)
      const entityQuotes = dataNeeded.quotations.filter((q: any) =>
        q.customer_id === selectedEntityId || q.lead_id === selectedEntityId
      );

      const acceptedQuote = entityQuotes.find((q: any) => q.status === 'accepted');
      const latestQuote = entityQuotes[0];
      const targetQuote = acceptedQuote || latestQuote;

      if (targetQuote) {
        // Quotation is the primary source of truth for all entities
        const val = targetQuote.total_amount_usd.toString();
        form.setValue("amount", val);
        setSuggestedAmount(val);

        // Auto-provision route from quote
        if (targetQuote.origin) form.setValue("origin", targetQuote.origin);
        if (targetQuote.destination) form.setValue("destination", targetQuote.destination);
      } else {
        // Fallback for Prospects if no quote exists yet
        const prospect = dataNeeded.prospects.find(p => p.value === selectedEntityId);
        if (prospect) {
          form.setValue("origin", prospect.origin);
          form.setValue("destination", prospect.destination);
        }
        setSuggestedAmount(null);
      }
    }
  }, [selectedEntityId, dataNeeded, form]);

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

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("job_orders")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_orders"] });
      setIsEditing(false);
      setSelectedJob(null);
      toast.success("Job order updated successfully");
    },
    onError: (err: any) => toast.error(err.message),
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

  const filtered = jobOrders?.filter((j: any) => {
    const searchStr = searchQuery.toLowerCase();
    const customerMatch = j.customer?.company_name?.toLowerCase()?.includes(searchStr) || false;
    const idMatch = j.id?.toLowerCase()?.includes(searchStr) || false;
    const routeMatch = (j.origin + " " + j.destination).toLowerCase().includes(searchStr);
    return customerMatch || idMatch || routeMatch;
  }) || [];

  const stageCounts = stages.map((s) => ({
    stage: s,
    count: jobOrders?.filter((j: any) => (j.status || "").toLowerCase() === s.toLowerCase()).length || 0,
  }));
  const handleCreateJob = async (values: JobFormValues) => {
    try {
      let finalCustomerId = "";
      const { driverRef, vehicleRef, origin, destination, amount, selectedEntityId } = values;
      let finalDriverId = driverRef.id || null;
      let finalVehicleId = vehicleRef.id || null;

      // 1. Handle Prospect Conversion
      const prospect = dataNeeded?.prospects.find(p => p.value === selectedEntityId);
      if (prospect) {
        const { data: newCust, error: custErr } = await supabase
          .from("customers")
          .insert([{ company_name: prospect.raw_name }])
          .select()
          .single();

        if (custErr) {
          if (custErr.message.includes("customer_health")) {
            toast.error("Security Restriction: Missing 'INSERT' policy for 'customer_health' table in Supabase. Please update your RLS policies.");
            throw new Error("Unable to create customer due to database security policies on 'customer_health'.");
          }
          throw custErr;
        }

        finalCustomerId = newCust.id;
        // Update lead to mark as converted
        await supabase.from("leads").update({ customer_id: newCust.id, status: 'converted' }).eq("id", prospect.value);
      } else {
        finalCustomerId = selectedEntityId;
      }

      // 2. Handle New Driver (Hybrid)
      if (!finalDriverId && driverRef.name) {
        const { data: newDriver, error: drvErr } = await supabase
          .from("drivers")
          .insert([{ full_name: driverRef.name, status: 'available', phone: 'Added via Job' }])
          .select()
          .single();
        if (drvErr) throw drvErr;
        finalDriverId = newDriver.id;
      }

      // 3. Handle New Vehicle (Hybrid)
      if (!finalVehicleId && vehicleRef.plate) {
        const { data: newVeh, error: vehErr } = await supabase
          .from("vehicles")
          .insert([{
            plate_number: vehicleRef.plate,
            vehicle_type: 'truck_20t',
            capacity_tons: 20,
            status: 'available'
          }])
          .select()
          .single();
        if (vehErr) throw vehErr;
        finalVehicleId = newVeh.id;
      }

      // 4. Identify Quotation Link
      const entityQuotes = dataNeeded?.quotations.filter((q: any) =>
        q.customer_id === finalCustomerId || q.lead_id === selectedEntityId
      );
      const targetQuote = entityQuotes?.find((q: any) => q.status === 'accepted') || entityQuotes?.[0];

      const data = {
        customer_id: finalCustomerId,
        assigned_driver_id: finalDriverId,
        assigned_vehicle_id: finalVehicleId,
        quotation_id: targetQuote?.id || null,
        origin,
        destination,
        total_amount: targetQuote ? targetQuote.total_amount_usd : parseFloat(amount) || 0,
        status: "planning",
      };

      createJobMutation.mutate(data);
      form.reset();
      discardDraft();
    } catch (err: any) {
      toast.error(`Auto-registration failed: ${err.message}`);
    }
  };

  const handleUpdateJob = async (values: JobFormValues) => {
    try {
      if (!selectedJob) return;

      const { driverRef, vehicleRef, origin, destination, amount } = values;
      let finalDriverId = driverRef.id || null;
      let finalVehicleId = vehicleRef.id || null;

      // Handle New Driver (Hybrid)
      if (!finalDriverId && driverRef.name) {
        const { data: newDriver, error: drvErr } = await supabase
          .from("drivers")
          .insert([{ full_name: driverRef.name, status: 'available', phone: 'Added via Edit' }])
          .select()
          .single();
        if (drvErr) throw drvErr;
        finalDriverId = newDriver.id;
      }

      // Handle New Vehicle (Hybrid)
      if (!finalVehicleId && vehicleRef.plate) {
        const { data: newVeh, error: vehErr } = await supabase
          .from("vehicles")
          .insert([{ plate_number: vehicleRef.plate, status: 'available', vehicle_type: 'truck_20t', capacity_tons: 20 }])
          .select()
          .single();
        if (vehErr) throw vehErr;
        finalVehicleId = newVeh.id;
      }

      updateJobMutation.mutate({
        id: selectedJob.id,
        updates: {
          origin,
          destination,
          total_amount: parseFloat(amount) || 0,
          assigned_driver_id: finalDriverId,
          assigned_vehicle_id: finalVehicleId,
        }
      });
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    }
  };

  // Pre-fill form when entering edit mode
  useEffect(() => {
    if (isEditing && selectedJob) {
      form.reset({
        selectedEntityId: selectedJob.customer_id,
        origin: selectedJob.origin,
        destination: selectedJob.destination,
        amount: (selectedJob.total_amount || 0).toString(),
        driverRef: {
          id: selectedJob.assigned_driver_id,
          name: selectedJob.driver?.full_name
        },
        vehicleRef: {
          id: selectedJob.assigned_vehicle_id,
          plate: selectedJob.vehicle?.plate_number
        },
      });
    }
  }, [isEditing, selectedJob, form]);

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
                <TableCell className="text-right font-bold text-foreground">{formatCurrency(job.quotation?.total_amount_usd || job.total_amount || 0)}</TableCell>
                <TableCell><StatusBadge status={job.status} /></TableCell>
                <TableCell><StatusBadge status={job.payment_status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination 
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          className="bg-card/50 border-t"
        />
      </div>

      {/* New Job Sheet */}
      <Sheet open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-4">
            {hasDraft && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-accent/10 border border-accent/20 p-4 rounded-xl mb-6 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-accent tracking-widest">Unsaved Draft Found</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Would you like to resume your previous work?</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={discardDraft}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-white/5"
                  >
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    onClick={restoreDraft}
                    className="bg-accent text-accent-foreground text-[10px] font-black uppercase tracking-widest px-4 h-8 rounded-lg shadow-lg shadow-accent/20"
                  >
                    Restore
                  </Button>
                </div>
              </motion.div>
            )}
            <SheetTitle>New Operational Job</SheetTitle>
            <SheetDescription>Initialize a new logistics job within the system.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateJob)} className="space-y-4 py-6">
              <FormField
                control={form.control}
                name="selectedEntityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Entity (Customer/Prospect)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select customer or prospect" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dataNeeded?.customers.map((c: any) => (
                          <SelectItem key={c.value} value={c.value} className="font-bold">{c.label}</SelectItem>
                        ))}
                        {dataNeeded?.prospects.map((p: any) => (
                          <SelectItem key={p.value} value={p.value} className="text-purple-700 font-medium">{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Mombasa, KE" className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Kampala, UG" className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="driverRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Personnel</FormLabel>
                      <FormControl>
                        <HybridSelect
                          options={dataNeeded?.drivers || []}
                          value={field.value.id || field.value.name || ""}
                          onChange={(val, isNew) => field.onChange(isNew ? { name: val } : { id: val })}
                          placeholder="Search/Type Driver Name"
                          allowCreate
                          className="h-11"
                        />
                      </FormControl>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" /> If driver doesn't exist, type their name to register.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicleRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transport Asset</FormLabel>
                      <FormControl>
                        <HybridSelect
                          options={dataNeeded?.vehicles || []}
                          value={field.value.id || field.value.plate || ""}
                          onChange={(val, isNew) => field.onChange(isNew ? { plate: val } : { id: val })}
                          placeholder="Search/Type Plate Number"
                          allowCreate
                          className="h-11"
                        />
                      </FormControl>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" /> New plate numbers will be saved for next time.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          placeholder="8500.00"
                          className="pl-9 h-11"
                        />
                      </div>
                    </FormControl>
                    {suggestedAmount && field.value !== suggestedAmount && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-accent/5 border border-dashed border-accent/40 p-3 rounded-lg mt-2 overflow-hidden"
                      >
                        <p className="text-[10px] text-accent font-black uppercase tracking-widest flex items-center gap-2">
                          <Info className="h-3 w-3" /> Caution Required
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium mt-1 leading-relaxed">
                          Manual override detected. Please cross-check in
                          <span className="text-accent font-bold mx-1">Leads and Quotations</span>
                          to make sure you are not messing up.
                        </p>
                      </motion.div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="pt-6">
                <Button type="submit" disabled={createJobMutation.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-xs font-black uppercase tracking-widest shadow-lg shadow-accent/20">
                  {createJobMutation.isPending ? "Configuring Operation..." : "Initialize Job Order"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Job Detail Drawer */}
      <Sheet open={!!selectedJob} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
          setSelectedJob(null);
        }
      }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <SheetTitle>Job Order — #{selectedJob?.id.split('-')[0].toUpperCase()}</SheetTitle>
                <SheetDescription>Comprehensive operational overview and live tracking.</SheetDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn("transition-all rounded-full", isEditing ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
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
                {isEditing ? (
                  <div className="space-y-6">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleUpdateJob)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="origin"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Origin</FormLabel>
                                <FormControl><Input {...field} className="h-10" /></FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="destination"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Destination</FormLabel>
                                <FormControl><Input {...field} className="h-10" /></FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="driverRef"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Driver</FormLabel>
                                <FormControl>
                                  <HybridSelect
                                    options={dataNeeded?.drivers || []}
                                    value={field.value.id || field.value.name || ""}
                                    onChange={(val, isNew) => field.onChange(isNew ? { name: val } : { id: val })}
                                    placeholder="Search/Type Driver"
                                    allowCreate
                                    className="h-10"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="vehicleRef"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Vehicle</FormLabel>
                                <FormControl>
                                  <HybridSelect
                                    options={dataNeeded?.vehicles || []}
                                    value={field.value.id || field.value.plate || ""}
                                    onChange={(val, isNew) => field.onChange(isNew ? { plate: val } : { id: val })}
                                    placeholder="Search/Type Plate"
                                    allowCreate
                                    className="h-10"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Financial Value (USD)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input type="number" step="0.01" {...field} className="pl-9 h-11 font-bold text-accent" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-11 text-[10px] font-black uppercase tracking-widest"
                            onClick={() => setIsEditing(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={updateJobMutation.isPending}
                            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground h-11 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20"
                          >
                            {updateJobMutation.isPending ? "Syncing..." : "Save Changes"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                ) : (
                  <>
                    {selectedJob.status === 'planning' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8 p-6 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-200"
                      >
                        <div className="flex items-center gap-4 mb-4">
                           <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                              <CheckCircle2 className="h-6 w-6" />
                           </div>
                           <div>
                              <h4 className="text-sm font-black uppercase tracking-tight text-white">Ready for Activation</h4>
                              <p className="text-[11px] text-emerald-50 opacity-80">All requirements met. Confirm to notify Operations and Driver.</p>
                           </div>
                        </div>
                        <Button
                          className="w-full bg-white text-emerald-700 hover:bg-emerald-50 h-11 text-[10px] font-black uppercase tracking-widest shadow-lg"
                          onClick={() => updateStageMutation.mutate({ id: selectedJob.id, status: 'dispatched' })}
                        >
                          Confirm & Activate Operation
                        </Button>
                      </motion.div>
                    )}
                    <div className="grid grid-cols-2 gap-6 bg-muted/30 p-6 rounded-xl border border-dashed relative overflow-hidden">
                      {selectedJob.status === 'planning' && (
                        <div className="absolute top-0 right-0">
                          <Badge className="rounded-none rounded-bl-xl bg-amber-500 text-white border-none text-[8px] font-black uppercase tracking-tighter">
                            Awaiting Confirmation
                          </Badge>
                        </div>
                      )}
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
                        <span className="font-black text-foreground">{formatCurrency(selectedJob.total_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Created</span>
                        <span>{format(new Date(selectedJob.created_at), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </>
                )}

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
