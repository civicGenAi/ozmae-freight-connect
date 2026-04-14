import { useState, useRef, Fragment } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight, 
  Upload, 
  FileText, 
  FileCheck, 
  Camera, 
  ClipboardCheck, 
  Trash2, 
  ExternalLink, 
  HardDrive, 
  Loader2,
  Sparkles, 
  FileSearch, 
  Wand2, 
  CheckCircle2,
  DollarSign,
  Eye,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { pdf } from "@react-pdf/renderer";
import { PickupPDF } from "@/components/PickupPDF";
import { DeliveryNotePDF } from "@/components/DeliveryNotePDF";
import { InvoicePDF } from "@/components/InvoicePDF";
import { QuotationPDFDocument } from "@/components/QuotationPDFDocument";

const docTypes = [
  { key: "quotation_pdf", label: "Quotation PDF", icon: FileText },
  { key: "invoice_pdf", label: "Invoice PDF", icon: FileCheck },
  { key: "pickup_confirmation", label: "Pickup Confirmation", icon: Camera },
  { key: "delivery_note", label: "Delivery Note", icon: ClipboardCheck },
];

export default function Documents() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ jobId: string; category: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateType, setTemplateType] = useState<"pickup" | "delivery" | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [templateDetails, setTemplateDetails] = useState<any>({});
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: jobGroups, isLoading } = useQuery({
    queryKey: ["document_groups"],
    queryFn: async () => {
      const { data: jobs, error: jobsError } = await supabase
        .from("job_orders")
        .select("id, quotation_id, customer:customers(company_name), origin, destination")
        .order("created_at", { ascending: false });
      
      if (jobsError) throw jobsError;

      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("id, job_order_id, file_name, file_path, document_type, created_at");
      
      if (docsError) throw docsError;

      return jobs.map((job: any) => ({
        ...job,
        docs: docs.filter(d => d.job_order_id === job.id),
        lastUpdated: docs.filter(d => d.job_order_id === job.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at,
        quotation_id: job.quotation_id // Ensure this is returned
      }));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, jobId, category }: { file: File | Blob; jobId: string; category: string }) => {
      setUploadProgress(10);
      const fileName = `${category}_${Date.now()}.pdf`;
      const filePath = `documents/${jobId}/${fileName}`;

      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('logistic-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(70);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required for upload.");

      const { error: dbError } = await supabase.from("documents").insert([{
        job_order_id: jobId,
        file_name: file instanceof File ? file.name : fileName,
        file_path: filePath,
        document_type: category,
        uploaded_by: user.id
      }]);

      if (dbError) throw dbError;
      setUploadProgress(100);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_groups"] });
      toast.success("Document added to vault");
      setTimeout(() => {
        setUploading(null);
        setUploadProgress(0);
      }, 500);
    },
    onError: (err: any) => {
      toast.error(err.message);
      setUploading(null);
      setUploadProgress(0);
    }
  });

  const pullFromSystem = async (job: any, type: "quotation" | "invoice") => {
    setUploading({ jobId: job.id, category: type });
    try {
      let blob;
      if (type === "quotation") {
        if (!job.quotation_id) throw new Error("No quotation linked to this job.");
        const { data: quote } = await supabase.from("quotations").select("*").eq("id", job.quotation_id).single();
        if (!quote) throw new Error("Quotation not found.");
        
        // Format metadata for QuotationPDFDocument
        const meta = {
            titleText: "TAX QUOTATION",
            leftFields: [
                { label: "Customer", value: job.customer?.company_name || "N/A" },
                { label: "Origin", value: quote.origin },
                { label: "Destination", value: quote.destination }
            ],
            tableHeaders: ["Description", "Price"],
            tableRows: [{ type: "item", desc: quote.cargo_description || "Transport Services", amount: quote.total_amount_usd }]
        };
        blob = await pdf(<QuotationPDFDocument meta={meta as any} logoUrl="" signatureUrl="" />).toBlob();
        uploadMutation.mutate({ file: blob, jobId: job.id, category: "quotation_pdf" });
      } else {
        const { data: inv } = await supabase.from("invoices").select("*, job:job_orders(id, origin, destination, customer:customers(company_name))").eq("job_order_id", job.id).single();
        if (!inv) throw new Error("No invoice found for this job.");
        blob = await pdf(<InvoicePDF invoice={inv} />).toBlob();
        uploadMutation.mutate({ file: blob, jobId: job.id, category: "invoice_pdf" });
      }
    } catch (err: any) {
      toast.error(err.message);
      setUploading(null);
    }
  };

  const generateTemplate = async () => {
    if (!selectedJob || !templateType) return;
    setUploading({ jobId: selectedJob.id, category: templateType });
    setIsTemplateModalOpen(false);

    try {
      const dbType = templateType === "pickup" ? "pickup_confirmation" : "delivery_note";
      const blob = templateType === "pickup" 
        ? await pdf(<PickupPDF job={selectedJob} details={templateDetails} />).toBlob()
        : await pdf(<DeliveryNotePDF job={selectedJob} details={templateDetails} />).toBlob();

      uploadMutation.mutate({ file: blob, jobId: selectedJob.id, category: dbType });
    } catch (err: any) {
      toast.error("Generation failed");
      setUploading(null);
    }
  };

  const [requestingAccess, setRequestingAccess] = useState<string | null>(null);

  const getSecureUrl = async (doc: any) => {
    // Backward compatibility: if it's already a full URL, return it
    if (doc.file_path.startsWith('http')) return doc.file_path;

    const { data, error } = await supabase.storage
      .from('logistic-files')
      .createSignedUrl(doc.file_path, 3600); // 1 hour access

    if (error) throw error;
    return data.signedUrl;
  };

  const handlePreview = async (doc: any) => {
    setRequestingAccess(doc.id);
    try {
      const url = await getSecureUrl(doc);
      setPreviewDoc({ ...doc, signedUrl: url });
    } catch (err: any) {
      toast.error("Access denied");
    } finally {
      setRequestingAccess(null);
    }
  };

  const handleDownload = async (doc: any) => {
    setRequestingAccess(doc.id);
    try {
      const url = await getSecureUrl(doc);
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error("Could not generate download link");
    } finally {
      setRequestingAccess(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      // 1. Delete from DB
      const { error: dbError } = await supabase.from("documents").delete().eq("id", doc.id);
      if (dbError) throw dbError;

      // 2. Delete from Storage (optional but good practice)
      // Extract path from URL if needed, for now just DB delete is enough for MVP
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_groups"] });
      toast.success("Document removed");
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploading) {
      uploadMutation.mutate({ file, jobId: uploading.jobId, category: uploading.category });
    }
  };

  const triggerUpload = (jobId: string, category: string) => {
    setUploading({ jobId, category });
    fileInputRef.current?.click();
  };

  const toggleExpand = (jobId: string) => {
    setExpanded(expanded === jobId ? null : jobId);
  };

  return (
    <div className="space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileSelect}
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
      />
      
      <PageHeader title="Document Vault">
         <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-3 py-1.5 rounded-full border border-dashed">
          <HardDrive className="h-3 w-3 text-accent" /> Secure Cloud Storage
        </div>
      </PageHeader>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Job ID</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Customer</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Route</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Last Activity</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : jobGroups?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic">No jobs available in the system.</TableCell>
              </TableRow>
            ) : jobGroups?.map((job: any) => {
              const isExpanded = expanded === job.id;
              const docCount = job.docs.length;
              return (
                <Fragment key={job.id}>
                  <TableRow 
                    className={cn(
                      "cursor-pointer transition-colors group",
                      isExpanded ? "bg-accent/5" : "hover:bg-muted/30"
                    )} 
                    onClick={() => toggleExpand(job.id)}
                  >
                    <TableCell>
                      <div className={cn(
                        "h-6 w-6 rounded-lg flex items-center justify-center transition-all",
                        isExpanded ? "bg-accent text-accent-foreground" : "group-hover:bg-accent/10"
                      )}>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] font-black uppercase text-accent">
                      {job.id.split('-')[0]}
                    </TableCell>
                    <TableCell className="font-bold text-foreground">{job.customer?.company_name || 'N/A'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">
                       {job.origin} <ChevronRight className="h-3 w-3 inline opacity-50" /> {job.destination}
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                          <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                             <div className="h-full bg-accent transition-all" style={{ width: `${(docCount / 4) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-muted-foreground">{docCount}/4</span>
                       </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.lastUpdated ? format(new Date(job.lastUpdated), "MMM d, HH:mm") : "—"}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-widest text-accent hover:bg-accent/10" 
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerUpload(job.id, "quotation"); // Default or show menu
                        }}
                      >
                        <Upload className="h-3 w-3" /> Quick Upload
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-muted/10 border-t-0">
                      <TableCell colSpan={7} className="px-12 py-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          {docTypes.map((dt) => {
                            const doc = job.docs.find((d: any) => d.document_type === dt.key);
                            const isThisUploading = uploading?.jobId === job.id && uploading?.category === dt.key;
                            
                            return (
                              <div
                                key={dt.key}
                                className={cn(
                                  "relative group flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all h-[180px]",
                                  doc ? "bg-card border-success/20 shadow-sm" : "bg-card border-dashed border-muted-foreground/10 hover:border-accent/30"
                                )}
                              >
                                {doc ? (
                                  <div className="absolute top-3 right-3 flex gap-1 z-10">
                                    <button 
                                      onClick={() => handlePreview(doc)}
                                      disabled={requestingAccess === doc.id}
                                      className="p-1.5 rounded-lg bg-white border shadow-sm hover:text-accent transition-colors disabled:opacity-50"
                                      title="Preview Document"
                                    >
                                       {requestingAccess === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                                    </button>
                                    <button 
                                      onClick={() => handleDownload(doc)}
                                      disabled={requestingAccess === doc.id}
                                      className="p-1.5 rounded-lg bg-white border shadow-sm hover:text-accent transition-colors disabled:opacity-50"
                                      title="Download/External"
                                    >
                                       <ExternalLink className="h-3 w-3" />
                                    </button>
                                    <button onClick={() => deleteMutation.mutate(doc)} className="p-1.5 rounded-lg bg-white border shadow-sm hover:text-destructive transition-colors" title="Remove">
                                       <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : null}

                                <div className={cn(
                                  "h-14 w-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner transition-transform group-hover:scale-110",
                                  doc ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"
                                )}>
                                  {isThisUploading ? (
                                    <div className="relative h-10 w-10 flex items-center justify-center">
                                       <Loader2 className="h-6 w-6 animate-spin absolute" />
                                       <span className="text-[8px] font-black mt-8">{uploadProgress}%</span>
                                    </div>
                                  ) : (
                                    doc ? <CheckCircle2 className="h-7 w-7" /> : <dt.icon className="h-7 w-7" />
                                  )}
                                </div>
                                
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest text-center",
                                  doc ? "text-foreground" : "text-muted-foreground"
                                )}>{dt.label}</span>
                                
                                {isThisUploading && (
                                   <div className="w-full mt-4 max-w-[80px]">
                                      <Progress value={uploadProgress} className="h-1 bg-slate-100" />
                                   </div>
                                )}

                                {!doc && !isThisUploading && (
                                   <div className="flex gap-2 mt-4">
                                      {/* Smart Actions */}
                                      <div className="flex bg-slate-100 rounded-lg p-0.5 border">
                                          <button 
                                            title="External Upload"
                                            onClick={() => triggerUpload(job.id, dt.key)}
                                            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-slate-500 hover:text-accent transition-all"
                                          >
                                            <Upload className="h-3 w-3" />
                                          </button>
                                          {(dt.key === "quotation_pdf" || dt.key === "invoice_pdf") && (
                                            <button 
                                              title="Pull from System"
                                              onClick={() => pullFromSystem(job, dt.key === "quotation_pdf" ? "quotation" : "invoice")}
                                              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-slate-500 hover:text-accent transition-all"
                                            >
                                              <FileSearch className="h-3 w-3" />
                                            </button>
                                          )}
                                          {(dt.key === "pickup_confirmation" || dt.key === "delivery_note") && (
                                            <button 
                                              title="Generate Template"
                                              onClick={() => {
                                                setSelectedJob(job);
                                                setTemplateType(dt.key === "pickup_confirmation" ? "pickup" : "delivery");
                                                setTemplateDetails({
                                                  driver_name: "",
                                                  vehicle_plate: "",
                                                  quantity: "1 Unit",
                                                  pickup_datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                                                  consignee_name: job.customer?.company_name
                                                });
                                                setIsTemplateModalOpen(true);
                                              }}
                                              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-slate-500 hover:text-accent transition-all animate-pulse"
                                            >
                                              <Wand2 className="h-3 w-3" />
                                            </button>
                                          )}
                                      </div>
                                   </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Template Details Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="max-w-md">
           <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                 <Wand2 className="h-5 w-5 text-accent" /> Configure Template
              </DialogTitle>
           </DialogHeader>
           
           <div className="grid gap-4 py-4">
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground">Cargo Details</Label>
                 <Input 
                   placeholder="Quantity (e.g., 20 Tons)"
                   value={templateDetails.quantity}
                   onChange={e => setTemplateDetails({...templateDetails, quantity: e.target.value})}
                   className="font-bold h-11"
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Driver Name</Label>
                    <Input 
                      placeholder="Full Name"
                      value={templateDetails.driver_name}
                      onChange={e => setTemplateDetails({...templateDetails, driver_name: e.target.value})}
                      className="font-bold h-11"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Vehicle plate</Label>
                    <Input 
                      placeholder="ABC-123"
                      value={templateDetails.vehicle_plate}
                      onChange={e => setTemplateDetails({...templateDetails, vehicle_plate: e.target.value})}
                      className="font-bold h-11 uppercase"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground">
                   {templateType === "pickup" ? "Pickup Date & Time" : "Expected Delivery Date & Time"}
                 </Label>
                 <Input 
                   type="datetime-local"
                   value={templateDetails.pickup_datetime}
                   onChange={e => setTemplateDetails({...templateDetails, pickup_datetime: e.target.value})}
                   className="font-bold h-11"
                 />
              </div>

              {templateType === "delivery" && (
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground">Consignee Name</Label>
                   <Input 
                     placeholder="Receiving Company/Person"
                     value={templateDetails.consignee_name}
                     onChange={e => setTemplateDetails({...templateDetails, consignee_name: e.target.value})}
                     className="font-bold h-11"
                   />
                </div>
              )}
           </div>

           <DialogFooter>
              <Button 
                className="w-full bg-slate-900 h-12 font-black uppercase text-xs tracking-widest gap-2"
                onClick={generateTemplate}
              >
                 <Sparkles className="h-4 w-4 text-accent" /> Generate & Upload into Vault
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden bg-slate-900 border-slate-800">
           <DialogHeader className="p-4 bg-slate-800/50 border-b border-slate-700/50 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-white text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                   <FileText className="h-4 w-4 text-accent" /> {previewDoc?.file_name}
                </DialogTitle>
                <p className="text-[10px] text-slate-400 font-medium">Document Vault Preview • {previewDoc?.document_type.replace('_', ' ')}</p>
              </div>
           </DialogHeader>
           
           <div className="flex-1 w-full h-full bg-slate-100 flex items-center justify-center relative">
              {previewDoc?.signedUrl || previewDoc?.file_path?.startsWith('http') ? (
                <iframe 
                  src={`${previewDoc.signedUrl || previewDoc.file_path}#toolbar=0`} 
                  className="w-full h-full border-none"
                  title="Document Preview"
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                   <Loader2 className="h-10 w-10 animate-spin text-slate-300" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verifying Permissions...</p>
                </div>
              )}
           </div>

           <div className="p-3 bg-slate-800/80 border-t border-slate-700/50 flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter italic">Digitally Secured by Ozmae Cloud Storage</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPreviewDoc(null)}
                className="text-white hover:bg-white/10"
              >
                Close Viewer
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
