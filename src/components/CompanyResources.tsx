import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  ExternalLink, 
  Filter, 
  Search, 
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  FileBox,
  Share2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PinGate } from "./PinGate";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORIES = ["General", "Legal", "Forms", "Operations", "Finance", "Internal"];

interface CompanyResourcesProps {
  pinEnabled: boolean;
  pinHash: string;
  isAdmin: boolean;
}

export function CompanyResources({ pinEnabled, pinHash, isAdmin }: CompanyResourcesProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resourceName, setResourceName] = useState("");
  const [resourceCategory, setResourceCategory] = useState("General");
  const [pinGateOpen, setPinGateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>(null);

  // New preview state
  const [previewResource, setPreviewResource] = useState<any>(null);
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: resources, isLoading } = useQuery({
    queryKey: ["company_resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_resources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const resource = resources?.find(r => r.id === id);
      if (resource) {
        // Delete from storage first
        await supabase.storage.from("company-private-resources").remove([resource.file_path]);
        // Then delete from DB
        const { error } = await supabase.from("company_resources").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_resources"] });
      toast.success("Resource deleted permanently");
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleAction = (action: () => void) => {
    if (pinEnabled && pinHash) {
      setPendingAction(() => action);
      setPinGateOpen(true);
    } else {
      action();
    }
  };

  const handlePreview = async (resource: any) => {
    setIsPreviewLoading(true);
    setPreviewResource(resource);
    try {
      const { data, error } = await supabase.storage
        .from("company-private-resources")
        .createSignedUrl(resource.file_path, 3600);
      
      if (error) throw error;
      setSignedUrl(data.signedUrl);
      setPreviewDialogOpen(true);
    } catch (err: any) {
      toast.error(`Failed to generate secure link: ${err.message}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownload = async (resource: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("company-private-resources")
        .createSignedUrl(resource.file_path, 60); // Short 60s for direct download
      
      if (error) throw error;
      
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = resource.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.error(`Download failed: ${err.message}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setSelectedFile(file);
    setResourceName(file.name.split('.').slice(0, -1).join('.'));
    setUploadDialogOpen(true);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleStartUpload = async () => {
    if (!selectedFile || !resourceName || !resourceCategory) {
       toast.error("Please provide all required metadata");
       return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileName = `${Date.now()}-${selectedFile.name.replace(/\s+/g, "_")}`;
      const filePath = `resources/${fileName}`;

      // Perform upload with progress tracking
      // Note: Supabase JS upload doesn't expose progress easily in standard 'upload' call
      // We will simulate it for better UX or use a workaround if supported.
      // Actually, we'll use a manual interval for smooth visual bar then 100% on completion.
      const progressInterval = setInterval(() => {
         setUploadProgress(prev => prev < 90 ? prev + (Math.random() * 10) : prev);
      }, 300);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("company-private-resources")
        .upload(filePath, selectedFile, {
           cacheControl: '3600',
           upsert: false
        });

      clearInterval(progressInterval);
      if (uploadError) throw uploadError;
      
      const { error: dbError } = await supabase.from("company_resources").insert({
        name: resourceName,
        category: resourceCategory,
        file_path: filePath,
        file_url: "", // Relying on signed URLs for access
        size_bytes: selectedFile.size,
        content_type: selectedFile.type,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id
      });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["company_resources"] });
      toast.success("New resource added to vault");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setResourceName("");
      setUploadProgress(0);
    } catch (err: any) {
      toast.error(err.message);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredResources = resources?.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || r.category === category;
    return matchesSearch && matchesCategory;
  });

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-6 rounded-3xl border border-white shadow-sm backdrop-blur-sm">
        <div className="space-y-1">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
            <FileBox className="h-5 w-5 text-accent" /> Company Resources
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Secure documents, internal forms, and corporate resources protected by {pinEnabled ? "Active PIN Layer" : "Role Access"}.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button disabled={isUploading} className="h-10 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest px-6 rounded-xl gap-2 shadow-lg shadow-slate-200">
              <Plus className="h-3 w-3" />
              Upload Resource
            </Button>
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileSelect} 
              disabled={isUploading}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <div className="md:col-span-1 space-y-4">
           <div className="bg-card rounded-2xl border p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                <Input 
                  placeholder="Search files..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-10 text-[10px] font-bold tracking-tight rounded-xl bg-slate-50 border-none"
                />
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-slate-400 px-3 mb-2 tracking-widest">Filter by Category</p>
                <button 
                  onClick={() => setCategory("All")}
                  className={cn(
                    "w-full text-left px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider",
                    category === "All" ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  All Resources
                </button>
                {CATEGORIES.map(c => (
                  <button 
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "w-full text-left px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider",
                      category === c ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
           </div>
        </div>

        <div className="md:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted/40 rounded-3xl animate-pulse border border-white" />)}
            </div>
          ) : filteredResources?.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center gap-4">
               <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                  <FileText className="h-8 w-8 text-slate-300" />
               </div>
               <div className="space-y-1">
                  <p className="text-sm font-black uppercase text-slate-900">No resources found</p>
                  <p className="text-[10px] text-slate-400 font-bold">Try adjusting your search or upload a new file.</p>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources?.map(r => (
                <div key={r.id} className="group bg-white rounded-3xl border border-slate-100 p-5 hover:border-accent hover:shadow-xl hover:shadow-slate-200 transition-all duration-300 relative">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                      r.content_type.includes('pdf') ? "bg-rose-50 text-rose-500" :
                      r.content_type.includes('image') ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"
                    )}>
                      <FileText className="h-6 w-6" />
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-[10px] font-black uppercase tracking-widest rounded-xl p-1">
                        <DropdownMenuItem 
                          onClick={() => handleAction(() => handlePreview(r))} 
                          className="gap-2 cursor-pointer"
                        >
                           <ExternalLink className="h-3 w-3" /> View Online
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleAction(() => handleDownload(r))} 
                          className="gap-2 cursor-pointer"
                        >
                           <Download className="h-3 w-3" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleAction(() => deleteMutation.mutate(r.id))}
                          className="gap-2 text-rose-600 focus:text-rose-600 cursor-pointer"
                        >
                           <Trash2 className="h-3 w-3" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-black uppercase text-slate-800 truncate" title={r.name}>{r.name}</p>
                    <div className="flex items-center gap-2">
                       <Badge variant="secondary" className="px-2 py-0 h-4 text-[8px] font-black tracking-widest uppercase bg-slate-50 text-slate-400 border-none">{r.category}</Badge>
                       <span className="text-[8px] font-bold text-slate-400 capitalize">{(r.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t pt-4 border-slate-50">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400">
                       <ShieldCheck className={cn("h-3 w-3", pinEnabled ? "text-emerald-500" : "text-amber-500")} />
                       {pinEnabled ? "Secured" : "Unprotected"}
                    </div>
                    <p className="text-[8px] font-bold text-slate-300">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-4xl h-[85vh] rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col">
          <DialogHeader className="bg-slate-900 px-8 py-5 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div className="text-left">
                  <DialogTitle className="text-lg font-black uppercase tracking-tight">{previewResource?.name}</DialogTitle>
                  <DialogDescription className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    {previewResource?.category} • Vault Secure View
                  </DialogDescription>
                </div>
              </div>
              <div className="flex gap-2">
                 <Button 
                   variant="ghost" 
                   onClick={() => handleDownload(previewResource)}
                   className="h-10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
                 >
                   <Download className="h-4 w-4 mr-2" /> Download
                 </Button>
                 <Button 
                   variant="ghost" 
                   onClick={() => setPreviewDialogOpen(false)}
                   className="h-10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
                 >
                   <X className="h-4 w-4" />
                 </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 bg-slate-100 overflow-hidden relative">
             {isPreviewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-50">
                   <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 text-accent animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Generating Secure Access...</p>
                   </div>
                </div>
             ) : (
                <div className="h-full w-full p-4">
                  {previewResource?.content_type?.includes('pdf') ? (
                    <iframe 
                      src={`${signedUrl}#toolbar=0`} 
                      className="w-full h-full rounded-2xl border-none shadow-inner"
                      title={previewResource?.name}
                    />
                  ) : previewResource?.content_type?.includes('image') ? (
                    <div className="h-full w-full flex items-center justify-center overflow-auto bg-white rounded-2xl p-4 shadow-inner">
                      <img 
                        src={signedUrl} 
                        alt={previewResource?.name} 
                        className="max-w-full max-h-full object-contain shadow-xl rounded-lg" 
                      />
                    </div>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-white rounded-2xl gap-6">
                       <div className="h-24 w-24 rounded-3xl bg-slate-50 flex items-center justify-center border-2 border-dashed">
                          <FileBox className="h-12 w-12 text-slate-300" />
                       </div>
                       <div className="text-center space-y-2">
                          <p className="text-sm font-black uppercase text-slate-900">Preview Not Available</p>
                          <p className="text-xs text-slate-500 max-w-sm">This file format ({previewResource?.content_type}) cannot be previewed in the secure vault.</p>
                       </div>
                       <Button 
                         onClick={() => handleDownload(previewResource)}
                         className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl"
                       >
                         Download to View Local
                       </Button>
                    </div>
                  )}
                </div>
             )}
          </div>
        </DialogContent>
      </Dialog>

      <PinGate 
        open={pinGateOpen}
        onOpenChange={setPinGateOpen}
        pinHash={pinHash}
        onSuccess={() => {
           if (pendingAction) pendingAction();
           setPendingAction(null);
        }}
      />

      <Dialog open={uploadDialogOpen} onOpenChange={(open) => !isUploading && setUploadDialogOpen(open)}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-slate-900 p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Plus className="h-6 w-6 text-accent" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-black uppercase tracking-tight">New Resource</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs font-medium">Verify categorization before adding to vault.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Document Name</Label>
                 <Input 
                   disabled={isUploading}
                   value={resourceName} 
                   onChange={e => setResourceName(e.target.value)}
                   className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                   placeholder="e.g. Q1 Operations Report"
                 />
               </div>

               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Resource Category</Label>
                 <Select 
                   disabled={isUploading}
                   value={resourceCategory} 
                   onValueChange={setResourceCategory}
                 >
                   <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                     <SelectValue placeholder="Select Category" />
                   </SelectTrigger>
                   <SelectContent className="rounded-xl border-none shadow-xl">
                     {CATEGORIES.map(cat => (
                       <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase tracking-widest">{cat}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
            </div>

            {isUploading && (
               <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-accent">
                    <span>Uploading to Storage</span>
                    <span>{Math.round(uploadProgress)}%</span>
                 </div>
                 <Progress value={uploadProgress} className="h-2 bg-slate-100" />
               </div>
            )}

            <DialogFooter className="pt-2 sm:justify-start gap-2">
               <Button 
                 disabled={isUploading} 
                 onClick={handleStartUpload}
                 className="flex-1 h-12 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-slate-200"
               >
                 {isUploading ? "Processing..." : "Complete Upload"}
               </Button>
               <Button 
                 variant="ghost" 
                 disabled={isUploading} 
                 onClick={() => setUploadDialogOpen(false)}
                 className="h-12 px-6 font-black uppercase text-[10px] tracking-widest"
               >
                 Cancel
               </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
