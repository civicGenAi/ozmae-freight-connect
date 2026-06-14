import React, { useState } from "react";
import { Plus, Search, MapPin, Truck, User, Calendar, DollarSign, Clock, CheckCircle2, ChevronRight, Trash2, Info, Pencil, FileText, Upload, History, UserPlus, MessageSquare, Send, ShieldCheck, ImagePlus, Lock, Unlock, Loader2, Smartphone } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { DeliveryNotePDF } from "@/components/DeliveryNotePDF";
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
  "approved",
  "awaiting_deposit",
  "deposit_confirmed",
  "dispatched",
  "picked_up",
  "in_transit",
  "at_destination",
  "delivered",
  "closed",
  "cancelled",
  "on_hold",
  "in_progress",
  "completed"
] as const;

const jobSchema = z.object({
  selectedEntityId: z.string().min(1, "Please select a customer or prospect"),
  quotationId: z.string().optional(),
  origin: z.string().min(2, "Origin is required"),
  destination: z.string().min(2, "Destination is required"),
  driverRef: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
  }).optional(),
  vehicleRef: z.object({
    id: z.string().optional(),
    plate: z.string().optional(),
  }).optional(),
  amount: z.string().min(1, "Value is required"),
});

type JobFormValues = z.infer<typeof jobSchema>;

