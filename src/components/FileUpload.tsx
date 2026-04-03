import { useState, useRef } from "react";
import { Upload, X, File, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<string | null>;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  defaultValue?: string;
}

export function FileUpload({ onUpload, accept = "image/*", maxSizeMB = 5, label, defaultValue }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [preview, setPreview] = useState<string | null>(defaultValue || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      setStatus('error');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setStatus('uploading');
    setProgress(0);

    if (selectedFile.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(selectedFile));
    }

    try {
      const url = await onUpload(selectedFile, (pct) => setProgress(pct));
      if (url) {
        setStatus('success');
        setPreview(url);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
      setStatus('error');
    }
  };

  const clear = () => {
    setFile(null);
    setProgress(0);
    setStatus('idle');
    setPreview(defaultValue || null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>}
      
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-6 transition-all group flex flex-col items-center justify-center text-center gap-3",
          status === 'uploading' ? "border-accent bg-accent/5" : 
          status === 'error' ? "border-destructive/50 bg-destructive/5" :
          status === 'success' ? "border-emerald-500/50 bg-emerald-50/50" :
          "border-muted-foreground/20 hover:border-accent hover:bg-accent/5 cursor-pointer"
        )}
        onClick={() => status !== 'uploading' && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept={accept} 
          onChange={handleFileChange} 
        />

        {preview && (
          <div className="relative h-20 w-20 rounded-xl overflow-hidden border shadow-sm mb-2">
             <img src={preview} alt="Preview" className="h-full w-full object-cover" />
             {status === 'uploading' && (
               <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="h-6 w-6 border-2 border-white border-t-transparent animate-spin rounded-full" />
               </div>
             )}
          </div>
        )}

        {status === 'idle' && !preview && (
          <>
            <div className="p-3 bg-muted rounded-full group-hover:bg-accent/10 group-hover:text-accent transition-colors">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Select a file</p>
              <p className="text-[10px] text-muted-foreground uppercase mt-1">PNG, JPG, PDF up to {maxSizeMB}MB</p>
            </div>
          </>
        )}

        {status === 'uploading' && (
          <div className="w-full space-y-3 px-4">
             <p className="text-[10px] font-black uppercase text-accent animate-pulse tracking-widest">Uploading... {progress}%</p>
             <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-2">
             <CheckCircle2 className="h-8 w-8 text-emerald-500" />
             <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Upload Complete</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-2">
             <AlertCircle className="h-8 w-8 text-destructive" />
             <p className="text-xs font-bold text-destructive">{error}</p>
          </div>
        )}

        {status !== 'uploading' && (file || preview) && (
           <Button 
             variant="ghost" 
             size="icon" 
             className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/80 border shadow-sm hover:bg-destructive hover:text-white transition-colors"
             onClick={(e) => {
               e.stopPropagation();
               clear();
             }}
           >
             <X className="h-3 w-3" />
           </Button>
        )}
      </div>
    </div>
  );
}
