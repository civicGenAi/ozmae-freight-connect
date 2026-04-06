import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
   User, Shield, Laptop, Building2, KeyRound,
   CheckCircle2, AlertCircle, LogOut, Clock,
   Globe, Mail, Phone, MapPin, Save, X, Edit2, Copy, ChevronDown,
   Lock, ShieldCheck, ShieldAlert
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { FileUpload } from "@/components/FileUpload";
import { CompanyResources } from "@/components/CompanyResources";
import { PinGate } from "@/components/PinGate";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

export default function MyAccount() {
   const [activeTab, setActiveTab] = useState("profile");
   const queryClient = useQueryClient();

   // Profile Query
   const { data: profile } = useQuery({
      queryKey: ["my_profile"],
      queryFn: async () => {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) throw new Error("No user");
         const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
         return data;
      }
   });

   // Company Query
   const { data: company } = useQuery({
      queryKey: ["company_profile"],
      queryFn: async () => {
         const { data } = await supabase.from("company_profile").select("*").maybeSingle();
         return data;
      }
   });

   // Security Logs Query
   const { data: securityLogs } = useQuery({
      queryKey: ["security_logs"],
      queryFn: async () => {
         const { data } = await supabase.from("security_logs").select("*").order("created_at", { ascending: false }).limit(10);
         return data;
      }
   });

   return (
      <div className="space-y-6">
         <PageHeader title="Management & Security" />

         <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 h-12 bg-muted/50 p-1 rounded-xl">
               <TabsTrigger value="profile" className="rounded-lg font-bold uppercase text-[10px] tracking-widest gap-2">
                  <User className="h-3.5 w-3.5" /> Profile
               </TabsTrigger>
               <TabsTrigger value="security" className="rounded-lg font-bold uppercase text-[10px] tracking-widest gap-2">
                  <Shield className="h-3.5 w-3.5" /> Security
               </TabsTrigger>
               <TabsTrigger value="sessions" className="rounded-lg font-bold uppercase text-[10px] tracking-widest gap-2">
                  <Laptop className="h-3.5 w-3.5" /> Sessions
               </TabsTrigger>
               <TabsTrigger value="company" className="rounded-lg font-bold uppercase text-[10px] tracking-widest gap-2">
                  <Building2 className="h-3.5 w-3.5" /> Company
               </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <ProfileTab profile={profile} />
            </TabsContent>

            <TabsContent value="security" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <SecurityTab profile={profile} logs={securityLogs} />
            </TabsContent>

            <TabsContent value="sessions" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <SessionsTab />
            </TabsContent>

            <TabsContent value="company" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <CompanyTab company={company} profile={profile} />
            </TabsContent>
         </Tabs>
      </div>
   );
}

// --- TAB COMPONENTS ---

