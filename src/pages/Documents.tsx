import { useState, useRef, Fragment } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Upload, FileText, FileCheck, Camera, ClipboardCheck, Trash2, ExternalLink, HardDrive, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

const docTypes = [
  { key: "quotation", label: "Quotation PDF", icon: FileText },
  { key: "invoice", label: "Invoice PDF", icon: FileCheck },
  { key: "pickup", label: "Pickup Confirmation", icon: Camera },
  { key: "delivery", label: "Delivery Note", icon: ClipboardCheck },
];

export default function Documents() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ jobId: string; category: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: jobGroups, isLoading } = useQuery({
    queryKey: ["document_groups"],
    queryFn: async () => {
      const { data: jobs, error: jobsError } = await supabase
        .from("job_orders")
        .select("id, customer:customers(company_name), origin, destination")
        .order("created_at", { ascending: false });
      
      if (jobsError) throw jobsError;

      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("*");
      
      if (docsError) throw docsError;

      return jobs.map((job: any) => ({
        ...job,
        docs: docs.filter(d => d.job_order_id === job.id),
        lastUpdated: docs.filter(d => d.job_order_id === job.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
      }));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, jobId, category }: { file: File; jobId: string; category: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `documents/${jobId}/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('logistic-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logistic-files')
        .getPublicUrl(filePath);

      // 3. Save to DB
      const { error: dbError } = await supabase.from("documents").insert([{
        job_order_id: jobId,
        name: file.name,
        file_url: publicUrl,
        category: category
      }]);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_groups"] });
      toast.success("Document uploaded successfully");
      setUploading(null);
    },
    onError: (err: any) => {
      toast.error(err.message);
      setUploading(null);
    }
  });

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
                            const doc = job.docs.find((d: any) => d.category?.toLowerCase() === dt.key);
                            const isThisUploading = uploading?.jobId === job.id && uploading?.category === dt.key;
                            
                            return (
                              <div
                                key={dt.key}
                                className={cn(
                                  "relative group flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all",
                                  doc ? "bg-card border-success/20 shadow-sm" : "bg-card border-dashed border-muted-foreground/10 hover:border-accent/30"
                                )}
                              >
                                <div className={cn(
                                  "h-12 w-12 rounded-xl flex items-center justify-center mb-3 shadow-inner",
                                  doc ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"
                                )}>
                                  {isThisUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <dt.icon className="h-6 w-6" />}
                                </div>
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-widest text-center",
                                  doc ? "text-foreground" : "text-muted-foreground"
                                )}>{dt.label}</span>
                                
                                {doc ? (
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-card border shadow-sm hover:text-accent">
                                       <ExternalLink className="h-3 w-3" />
                                    </a>
                                    <button onClick={() => deleteMutation.mutate(doc)} className="p-1.5 rounded-lg bg-card border shadow-sm hover:text-destructive">
                                       <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    disabled={uploadMutation.isPending}
                                    onClick={() => triggerUpload(job.id, dt.key)}
                                    className="mt-4 h-7 text-[9px] font-black uppercase tracking-tighter hover:bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                     {isThisUploading ? "Uploading..." : "Select File"}
                                  </Button>
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
    </div>
  );
}