export default function JobOrders() {
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [deliveryNoteJob, setDeliveryNoteJob] = useState<any>(null);
  const [deliveryOverrides, setDeliveryOverrides] = useState({
    deliveredBy: "",
    shippingAddress: "",
    invoiceAddress: "",
    despatchDate: "",
    deliveryMethod: "ROAD",
    itemDescription: "",
    orderedQty: "1",
    deliveredQty: "1",
    outstandingQty: "0",
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    }
  });

  const userRole = userProfile?.role?.toLowerCase() || '';
  const isAdmin = userRole === 'admin';
  const isOperations = userRole === 'operations' || userRole === 'lead' || userRole === 'leads';
  const canManageDocs = isAdmin || isOperations;
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [bulkCategory, setBulkCategory] = useState("");

  const { data: globalCategories } = useQuery({
    queryKey: ["document_categories"],
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('document_type').limit(1000);
      return Array.from(new Set(data?.map(d => d.document_type))).filter(Boolean) as string[];
    }
  });

  // Derived job state for Admin Draft visibility
  const displayJob = React.useMemo(() => {
    if (!selectedJob) return null;
    if (isAdmin && selectedJob.has_pending_draft && selectedJob.draft_data) {
      return { ...selectedJob, ...selectedJob.draft_data };
    }
    return selectedJob;
  }, [selectedJob, isAdmin]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [progressText, setProgressText] = useState("");
  const [newStatus, setNewStatus] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      selectedEntityId: "",
      quotationId: "",
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
  const quotationId = form.watch("quotationId");
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
          draft_data,
          has_pending_draft,
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

  // Combined searchable options for the Business Entity picker
  const entityOptions = React.useMemo(() => [
    ...(dataNeeded?.customers || []),
    ...(dataNeeded?.prospects || []),
  ], [dataNeeded]);

  // All quotations belonging to the currently selected business entity.
  // A single business can have several quotes — we surface ALL of them so the
  // user can pick the right one instead of silently using only one.
  const entityQuotes = React.useMemo(() => {
    if (!selectedEntityId || !dataNeeded) return [] as any[];
    return dataNeeded.quotations.filter((q: any) =>
      q.customer_id === selectedEntityId || q.lead_id === selectedEntityId
    );
  }, [selectedEntityId, dataNeeded]);

  // When the entity changes, default to a sensible quote (accepted > most recent)
  // but keep the user's choice if it's still valid for this entity.
  useEffect(() => {
    if (!selectedEntityId) return;
    const current = form.getValues("quotationId");
    const stillValid = entityQuotes.some((q: any) => q.id === current);
    if (!stillValid) {
      const def = entityQuotes.find((q: any) => q.status === 'accepted')?.id || entityQuotes[0]?.id || "";
      form.setValue("quotationId", def);
    }
  }, [selectedEntityId, entityQuotes, form]);

  // Fill route + amount from the chosen quote (or prospect fallback when none).
  useEffect(() => {
    if (!selectedEntityId || !dataNeeded) return;
    const chosen = entityQuotes.find((q: any) => q.id === quotationId);
    if (chosen) {
      const val = (chosen.total_amount_usd ?? "").toString();
      form.setValue("amount", val);
      setSuggestedAmount(val);
      if (chosen.origin) form.setValue("origin", chosen.origin);
      if (chosen.destination) form.setValue("destination", chosen.destination);
    } else {
      const prospect = dataNeeded.prospects.find((p: any) => p.value === selectedEntityId);
      if (prospect) {
        form.setValue("origin", prospect.origin);
        form.setValue("destination", prospect.destination);
      }
      setSuggestedAmount(null);
    }
  }, [quotationId, selectedEntityId, dataNeeded, entityQuotes, form]);

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
      // If admin, we save to draft_data instead of live columns for 'converted' or confirmed jobs
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", (await supabase.auth.getUser()).data.user?.id).single();
      const isAdminRole = profile?.role?.toLowerCase() === 'admin';

      if (isAdminRole) {
        const { error } = await supabase
          .from("job_orders")
          .update({
            draft_data: updates,
            has_pending_draft: true
          })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("job_orders")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_orders"] });
      setIsEditing(false);
      setSelectedJob(null);
      toast.success("Changes saved as private draft");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const publishJobMutation = useMutation({
    mutationFn: async (job: any) => {
      if (!job.draft_data) return;

      const { error } = await supabase
        .from("job_orders")
        .update({
          ...job.draft_data,
          draft_data: null,
          has_pending_draft: false
        })
        .eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_orders"] });
      setSelectedJob(null);
      toast.success("Job order published to all staff");
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
      setJobToDelete(null);
      toast.success("Job order deleted");
    },
  });

  const handleFileUpload = async (files: FileList | null, category: string) => {
    if (!files || files.length === 0 || !selectedJob) return;
    if (!canManageDocs) {
      toast.error("Authority Required: Only Operations or Admins can upload documents.");
      return;
    }

    const fileArray = Array.from(files);

    for (const file of fileArray) {
      try {
        const fileId = Math.random().toString(36).substring(7);
        setUploadProgress(prev => ({ ...prev, [fileId]: 10 }));

        let fileToUpload = file;

        // Smart Optimization: Compress images to save storage
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          };
          setUploadProgress(prev => ({ ...prev, [fileId]: 30 }));
          fileToUpload = await imageCompression(file, options);
          setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `documents/${selectedJob.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('logistic-files')
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;
        setUploadProgress(prev => ({ ...prev, [fileId]: 80 }));

        const { error: dbError } = await supabase
          .from('documents')
          .insert([{
            job_order_id: selectedJob.id,
            file_name: file.name,
            file_path: filePath,
            document_type: category,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id
          }]);

        if (dbError) throw dbError;
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        toast.success(`Successfully optimized and uploaded: ${file.name}`);
        setTimeout(() => {
          setUploadProgress(prev => {
            const next = { ...prev };
            delete next[fileId];
            return next;
          });
        }, 2000);

      } catch (err: any) {
        toast.error(`Upload failed for ${file.name}: ${err.message}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["job_documents", selectedJob.id] });
  };

  const addProgressMutation = useMutation({
    mutationFn: async ({ job_id, text, status }: { job_id: string, text: string, status?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const updateData: any = {
        job_order_id: job_id,
        update_text: text,
        reported_by: user?.id,
        status: status || selectedJob?.status
      };

      const { error } = await supabase.from("job_progress_reports").insert([updateData]);
      if (error) throw error;

      if (status && status !== selectedJob?.status) {
        await supabase.from("job_orders").update({ status }).eq("id", job_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_progress", selectedJob?.id] });
      queryClient.invalidateQueries({ queryKey: ["job_orders"] });
      setProgressText("");
      setNewStatus(null);
      toast.success("Progress report added successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: templates } = useQuery({
    queryKey: ["operation_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("operation_templates").select("*");
      if (error) throw error;
      return data;
    }
  });

  const { data: progressReports } = useQuery({
    queryKey: ["job_progress", selectedJob?.id],
    queryFn: async () => {
      if (!selectedJob?.id) return [];
      const { data, error } = await supabase
        .from("job_progress_reports")
        .select(`*, reporter:profiles(full_name)`)
        .eq("job_order_id", selectedJob.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedJob?.id
  });

  const { data: jobDocs } = useQuery({
    queryKey: ["job_documents", selectedJob?.id],
    queryFn: async () => {
      if (!selectedJob?.id) return [];
      const { data, error } = await supabase
        .from("documents")
        .select(`*, uploader:profiles(full_name)`)
        .eq("job_order_id", selectedJob.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedJob?.id
  });

  const activeJobCategories = React.useMemo(() => {
    const base = [
      { key: "quotation_pdf", label: "Quotation PDF" },
      { key: "invoice_pdf", label: "Invoice PDF" },
      { key: "pickup_confirmation", label: "Pickup Confirmation" },
      { key: "delivery_note", label: "Delivery Note" }
    ];

    const customTypes = (jobDocs || [])
      .map(d => d.document_type)
      .filter(type => !base.some(b => b.key === type) && type);

    const customObjs = Array.from(new Set(customTypes)).map(type => ({
      key: type,
      label: type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }));

    return [...base, ...customObjs];
  }, [jobDocs]);

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
      let finalDriverId = driverRef?.id || null;
      let finalVehicleId = vehicleRef?.id || null;

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
      if (!finalDriverId && driverRef?.name) {
        const { data: newDriver, error: drvErr } = await supabase
          .from("drivers")
          .insert([{ full_name: driverRef.name, status: 'available', phone: 'Added via Job' }])
          .select()
          .single();
        if (drvErr) throw drvErr;
        finalDriverId = newDriver.id;
      }

      // 3. Handle New Vehicle (Hybrid)
      if (!finalVehicleId && vehicleRef?.plate) {
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

      // 4. Identify Quotation Link — honour the quote the user explicitly chose,
      // falling back to accepted > most recent for this entity.
      const candidateQuotes = dataNeeded?.quotations.filter((q: any) =>
        q.customer_id === finalCustomerId || q.lead_id === selectedEntityId
      ) || [];
      const targetQuote =
        candidateQuotes.find((q: any) => q.id === values.quotationId) ||
        candidateQuotes.find((q: any) => q.status === 'accepted') ||
        candidateQuotes[0];

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
                    <FormControl>
                      <HybridSelect
                        options={entityOptions}
                        value={field.value}
                        onChange={(val) => field.onChange(val)}
                        placeholder="Search customer or prospect..."
                        emptyMessage="No matching business found."
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {entityQuotes.length > 0 && (
                <FormField
                  control={form.control}
                  name="quotationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Source Quotation
                        {entityQuotes.length > 1 && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                            {entityQuotes.length} available — choose one
                          </span>
                        )}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select the quotation to base this job on" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entityQuotes.map((q: any) => (
                            <SelectItem key={q.id} value={q.id}>
                              <span className="font-mono font-bold text-accent uppercase mr-1">{q.id.split('-')[0]}</span>
                              · {formatCurrency(Number(q.total_amount_usd) || 0)}
                              · <span className="uppercase">{q.status}</span>
                              {(q.origin || q.destination) && ` · ${q.origin || '?'} → ${q.destination || '?'}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                <div className="flex items-center gap-2 mb-1">
                  <SheetTitle>Job Order — #{displayJob?.id.split('-')[0].toUpperCase()}</SheetTitle>
                  {isAdmin && displayJob?.has_pending_draft && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 text-[8px] font-black uppercase tracking-tighter animate-pulse">
                      Private Draft Mode
                    </Badge>
                  )}
                </div>
                <SheetDescription>Comprehensive operational overview and live tracking.</SheetDescription>
              </div>
              <div className="flex gap-2">
                {isAdmin && displayJob?.has_pending_draft && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest h-8 px-3 shadow-lg"
                    onClick={() => publishJobMutation.mutate(displayJob)}
                    disabled={publishJobMutation.isPending}
                  >
                    {publishJobMutation.isPending ? "Publishing..." : "Publish to Staff"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn("h-8 w-8 transition-all rounded-full", isEditing ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setJobToDelete(displayJob.id)}
                  className="h-8 w-8 hover:bg-rose-500 hover:text-white transition-all rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {selectedJob && (
            <Tabs defaultValue="info" className="mt-8">
              <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="info" className="rounded-lg font-bold uppercase text-[10px] tracking-widest">Job Info</TabsTrigger>
                <TabsTrigger value="finance" className="rounded-lg font-bold uppercase text-[10px] tracking-widest border-x">Financials</TabsTrigger>
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
                    {isAdmin && displayJob?.has_pending_draft && (
                      <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-amber-900 uppercase tracking-tight">Administrative Draft Active</p>
                          <p className="text-[10px] text-amber-700 leading-tight">You are viewing unsaved modifications. These changes are hidden from Operations and Finance staff until published.</p>
                        </div>
                      </div>
                    )}
                    {(displayJob.status === 'planning' || displayJob.status === 'awaiting_deposit') && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "mb-8 p-6 rounded-2xl shadow-xl transition-all",
                          displayJob.status === 'awaiting_deposit'
                            ? "bg-amber-100 border-2 border-amber-500 text-amber-900 shadow-amber-100"
                            : "bg-emerald-600 text-white shadow-emerald-200"
                        )}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-md",
                            displayJob.status === 'awaiting_deposit' ? "bg-amber-500/20" : "bg-white/20"
                          )}>
                            {displayJob.status === 'awaiting_deposit' ? <Clock className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-tight">
                              {displayJob.status === 'awaiting_deposit' ? "Financial Clearance Required" : "Ready for Activation"}
                            </h4>
                            <p className="text-[11px] opacity-80">
                              {displayJob.status === 'awaiting_deposit'
                                ? "Operating this job before deposit is confirmed is restricted."
                                : "All requirements met. Confirm to notify Operations and Driver."}
                            </p>
                          </div>
                        </div>
                        <Button
                          disabled={displayJob.status === 'awaiting_deposit' && !isAdmin}
                          className={cn(
                            "w-full h-11 text-[10px] font-black uppercase tracking-widest shadow-lg",
                            displayJob.status === 'awaiting_deposit'
                              ? "bg-amber-500 text-white hover:bg-amber-600"
                              : "bg-white text-emerald-700 hover:bg-emerald-50"
                          )}
                          onClick={() => updateStageMutation.mutate({ id: displayJob.id, status: 'dispatched' })}
                        >
                          {displayJob.status === 'awaiting_deposit' ? "Force Activation (Admin Only)" : "Confirm & Activate Operation"}
                        </Button>
                      </motion.div>
                    )}
                    <div className="grid grid-cols-2 gap-6 bg-muted/30 p-6 rounded-xl border border-dashed relative overflow-hidden">
                      {displayJob.status === 'planning' && (
                        <div className="absolute top-0 right-0">
                          <Badge className="rounded-none rounded-bl-xl bg-amber-500 text-white border-none text-[8px] font-black uppercase tracking-tighter">
                            Awaiting Confirmation
                          </Badge>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer</p>
                        <p className="text-lg font-bold text-foreground leading-tight">{displayJob.customer?.company_name || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Route</p>
                        <p className="font-bold text-foreground">{displayJob.origin} → {displayJob.destination}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-1">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resources & Access</h4>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-accent bg-accent/5 px-2 py-0.5 rounded border border-accent/20">
                          <Smartphone className="h-3 w-3" /> Access Code: {displayJob.id.split('-')[0].toUpperCase()}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-card rounded-lg border shadow-sm">
                          <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Driver</p>
                            <p className="text-sm font-bold">{displayJob.driver?.full_name || "Unassigned"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-card rounded-lg border shadow-sm">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Vehicle</p>
                            <p className="text-sm font-bold font-mono">{displayJob.vehicle?.plate_number || "None"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Value</span>
                        <span className="font-black text-foreground">{formatCurrency(displayJob.total_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Created</span>
                        <span>{format(new Date(displayJob.created_at), "MMM d, yyyy")}</span>
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

              <TabsContent value="finance" className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-card border rounded-2xl overflow-hidden">
                  <div className="bg-muted/50 p-4 border-b flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-widest">Financial Summary</h4>
                    <StatusBadge status={selectedJob.payment_status || 'pending'} />
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/20 rounded-xl border border-dashed">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Total Contract Value</p>
                        <p className="text-xl font-black text-foreground">{formatCurrency(selectedJob.total_amount || 0)}</p>
                      </div>
                      <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
                        <p className="text-[10px] font-black uppercase text-accent mb-1">Required Deposit (60%)</p>
                        <p className="text-xl font-black text-accent">{formatCurrency((selectedJob.total_amount || 0) * 0.6)}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">Payment Controls</h5>
                      <div className="flex flex-col gap-2">
                        {selectedJob.status === 'awaiting_deposit' && (
                          <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 font-bold shadow-lg gap-2"
                            onClick={() => {
                              toast.loading("Recording deposit receipt...");
                              updateStageMutation.mutate({ id: selectedJob.id, status: 'deposit_confirmed' });
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Confirm Deposit Received
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          className="w-full h-11 text-[10px] font-bold uppercase tracking-widest border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => setDeliveryNoteJob(selectedJob)}
                        >
                          <Truck className="h-4 w-4 mr-2" /> Generate Delivery Note
                        </Button>
                        <Button variant="outline" className="w-full h-11 text-[10px] font-bold uppercase tracking-widest border-accent text-accent">
                          Generate Official Invoice
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-[11px] text-amber-900 font-medium italic leading-relaxed">
                        "Finance confirmation required before operations activation. All transfers must be verified against bank statements."
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="docs" className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className={cn(
                  "bg-muted/30 p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all",
                  canManageDocs ? "border-accent/40" : "opacity-60 grayscale border-muted cursor-not-allowed"
                )}>
                  <div className="h-12 w-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                    {canManageDocs ? <Upload className="h-6 w-6 text-accent" /> : <Lock className="h-6 w-6 text-muted-foreground" />}
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest">Document Repository</h4>
                  <p className="text-[11px] text-muted-foreground mt-2 max-w-[220px]">
                    {canManageDocs ? "Securely store optimized BLs, permits, and invoices." : "Authority required to upload or manage documents."}
                  </p>

                  {canManageDocs && (
                    <div className="mt-6 w-full flex gap-3">
                      <div className="relative w-[220px]">
                        <Input
                          placeholder="Type or Pick Category"
                          value={bulkCategory}
                          onChange={(e) => setBulkCategory(e.target.value)}
                          list="category-suggestions"
                          className="h-10 text-[10px] uppercase font-bold border-accent/20 bg-accent/5 focus:ring-accent"
                        />
                        <datalist id="category-suggestions">
                          <option value="quotation_pdf" />
                          <option value="invoice_pdf" />
                          <option value="pickup_confirmation" />
                          <option value="delivery_note" />
                          <option value="Bill of Lading" />
                          <option value="Commercial Invoice" />
                          <option value="Permit / License" />
                          {globalCategories?.map((c: string) => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                      <label className="cursor-pointer flex-1">
                        <div className={cn(
                          "h-10 px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2",
                          bulkCategory ? "bg-accent text-accent-foreground hover:bg-accent/90" : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        )}>
                          <Plus className="h-3.5 w-3.5" /> Optimize & Upload
                        </div>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          disabled={!bulkCategory}
                          onChange={(e) => {
                            if (bulkCategory) {
                              handleFileUpload(e.target.files, bulkCategory);
                              setBulkCategory("");
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Individual Progress Bars */}
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="space-y-2 p-4 bg-accent/5 rounded-xl border border-accent/10">
                    <p className="text-[9px] font-black uppercase text-accent tracking-widest">Optimizing Transfers...</p>
                    {Object.entries(uploadProgress).map(([id, progress]) => (
                      <div key={id} className="space-y-1">
                        <div className="flex justify-between text-[8px] font-bold">
                          <span className="text-muted-foreground">Compressing & Encrypting...</span>
                          <span className="text-accent">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {activeJobCategories.map((dt) => {
                    const existingDoc = jobDocs?.find((d: any) => d.document_type === dt.key);
                    return (
                      <div key={dt.key} className="flex items-center justify-between p-4 bg-card rounded-xl border border-muted/50 hover:border-accent/30 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                            existingDoc ? "bg-emerald-50 text-emerald-600" : "bg-muted/50 text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent"
                          )}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-foreground">{dt.label}</p>
                            <p className={cn(
                              "text-[9px] font-medium uppercase tracking-tighter",
                              existingDoc ? "text-emerald-600" : "text-muted-foreground"
                            )}>
                              {existingDoc ? `Uploaded by ${existingDoc.uploader?.full_name || 'System'}` : "Status: Missing"}
                            </p>
                          </div>
                        </div>
                        <label className="cursor-pointer">
                          <div className="flex items-center justify-center h-8 px-3 rounded-md text-[9px] font-black uppercase tracking-widest text-accent hover:bg-accent/5 transition-all">
                            {existingDoc ? "Replace" : "Upload"}
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e.target.files, dt.key)}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {/* Progress Update Form */}
                <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-accent" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Post Operational Update</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Select onValueChange={(val) => {
                          const t = templates?.find((tmp: any) => tmp.id === val);
                          if (t) {
                            let text = t.template_text
                              .replace('{origin}', selectedJob.origin)
                              .replace('{destination}', selectedJob.destination);
                            setProgressText(text);
                            // Auto-set status if category matches
                            const possibleStatus = stages.find(s => t.category.toLowerCase().includes(s));
                            if (possibleStatus) setNewStatus(possibleStatus);
                          }
                        }}>
                          <SelectTrigger className="h-10 text-[10px] font-black uppercase bg-accent/5 border-dashed border-accent/30">
                            <SelectValue placeholder="Use Operation Template" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates?.map((t: any) => (
                              <SelectItem key={t.id} value={t.id} className="text-[11px] font-bold">
                                [{t.category}] {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Select value={newStatus || selectedJob.status} onValueChange={setNewStatus}>
                        <SelectTrigger className="h-10 text-[11px] font-bold">
                          <SelectValue placeholder="Update Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(s => (
                            <SelectItem key={s} value={s} className="text-[11px] font-medium capitalize">
                              {s.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Location (Optional)" className="h-10 text-[11px]" />
                    </div>
                    <Textarea
                      placeholder="Describe the current milestone or situation..."
                      className="min-h-[80px] text-[11px] bg-muted/20"
                      value={progressText}
                      onChange={(e) => setProgressText(e.target.value)}
                    />
                    <div className="flex items-center justify-between py-2 border-t border-muted/50">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="wa-notify"
                          className="rounded border-muted text-accent focus:ring-accent"
                          checked={notifyWhatsApp}
                          onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                        />
                        <label htmlFor="wa-notify" className="text-[10px] font-bold text-muted-foreground uppercase cursor-pointer">
                          Notify Client via WhatsApp
                        </label>
                      </div>
                      {notifyWhatsApp && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-accent uppercase tracking-tighter animate-pulse">
                          <MessageSquare className="h-3 w-3" /> API Bridge Ready
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-11 text-[10px] font-black uppercase tracking-widest gap-2"
                      onClick={() => {
                        addProgressMutation.mutate({ job_id: selectedJob.id, text: progressText, status: newStatus || undefined });
                        if (notifyWhatsApp) {
                          toast.info("WhatsApp Trigger: Status update notification queued (Integrations coming soon)");
                        }
                      }}
                      disabled={!progressText || addProgressMutation.isPending}
                    >
                      {addProgressMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Broadcast Update
                    </Button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted/50">
                  {progressReports?.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="h-10 w-10 text-muted/30 mx-auto mb-4" />
                      <p className="text-[11px] text-muted-foreground font-medium">No live updates yet. Add one to start tracking.</p>
                    </div>
                  ) : (
                    progressReports?.map((report: any, idx: number) => (
                      <div key={report.id} className="relative group animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className={cn(
                          "absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ring-4 ring-white z-10",
                          idx === 0 ? "bg-accent animate-pulse" : "bg-muted-foreground/30"
                        )} />
                        <div className="bg-white p-4 rounded-xl border shadow-sm group-hover:border-accent/30 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={report.status} />
                              <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground/60">Stage Milestone</span>
                            </div>
                            <span className="text-[9px] font-bold text-muted-foreground">{format(new Date(report.created_at), "MMM d, HH:mm")}</span>
                          </div>
                          <p className="text-[11px] text-foreground font-medium leading-relaxed">{report.update_text}</p>
                          <div className="mt-3 pt-3 border-t border-muted/50 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 bg-muted rounded-full flex items-center justify-center text-[8px] font-bold">
                                {report.reporter?.full_name?.charAt(0)}
                              </div>
                              <span className="text-[9px] font-bold text-muted-foreground">Reported by {report.reporter?.full_name}</span>
                            </div>
                            {report.location && (
                              <div className="flex items-center gap-1 text-[9px] font-bold text-accent">
                                <MapPin className="h-3 w-3" /> {report.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmModal
        isOpen={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={() => jobToDelete && deleteJobMutation.mutate(jobToDelete)}
        isDeleting={deleteJobMutation.isPending}
        title="Delete Job Order?"
        description="Are you absolutely sure you want to delete this job order? This will permanently erase the job and its entire history. This action cannot be reversed."
      />

      {/* View Delivery Note Dialog */}
      <Dialog open={!!deliveryNoteJob} onOpenChange={(open) => !open && setDeliveryNoteJob(null)}>
        <DialogContent className="sm:max-w-6xl w-[90vw] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Live Delivery Note Preview</DialogTitle>
            <DialogDescription>Modify fields on the left and see the changes instantly on the right.</DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Editor Sidebar */}
            <div className="w-1/3 border-r overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Delivered By</Label>
                  <Input value={deliveryOverrides.deliveredBy} onChange={e => setDeliveryOverrides(p => ({...p, deliveredBy: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Despatch Date</Label>
                  <Input type="date" value={deliveryOverrides.despatchDate} onChange={e => setDeliveryOverrides(p => ({...p, despatchDate: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Shipping Address</Label>
                  <Input value={deliveryOverrides.shippingAddress} placeholder="Destination Address" onChange={e => setDeliveryOverrides(p => ({...p, shippingAddress: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Invoice Address</Label>
                  <Input value={deliveryOverrides.invoiceAddress} placeholder="P.O BOX, Attn..." onChange={e => setDeliveryOverrides(p => ({...p, invoiceAddress: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Delivery Method</Label>
                  <Select value={deliveryOverrides.deliveryMethod} onValueChange={v => setDeliveryOverrides(p => ({...p, deliveryMethod: v}))}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROAD">ROAD</SelectItem>
                      <SelectItem value="SEA">SEA</SelectItem>
                      <SelectItem value="AIR">AIR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Item Description</Label>
                  <Input value={deliveryOverrides.itemDescription} placeholder="Cargo Transport..." onChange={e => setDeliveryOverrides(p => ({...p, itemDescription: e.target.value}))} className="h-9 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ordered</Label>
                  <Input value={deliveryOverrides.orderedQty} onChange={e => setDeliveryOverrides(p => ({...p, orderedQty: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Delivered</Label>
                  <Input value={deliveryOverrides.deliveredQty} onChange={e => setDeliveryOverrides(p => ({...p, deliveredQty: e.target.value}))} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Outstanding</Label>
                  <Input value={deliveryOverrides.outstandingQty} onChange={e => setDeliveryOverrides(p => ({...p, outstandingQty: e.target.value}))} className="h-9 text-xs" />
                </div>
              </div>

              {deliveryNoteJob && (
                <div className="pt-6 border-t mt-6">
                  <PDFDownloadLink 
                    document={<DeliveryNotePDF job={deliveryNoteJob} overrides={deliveryOverrides} />} 
                    fileName={`Delivery_Note_JOB-${deliveryNoteJob.id?.split('-')[0].toUpperCase()}.pdf`}
                    className="w-full block"
                  >
                    {({ loading }) => (
                       <Button className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase tracking-widest text-xs shadow-lg" disabled={loading}>
                          <Download className="h-4 w-4 mr-2" /> {loading ? "Preparing PDF..." : "Download Original PDF"}
                       </Button>
                    )}
                  </PDFDownloadLink>
                </div>
              )}
            </div>

            {/* Preview Section */}
            <div className="w-2/3 bg-slate-100 p-6 flex flex-col">
              {deliveryNoteJob ? (
                <div className="flex-1 rounded-xl overflow-hidden border shadow-sm bg-white">
                  <PDFViewer width="100%" height="100%" className="border-0">
                    <DeliveryNotePDF job={deliveryNoteJob} overrides={deliveryOverrides} />
                  </PDFViewer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Loading preview...
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