function ProfileTab({ profile }: { profile: any }) {
   const [fullName, setFullName] = useState(profile?.full_name || "");
   const [phone, setPhone] = useState(profile?.phone || "");
   const [address, setAddress] = useState(profile?.address || "");
   const [bio, setBio] = useState(profile?.bio || "");
   const [updating, setUpdating] = useState(false);

   useEffect(() => {
      if (profile) {
         setFullName(profile.full_name || "");
         setPhone(profile.phone || "");
         setAddress(profile.address || "");
         setBio(profile.bio || "");
      }
   }, [profile]);

   const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setUpdating(true);
      try {
         const { data: { user } } = await supabase.auth.getUser();
         const { error } = await supabase.from("profiles").update({
            full_name: fullName,
            phone: phone,
            address: address,
            bio: bio,
            updated_at: new Date().toISOString()
         }).eq("id", user?.id);
         if (error) throw error;
         toast.success("Profile updated");
      } catch (err: any) {
         toast.error(err.message);
      } finally {
         setUpdating(false);
      }
   };

   const onAvatarUpload = async (file: File, onProgress: (pct: number) => void) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`;

      const { error } = await supabase.storage.from('avatars').upload(fileName, file);
      onProgress(100);

      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      return publicUrl;
   };

   return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-1 space-y-6">
            <div className="bg-card rounded-2xl border p-6 text-center space-y-4">
               <FileUpload
                  onUpload={onAvatarUpload}
                  defaultValue={profile?.avatar_url}
                  label="Profile Avatar"
               />
               <div>
                  <h3 className="font-bold text-lg">{profile?.full_name}</h3>
                  <p className="text-[10px] font-black uppercase text-accent tracking-widest">{profile?.role}</p>
               </div>
            </div>
         </div>
         <div className="md:col-span-2">
            <form onSubmit={handleUpdate} className="bg-card rounded-2xl border p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
                     <Input value={fullName || ""} onChange={e => setFullName(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phone Number</Label>
                     <Input value={phone || ""} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Home Address</Label>
                     <Input value={address || ""} onChange={e => setAddress(e.target.value)} className="h-12 rounded-xl" placeholder="Full residential address" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email (Managed)</Label>
                     <Input value={profile?.email || ""} disabled className="h-12 rounded-xl bg-muted/50 font-medium" />
                  </div>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personal Bio</Label>
                  <Input value={bio || ""} onChange={e => setBio(e.target.value)} className="h-12 rounded-xl" placeholder="A short description about yourself" />
               </div>
               <Button disabled={updating} className="w-full md:w-auto h-12 px-8 bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase text-[10px] tracking-widest">
                  {updating ? "Saving..." : "Save Changes"}
               </Button>
            </form>
         </div>
      </div>
   );
}

function SecurityTab({ profile, logs }: { profile: any, logs: any[] }) {
   const [oldPassword, setOldPassword] = useState("");
   const [newPassword, setNewPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [strength, setStrength] = useState(0);
   const [mfaTotpUri, setMfaTotpUri] = useState<string | null>(null);
   const [mfaSecret, setMfaSecret] = useState<string | null>(null);
   const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
   const [verificationCode, setVerificationCode] = useState("");
   const [isEnrolling, setIsEnrolling] = useState(false);
   const [isDisabling, setIsDisabling] = useState(false);
   const [showDisableDialog, setShowDisableDialog] = useState(false);
   const [showManualKey, setShowManualKey] = useState(false);

   const [verifiedFactor, setVerifiedFactor] = useState<{ id: string } | null>(undefined as any);
   const [loadingFactors, setLoadingFactors] = useState(true);

   const loadFactors = async () => {
      setLoadingFactors(true);
      try {
         const { data } = await supabase.auth.mfa.listFactors();
         const found = data?.all?.find((f: any) => f.factor_type === 'totp' && f.status === 'verified') ?? null;
         setVerifiedFactor(found);
      } catch (_e) { setVerifiedFactor(null); }
      finally { setLoadingFactors(false); }
   };

   useEffect(() => { loadFactors(); }, []);

   useEffect(() => {
      let s = 0;
      if (newPassword.length >= 8) s += 25;
      if (/[A-Z]/.test(newPassword)) s += 25;
      if (/[0-9]/.test(newPassword)) s += 25;
      if (/[^A-Za-z0-9]/.test(newPassword)) s += 25;
      setStrength(s);
   }, [newPassword]);

   const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
         toast.error("Passwords do not match");
         return;
      }
      try {
         const { error } = await supabase.auth.updateUser({ password: newPassword });
         if (error) throw error;

         await supabase.from("security_logs").insert({
            event_type: "password_change",
            details: { method: "account_settings" }
         });

         toast.success("Password updated successfully");
         setOldPassword("");
         setNewPassword("");
         setConfirmPassword("");
      } catch (err: any) {
         toast.error(err.message);
      }
   };

   const startMfaEnrollment = async () => {
      try {
         setIsEnrolling(true);
         const { data: existing } = await supabase.auth.mfa.listFactors();
         for (const f of (existing?.all || [])) {
            if (f.factor_type === 'totp') {
               await supabase.auth.mfa.unenroll({ factorId: f.id });
            }
         }
         const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            issuer: 'Ozmae Freight',
            friendlyName: `ozmae-${Date.now()}`,
         });
         if (error) throw error;
         setMfaTotpUri(data.totp.uri);
         setMfaSecret(data.totp.secret);
         setMfaFactorId(data.id);
         setShowManualKey(false);
      } catch (err: any) {
         toast.error(err.message);
      } finally {
         setIsEnrolling(false);
      }
   };

   const disableMfa = async () => {
      if (!verifiedFactor) return;
      try {
         setIsDisabling(true);
         setShowDisableDialog(false);
         const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
         if (error) throw error;
         await supabase.from('profiles').update({ totp_enabled: false }).eq('id', profile.id);
         await supabase.from('security_logs').insert({ event_type: 'mfa_disabled', details: { factor_id: verifiedFactor.id } });
         toast.success('Two-factor authentication disabled.');
         await loadFactors();
      } catch (err: any) {
         toast.error(err.message);
      } finally {
         setIsDisabling(false);
      }
   };

   const verifyAndEnableMfa = async () => {
      if (!mfaFactorId) return;
      try {
         const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
         if (challengeError) throw challengeError;

         const { error: verifyError } = await supabase.auth.mfa.verify({
            factorId: mfaFactorId,
            challengeId: challengeData.id,
            code: verificationCode
         });
         if (verifyError) throw verifyError;

         await supabase.from("profiles").update({ totp_enabled: true }).eq("id", profile.id);

         await supabase.from("security_logs").insert({
            event_type: "mfa_enabled",
            details: { factor_id: mfaFactorId }
         });

         toast.success("Two-factor authentication is now active!");
         setMfaTotpUri(null);
         setMfaSecret(null);
         setMfaFactorId(null);
         setVerificationCode("");
         setShowManualKey(false);
         await loadFactors();
      } catch (err: any) {
         toast.error(err.message);
      }
   };

   return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="space-y-8">
            <form onSubmit={handlePasswordChange} className="bg-card rounded-2xl border p-8 space-y-6">
               <h3 className="font-black text-xs uppercase tracking-widest text-foreground flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-accent" /> Change Password
               </h3>
               <div className="space-y-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase">Current Password</Label>
                     <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase">New Password</Label>
                     <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="rounded-xl h-11" />
                     <div className="pt-1">
                        <Progress value={strength} className={cn("h-1.5 transition-all", strength === 100 ? "bg-emerald-500" : "bg-muted")} />
                        <p className={cn("text-[9px] font-bold mt-1 uppercase", strength === 100 ? "text-emerald-500" : "text-muted-foreground")}>
                           Strength: {strength < 50 ? "Weak" : strength < 100 ? "Medium" : "Strong (8+ Mix)"}
                        </p>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase">Confirm New Password</Label>
                     <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="rounded-xl h-11" />
                  </div>
               </div>
               <Button className="w-full h-11 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest">
                  Update Password
               </Button>
            </form>

            <div className="bg-card rounded-2xl border p-8 space-y-6">
               <h3 className="font-black text-xs uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" /> Two-Factor Authentication
               </h3>
               <p className="text-xs text-muted-foreground leading-relaxed">
                  Add an extra layer of security to your account using TOTP (Google Authenticator, Authy, etc).
               </p>

               {!mfaTotpUri ? (
                  loadingFactors ? (
                     <div className="h-16 bg-muted/30 rounded-xl animate-pulse" />
                  ) : verifiedFactor ? (
                     <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                           <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                           <div>
                              <p className="text-xs font-black uppercase text-emerald-800">2FA Active — Your account is protected</p>
                              <p className="text-[10px] text-emerald-600 mt-0.5">Authenticator app required on every sign-in</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <Button
                              onClick={startMfaEnrollment}
                              disabled={isEnrolling || isDisabling}
                              variant="outline"
                              className="flex-1 h-10 font-black uppercase text-[9px] tracking-widest"
                           >
                              {isEnrolling ? "Preparing..." : "Switch Authenticator App"}
                           </Button>
                           <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                              <AlertDialogTrigger asChild>
                                 <Button
                                    disabled={isDisabling || isEnrolling}
                                    variant="outline"
                                    className="flex-1 h-10 font-black uppercase text-[9px] tracking-widest text-rose-600 border-rose-200 hover:bg-rose-50"
                                 >
                                    {isDisabling ? "Disabling..." : "Disable 2FA"}
                                 </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
                                 <div className="bg-rose-50 border-b border-rose-100 p-6 flex flex-col items-center gap-3">
                                    <div className="h-14 w-14 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center justify-center">
                                       <Shield className="h-7 w-7 text-rose-500" />
                                    </div>
                                    <AlertDialogTitle className="text-center text-base font-black text-rose-900">Disable Two-Factor Authentication?</AlertDialogTitle>
                                 </div>
                                 <div className="p-6 space-y-5">
                                    <AlertDialogDescription className="text-sm text-center text-muted-foreground leading-relaxed">
                                       Your account will only be protected by your password.
                                       <span className="block mt-2 font-bold text-foreground text-xs">Anyone who obtains your password will have full access.</span>
                                    </AlertDialogDescription>
                                    <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                                       <AlertDialogAction
                                          onClick={disableMfa}
                                          className="w-full h-11 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl"
                                       >
                                          Yes, Remove Protection
                                       </AlertDialogAction>
                                       <AlertDialogCancel className="w-full h-11 font-black uppercase text-[10px] tracking-widest rounded-xl border-2">
                                          Keep 2FA Active
                                       </AlertDialogCancel>
                                    </AlertDialogFooter>
                                 </div>
                              </AlertDialogContent>
                           </AlertDialog>
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                           <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                           <div>
                              <p className="text-xs font-black uppercase text-amber-800">2FA Not Enabled</p>
                              <p className="text-[10px] text-amber-600 mt-0.5">Your account is protected by password only</p>
                           </div>
                        </div>
                        <Button
                           onClick={startMfaEnrollment}
                           disabled={isEnrolling}
                           className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[9px] tracking-widest"
                        >
                           {isEnrolling ? "Generating QR Code..." : "Enable Two-Factor Authentication →"}
                        </Button>
                     </div>
                  )
               ) : (
                  <div className="rounded-2xl border overflow-hidden animate-in fade-in zoom-in-95">
                     <div className="bg-white p-6 flex flex-col items-center gap-4 border-b">
                        <p className="text-xs font-bold text-slate-700 text-center">Scan with Google Authenticator, Authy, or any TOTP app</p>
                        <div className="p-3 bg-white rounded-xl shadow-md ring-1 ring-slate-200">
                           <QRCodeSVG
                              value={mfaTotpUri}
                              size={180}
                              bgColor="#ffffff"
                              fgColor="#0f172a"
                              level="M"
                              includeMargin={false}
                           />
                        </div>
                        <p className="text-[10px] text-slate-500 text-center">Point your authenticator app camera at this code</p>
                     </div>

                     <div className="bg-slate-50 p-4 space-y-2">
                        <button
                           type="button"
                           onClick={() => setShowManualKey(!showManualKey)}
                           className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase hover:text-foreground transition-colors w-full"
                        >
                           <ChevronDown className={cn("h-3 w-3 transition-transform", showManualKey && "rotate-180")} />
                           Can't scan? Enter key manually
                        </button>
                        {showManualKey && (
                           <div className="flex items-center gap-2 p-2 bg-white border rounded-lg">
                              <code className="text-xs font-mono flex-1 break-all text-slate-700 select-all">{mfaSecret}</code>
                              <button
                                 type="button"
                                 onClick={() => { navigator.clipboard.writeText(mfaSecret || ''); toast.success('Key copied!'); }}
                                 className="shrink-0 p-1.5 rounded hover:bg-slate-100"
                              >
                                 <Copy className="h-3.5 w-3.5 text-slate-500" />
                              </button>
                           </div>
                        )}
                     </div>

                     <div className="p-4 space-y-3 bg-white">
                        <Label className="text-[10px] font-black uppercase text-center block text-muted-foreground">Enter the 6-digit code from your app to confirm</Label>
                        <Input
                           value={verificationCode}
                           onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                           placeholder="000000"
                           className="text-center text-2xl tracking-[0.5em] font-black h-14 rounded-xl"
                           maxLength={6}
                           autoFocus
                        />
                        <div className="flex gap-2 pt-1">
                           <Button variant="ghost" onClick={() => { setMfaTotpUri(null); setMfaSecret(null); }} className="flex-1 text-[10px] font-black uppercase h-10">Cancel</Button>
                           <Button
                              onClick={verifyAndEnableMfa}
                              disabled={verificationCode.length !== 6}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase h-10"
                           >
                              Verify & Activate 2FA
                           </Button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                     <Clock className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                     <h3 className="text-sm font-bold">Security Audit Log</h3>
                     <p className="text-[10px] text-slate-500 uppercase font-black">Past 10 Activities</p>
                  </div>
               </div>
            </div>
            <div className="flex-1 space-y-4">
               {logs?.map((log: any) => (
                  <div key={log.id} className="group p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-start gap-4">
                     <div className="p-2 rounded-lg bg-white/5 group-hover:bg-accent/20 transition-colors">
                        <Shield className="h-3 w-3 text-accent" />
                     </div>
                     <div className="flex-1">
                        <p className="text-xs font-bold">
                           {log.event_type === 'login_success' ? 'Sign In Success' :
                            log.event_type === 'password_change' ? 'Password Updated' :
                            log.event_type === 'mfa_enabled' ? '2FA Activated' :
                            log.event_type.replace('_', ' ')}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 italic">
                           {log.event_type === 'login_success' ? `Authenticated via ${log.details?.method || 'Standard login'}` :
                            log.event_type === 'password_change' ? 'Changed from Settings' :
                            log.details?.details || log.details ? JSON.stringify(log.details) : 'Security update verified'}
                        </p>
                        <div className="flex justify-between items-center mt-3 text-[9px] text-slate-500 font-black uppercase tracking-tighter">
                           <span>{log.ip_address || "Unknown IP"}</span>
                           <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
}

function SessionsTab() {
   const { data: sessions, refetch } = useQuery({
      queryKey: ["active_sessions"],
      queryFn: async () => {
         const { data } = await supabase.from("user_sessions").select("*").order("last_active", { ascending: false });
         return data;
      }
   });

   const handleSignOutAll = async () => {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) toast.error(error.message);
      else {
         toast.success("Signed out from all other devices");
         refetch();
      }
   };

   return (
      <div className="max-w-3xl mx-auto space-y-8">
         <div className="bg-card rounded-2xl border p-8 space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="font-black text-xs uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-accent" /> Active Device Sessions
               </h3>
               <Button onClick={handleSignOutAll} variant="destructive" className="h-9 px-4 font-black uppercase text-[9px] tracking-widest">
                  <LogOut className="h-3 w-3 mr-2" /> Sign Out All Other Devices
               </Button>
            </div>
            <div className="space-y-4">
               {sessions && sessions.length > 0 ? sessions.map((sess: any) => (
                  <div key={sess.id} className={cn(
                     "flex items-center justify-between p-5 border rounded-2xl transition-all",
                     new Date().getTime() - new Date(sess.last_active).getTime() < 60000
                        ? "bg-accent/5 border-accent/20"
                        : "bg-muted/20 border-muted-foreground/10 grayscale opacity-60"
                  )}>
                     <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", sess.user_agent.includes('Mobi') ? "bg-blue-500/10 text-blue-500" : "bg-accent/10 text-accent")}>
                           {sess.user_agent.includes('Mobi') ? <Phone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                        </div>
                        <div>
                           <p className="text-sm font-black uppercase tracking-tighter">
                              {sess.user_agent.includes('Chrome') ? 'Chrome Browser' :
                               sess.user_agent.includes('Safari') ? 'Safari Browser' : 'Device Session'}
                              {new Date().getTime() - new Date(sess.last_active).getTime() < 60000 && <span className="ml-2 px-1.5 py-0.5 bg-accent text-accent-foreground text-[8px] rounded uppercase">Current</span>}
                           </p>
                           <p className="text-xs text-muted-foreground mt-1">IP: {sess.ip_address} • {sess.user_agent.split(')')[0].split('(')[1]}</p>
                        </div>
                     </div>
                     <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                        Active {new Date(sess.last_active).toLocaleTimeString()}
                     </div>
                  </div>
               )) : (
                  <p className="text-center text-xs text-muted-foreground italic py-8">No active sessions tracked.</p>
               )}
            </div>
         </div>
      </div>
   );
}

function CompanyTab({ company, profile }: { company: any, profile: any }) {
   const [editing, setEditing] = useState(false);
   const [isSettingPin, setIsSettingPin] = useState(false);
   const [newPin, setNewPin] = useState("");
   const [pinGateOpen, setPinGateOpen] = useState(false);
   const [pinGateAction, setPinGateAction] = useState<(() => void) | null>(null);
   const queryClient = useQueryClient();
   const isAdmin = profile?.role === "admin";

   const [formData, setFormData] = useState({
      company_name: "",
      tin: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      logo_url: "",
      ...company
   });

   useEffect(() => {
      if (company) {
         setFormData(prev => ({ ...prev, ...company }));
      }
   }, [company]);

   const handleSave = async () => {
      try {
         const { error } = await supabase.from("company_profile").upsert({
            id: company?.id || undefined,
            ...formData,
            updated_at: new Date().toISOString()
         });
         if (error) throw error;
         toast.success("Company profile saved");
         setEditing(false);
      } catch (err: any) {
         toast.error(err.message);
      }
   };

   const onLogoUpload = async (file: File, onProgress: (pct: number) => void) => {
      const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('company').upload(fileName, file);
      onProgress(100);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('company').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      return publicUrl;
   };

   return (
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
         <div className="bg-slate-900 border-b p-8 flex justify-between items-center text-white">
            <div className="flex items-center gap-5">
               <div className="h-20 w-32 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/20 relative group">
                  {formData.logo_url ? <img src={formData.logo_url} className="h-full w-full object-contain p-2" /> : <Building2 className="h-8 w-8 text-accent" />}
                  {editing && (
                     <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <Edit2 className="h-5 w-5 text-white" />
                        <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                           if (e.target.files?.[0]) {
                              const url = await onLogoUpload(e.target.files[0], () => { });
                              if (url) toast.success("Logo uploaded. Click Save to apply.");
                           }
                        }} />
                     </label>
                  )}
               </div>
               <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">{company?.company_name || "Ozmae Freight"}</h3>
                  <p className="text-xs font-bold text-slate-400">Enterprise Logistics Profile</p>
               </div>
            </div>
            {!editing ? (
               <Button onClick={() => setEditing(true)} className="bg-white/10 hover:bg-accent hover:text-accent-foreground text-white border-0 font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2">
                  <Edit2 className="h-4 w-4" /> Edit Profile
               </Button>
            ) : (
               <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditing(false)} className="text-white hover:text-white hover:bg-white/5 font-black uppercase text-[10px] tracking-widest px-4">Cancel</Button>
                  <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2">
                     <Save className="h-4 w-4" /> Save Changes
                  </Button>
               </div>
            )}
         </div>

         {isAdmin && (
            <div className="p-8 border-b bg-slate-50/50">
               <CompanyResources 
                 isAdmin={isAdmin} 
                 pinEnabled={company?.resource_pin_enabled} 
                 pinHash={company?.resource_pin_hash} 
               />
            </div>
         )}

         <div className="p-8">
            {editing ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase">Company Name</Label>
                        <Input value={formData.company_name || ""} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="h-11" />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase">Tax ID (TIN)</Label>
                        <Input value={formData.tin || ""} onChange={e => setFormData({ ...formData, tin: e.target.value })} className="h-11" />
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase">Email Address</Label>
                        <Input value={formData.email || ""} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-11" />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase">Phone Number</Label>
                        <Input value={formData.phone || ""} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="h-11" />
                     </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                     <Label className="text-[10px] font-black uppercase">Global Address</Label>
                     <Input value={formData.address || ""} onChange={e => setFormData({ ...formData, address: e.target.value })} className="h-11" />
                  </div>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl">
                  <div className="space-y-6">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b pb-1">Contact Metadata</h4>
                     <div className="space-y-4">
                        <div className="flex items-center gap-3">
                           <Mail className="h-4 w-4 text-accent" />
                           <div>
                              <p className="text-[9px] font-black uppercase text-muted-foreground leading-none">Email</p>
                              <p className="text-sm font-bold mt-1">{company?.email || 'Not configured'}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <Phone className="h-4 w-4 text-accent" />
                           <div>
                              <p className="text-[9px] font-black uppercase text-muted-foreground leading-none">Phone</p>
                              <p className="text-sm font-bold mt-1">{company?.phone || 'Not configured'}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <Globe className="h-4 w-4 text-accent" />
                           <div>
                              <p className="text-[9px] font-black uppercase text-muted-foreground leading-none">Website</p>
                              <p className="text-sm font-bold mt-1">{company?.website || 'Not configured'}</p>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-6 border border-dashed flex flex-col justify-between">
                     <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Tax Information</p>
                        <p className="text-2xl font-black">{company?.tin || "TIN-00XXX"}</p>
                     </div>
                     <div className="pt-4 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-accent px-2 py-0.5 bg-accent/10 rounded">VERIFIED</span>
                        <Shield className="h-4 w-4 text-emerald-500" />
                     </div>
                  </div>
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b pb-1">Primary Location</h4>
                     <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-accent mt-1" />
                        <p className="text-sm font-medium leading-relaxed">{company?.address || "Address not set."}</p>
                     </div>
                  </div>
               </div>
            )}
         </div>

         {isAdmin && (
            <div className="p-8 border-t space-y-8">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                        <Lock className="h-4 w-4 text-accent" /> Enhanced Resource Security
                     </h4>
                     <p className="text-[10px] text-muted-foreground font-medium">When enabled, a 4-digit security PIN is required to access sensitive resources even for admins.</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className={cn(
                        "h-10 px-4 rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                        company?.resource_pin_enabled ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-400"
                     )}>
                        {company?.resource_pin_enabled ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                        PIN Protection: {company?.resource_pin_enabled ? "ON" : "OFF"}
                     </div>
                     <Button 
                        onClick={async () => {
                           const toggle = async () => {
                              const { error } = await supabase.from("company_profile").update({ 
                                 resource_pin_enabled: !company?.resource_pin_enabled 
                              }).eq("id", company.id);
                              if (error) toast.error(error.message);
                              else {
                                 toast.success(`PIN protection ${!company?.resource_pin_enabled ? 'enabled' : 'disabled'}`);
                                 queryClient.invalidateQueries({ queryKey: ["company_profile"] });
                              }
                           };

                           if (company?.resource_pin_enabled) {
                              setPinGateAction(() => toggle);
                              setPinGateOpen(true);
                           } else {
                              if (!company?.resource_pin_hash) {
                                 // Force setup if enabling for the first time with no pin
                                 setIsSettingPin(true);
                                 toast.info("Please set an initial security PIN first.");
                                 // Find the setup section to scroll? For now toast is enough
                              } else {
                                 toggle();
                              }
                           }
                        }}
                        variant="outline" 
                        className="h-10 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-900 hover:text-white border-2"
                     >
                        {company?.resource_pin_enabled ? "Disable" : "Enable"}
                     </Button>
                  </div>
               </div>

               {company?.resource_pin_enabled && (
                  <div className="bg-white border-2 border-slate-100 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-2 duration-300">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                           <KeyRound className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                           <p className="text-xs font-black uppercase text-slate-900">Security PIN Configuration</p>
                           <p className="text-[10px] text-slate-500 font-medium">Updating this PIN will invalidate the old one immediately.</p>
                        </div>
                     </div>

                     {!isSettingPin ? (
                        <Button 
                           variant="secondary" 
                           onClick={() => {
                              if (company?.resource_pin_enabled && company?.resource_pin_hash) {
                                 setPinGateAction(() => () => setIsSettingPin(true));
                                 setPinGateOpen(true);
                              } else {
                                 setIsSettingPin(true);
                              }
                           }}
                           className="h-10 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl"
                        >
                           {company?.resource_pin_hash ? "Change PIN" : "Setup Initial PIN"}
                        </Button>
                     ) : (
                        <div className="flex items-center gap-2">
                           <Input 
                              type="password" 
                              placeholder="Enter 4 digits" 
                              value={newPin}
                              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0,4))}
                              maxLength={4}
                              className="w-32 h-10 text-center tracking-[0.3em] font-black"
                           />
                           <Button 
                              disabled={newPin.length !== 4}
                              onClick={async () => {
                                 const encoder = new TextEncoder();
                                 const data = encoder.encode(newPin);
                                 const hashBuffer = await crypto.subtle.digest("SHA-256", data);
                                 const hashArray = Array.from(new Uint8Array(hashBuffer));
                                 const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

                                 const { error } = await supabase.from("company_profile").update({ 
                                    resource_pin_hash: hash,
                                    resource_pin_enabled: true // Auto-enable when first PIN is set
                                 }).eq("id", company.id);

                                 if (error) toast.error(error.message);
                                 else {
                                    toast.success("Security PIN established and protection enabled!");
                                    setIsSettingPin(false);
                                    setNewPin("");
                                    queryClient.invalidateQueries({ queryKey: ["company_profile"] });
                                 }
                              }}
                              className="h-10 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest px-6 rounded-xl"
                           >
                              Confirm
                           </Button>
                           <Button variant="ghost" onClick={() => { setIsSettingPin(false); setNewPin(""); }} className="h-10 px-4 font-black uppercase text-[10px]">Cancel</Button>
                        </div>
                     )}
                  </div>
               )}
            </div>
         )}
         
         <PinGate 
           open={pinGateOpen}
           onOpenChange={setPinGateOpen}
           pinHash={company?.resource_pin_hash}
           onSuccess={() => {
              if (pinGateAction) pinGateAction();
              setPinGateAction(null);
           }}
         />
      </div>
   );
}
