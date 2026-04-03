import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Building2, Mail, Phone, MapPin, Globe, Edit2, Save, X, Camera, ShieldCheck, Briefcase } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CompanyProfile() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    tin: "",
    vrn: "",
    business_license: "",
    representative_name: "",
    representative_phone: "",
    bio: "",
    logo_url: "",
  });

  useEffect(() => {
    fetchCompanyProfile();
  }, []);

  const fetchCompanyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("company_profile")
        .select("*")
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setLoading(false);
          return;
        }
        throw error;
      }

      if (data) {
        setProfile(data);
        setFormData({
          company_name: data.company_name || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          tin: data.tin || "",
          vrn: data.vrn || "",
          business_license: data.business_license || "",
          representative_name: data.representative_name || "",
          representative_phone: data.representative_phone || "",
          bio: data.bio || "",
          logo_url: data.logo_url || "",
        });
      }
    } catch (error: any) {
      toast.error("Failed to load company profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `company/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logistic-files')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logistic-files')
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: publicUrl });
      toast.success("Logo uploaded temporarily. Save to finalize.");
    } catch (error: any) {
      console.error("Logo upload failed:", error);
      if (error.message?.includes("Bucket not found")) {
        toast.error("Storage Bucket 'logistic-files' not found. Please apply the setup_logistics_storage migration in Supabase.");
      } else {
        toast.error("Logo upload failed. Please verify your connection.");
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("company_profile")
        .upsert({
          id: profile?.id || undefined,
          ...formData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success("Company profile synchronized");
      setEditing(false);
      fetchCompanyProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) return <div className="p-8 text-center animate-pulse">Synchronizing company data...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Corporate Identity">
        {!editing ? (
          <Button onClick={() => setEditing(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
            <Edit2 className="h-4 w-4" /> Modify Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-4 w-4 mr-1" /> Discard
            </Button>
            <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <Save className="h-4 w-4" /> Commit Changes
            </Button>
          </div>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic Info & Logo */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border p-8 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group cursor-pointer" onClick={() => editing && fileInputRef.current?.click()}>
                <div className="h-32 w-32 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/20 group-hover:border-accent/40 transition-all shadow-inner">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Company Logo" className="h-full w-full object-contain p-2" />
                  ) : (
                    <Building2 className="h-12 w-12 text-muted-foreground/40" />
                  )}
                  {editing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleLogoUpload} accept="image/*" />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                {editing ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Legal Entity Name</Label>
                      <Input value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="text-xl font-bold h-12" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Mission Statement / Bio</Label>
                      <Textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Describe your logistics capabilities..." className="resize-none h-20" />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase">{profile?.company_name || "Unset Legal Entity"}</h3>
                    <p className="text-sm text-muted-foreground italic max-w-lg">"{profile?.bio || 'Add a company bio to build trust with customers and partners.'}"</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-4 border-t">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Corporate Email</Label>
                    <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Hotline / Support</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Official Website</Label>
                    <Input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Physical HQ Address</Label>
                    <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                </>
              ) : (
                [
                  { icon: Mail, label: "Corporate Email", value: profile?.email },
                  { icon: Phone, label: "Hotline / Support", value: profile?.phone },
                  { icon: Globe, label: "Official Website", value: profile?.website },
                  { icon: MapPin, label: "Physical HQ Address", value: profile?.address },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/30 transition-all border border-transparent hover:border-muted">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shadow-sm">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">{item.label}</p>
                      <p className="text-sm font-bold text-foreground truncate max-w-[200px]">{item.value || "Not synchronized"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Compliance & Representation */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6">
             <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h4 className="font-black text-[11px] uppercase tracking-widest text-foreground">Compliance Metadata</h4>
             </div>
             
             <div className="space-y-4">
                {editing ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black tracking-widest">TIN Number</Label>
                      <Input value={formData.tin} onChange={e => setFormData({...formData, tin: e.target.value})} className="font-mono text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black tracking-widest">VRN Number</Label>
                      <Input value={formData.vrn} onChange={e => setFormData({...formData, vrn: e.target.value})} className="font-mono text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black tracking-widest">Business License #</Label>
                      <Input value={formData.business_license} onChange={e => setFormData({...formData, business_license: e.target.value})} className="font-mono text-xs" />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/20 rounded-lg border border-dashed flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-bold uppercase tracking-tighter">Tax ID (TIN)</span>
                      <span className="font-mono font-black text-foreground">{profile?.tin || "PENDING"}</span>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg border border-dashed flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-bold uppercase tracking-tighter">VAT Reg (VRN)</span>
                      <span className="font-mono font-black text-foreground">{profile?.vrn || "PENDING"}</span>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-lg border border-dashed flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-bold uppercase tracking-tighter">Business Lic.</span>
                      <span className="font-mono font-black text-foreground">{profile?.business_license || "PENDING"}</span>
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6">
             <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                <h4 className="font-black text-[11px] uppercase tracking-widest text-foreground">Authorized Representative</h4>
             </div>

             {editing ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-black tracking-widest">Full Name</Label>
                    <Input value={formData.representative_name} onChange={e => setFormData({...formData, representative_name: e.target.value})} className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-black tracking-widest">Direct Phone</Label>
                    <Input value={formData.representative_phone} onChange={e => setFormData({...formData, representative_phone: e.target.value})} className="text-xs" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-black text-[10px]">
                      {profile?.representative_name?.split(' ').map((n:any) => n[0]).join('') || "?"}
                    </div>
                    <div>
                       <p className="text-xs font-bold text-foreground leading-none">{profile?.representative_name || "Unassigned"}</p>
                       <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Managing Director</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground bg-muted/30 p-2 rounded border border-dashed text-center">
                    Call: {profile?.representative_phone || "Not Set"}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
