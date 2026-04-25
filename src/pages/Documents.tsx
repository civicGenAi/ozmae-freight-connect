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
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 15;

const docTypes = [
  { key: "quotation_pdf", label: "Quotation PDF", icon: FileText },
  { key: "invoice_pdf", label: "Invoice PDF", icon: FileCheck },
  { key: "pickup_confirmation", label: "Pickup Confirmation", icon: Camera },
  { key: "delivery_note", label: "Delivery Note", icon: ClipboardCheck },
];

export default function Documents() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const queryClient = useQueryClient();

  const { data: jobGroupsData, isLoading } = useQuery({
    queryKey: ["document_groups", currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: jobs, error: jobsError, count } = await supabase
        .from("job_orders")
        .select("id, quotation_id, customer:customers(company_name), origin, destination", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (jobsError) throw jobsError;

      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("id, job_order_id, file_name, file_path, document_type, created_at");
      
      if (docsError) throw docsError;

      const mappedJobs = jobs.map((job: any) => ({
        ...job,
        docs: docs.filter(d => d.job_order_id === job.id),
        lastUpdated: docs.filter(d => d.job_order_id === job.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at,
        quotation_id: job.quotation_id // Ensure this is returned
      }));

      return { jobs: mappedJobs, totalCount: count || 0 };
    },
  });

  const jobGroups = jobGroupsData?.jobs || [];
  const totalCount = jobGroupsData?.totalCount || 0;

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

  const toggleExpand = (jobId: string) => {
    setExpanded(expanded === jobId ? null : jobId);
  };

  return (
    <div className="space-y-6">
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
                const customTypes = (job.docs || [])
                  .map((d: any) => d.document_type)
                  .filter((type: string) => !docTypes.some(b => b.key === type) && type);

                const activeJobCategories = [
                  ...docTypes,
                  ...Array.from(new Set(customTypes)).map((type: any) => ({
                    key: type,
                    label: type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    icon: FileText
                  }))
                ];

                return (
                  <Fragment key={job.id}>
                  <TableRow 
                    className={cn(
                      "cursor-pointer transition-colors group",
                      expanded === job.id ? "bg-accent/5" : "hover:bg-muted/30"
                    )} 
                    onClick={() => toggleExpand(job.id)}
                  >
                    <TableCell>
                      <div className={cn(
                        "h-6 w-6 rounded-lg flex items-center justify-center transition-all",
                        expanded === job.id ? "bg-accent text-accent-foreground" : "group-hover:bg-accent/10"
                      )}>
                        {expanded === job.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                             <div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, ((job.docs?.length || 0) / activeJobCategories.length) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-muted-foreground">{job.docs?.length || 0}/{activeJobCategories.length}</span>
                       </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.lastUpdated ? format(new Date(job.lastUpdated), "MMM d, HH:mm") : "—"}
                    </TableCell>
                  </TableRow>
                  {expanded === job.id && (
                    <TableRow className="bg-muted/10 border-t-0">
                      <TableCell colSpan={7} className="px-12 py-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          {activeJobCategories.map((dt) => {
                            const doc = job.docs?.find((d: any) => d.document_type === dt.key);
                            
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
                                  {doc ? <CheckCircle2 className="h-7 w-7" /> : <dt.icon className="h-7 w-7" />}
                                </div>
                                
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest text-center",
                                  doc ? "text-foreground" : "text-muted-foreground"
                                )}>{dt.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
            }
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

      {/* Preview Full-Screen Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[90vh] bg-neutral-900 border-none sm:rounded-2xl flex flex-col p-0 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md absolute top-0 w-full z-10 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h2 className="text-white font-medium text-sm">{previewDoc?.file_name}</h2>
                <p className="text-white/50 text-[10px] uppercase tracking-widest">{previewDoc?.document_type.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => handleDownload(previewDoc)}>
                <ExternalLink className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10" onClick={() => setPreviewDoc(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 w-full bg-neutral-900 pt-16 flex items-center justify-center">
            {previewDoc?.signedUrl ? (
              previewDoc.file_path.toLowerCase().endsWith('.pdf') ? (
                <iframe src={`${previewDoc.signedUrl}#view=FitH`} className="w-full h-full border-none bg-white" title="PDF Preview" />
              ) : (
                <img src={previewDoc.signedUrl} alt="Preview" className="max-w-full max-h-full object-contain p-4" />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-white/50 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-xs uppercase tracking-widest font-bold">Loading Secure Preview</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
