import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, UserX, UserCheck, Shield, Key, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Profile, UserRole } from "@/types";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function UsersRoles() {
  const queryClient = useQueryClient();
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<Profile | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<Profile | null>(null);
  const [editFormUserInfo, setEditFormUserInfo] = useState({ 
    full_name: "", 
    phone: "" 
  });
  const [newUserInfo, setNewUserInfo] = useState({ 
    username: "", 
    full_name: "", 
    roles: [] as UserRole[] 
  });
  const [isResetingPassword, setIsResetingPassword] = useState<string | null>(null);

  const normalizeRole = (r: string) => (r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()) as UserRole;

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_roles(role)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      return (data as any[]).map(u => ({
        ...u,
        roles: u.user_roles?.map((r: any) => normalizeRole(r.role)) || (u.role ? [normalizeRole(u.role)] : [])
      })) as Profile[];
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active, isAdmin }: { id: string; is_active: boolean; isAdmin?: boolean }) => {
      if (isAdmin) throw new Error("Cannot deactivate an Administrator account.");

      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { 
          action: 'TOGGLE_STATUS', 
          payload: { userId: id, is_active } 
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("User status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const syncRolesMutation = useMutation({
    mutationFn: async ({ userId, role, action, isTargetAdmin }: { userId: string, role: UserRole, action: 'add' | 'remove', isTargetAdmin?: boolean }) => {
      if (isTargetAdmin && role === 'Admin' && action === 'remove') {
        throw new Error("Administrative privileges cannot be revoked.");
      }

      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { 
          action: 'SYNC_ROLES', 
          payload: { userId, role, operation: action } 
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      
      if (selectedUserForRoles && selectedUserForRoles.id === variables.userId) {
        setSelectedUserForRoles(prev => {
          if (!prev) return null;
          const newRoles = variables.action === 'add' 
            ? [...(prev.roles || []), variables.role]
            : (prev.roles || []).filter(r => r !== variables.role);
          return { ...prev, roles: newRoles as UserRole[] };
        });
      }

      toast.success(`Role ${variables.action === 'add' ? 'assigned' : 'removed'} successfully`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error: invokeError } = await supabase.functions.invoke('manage-user', {
        body: { 
          action: 'CREATE_USER', 
          payload: { 
            email: `${newUserInfo.username.toLowerCase()}@ozmaelogistics.com`,
            full_name: newUserInfo.full_name,
            roles: newUserInfo.roles
          } 
        }
      });
      
      if (invokeError) {
        // Extract Edge Function error message from header or body
        const errorMsg = data?.error || invokeError.message || "Failed to create user";
        throw new Error(errorMsg);
      }
      
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      setIsAddUserOpen(false);
      setNewUserInfo({ username: "", full_name: "", roles: [] });
      toast.success("New user created successfully with default password: OzAME@2030#");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { 
          action: 'UPDATE_PASSWORD', 
          payload: { userId, newPassword: 'OzAME@2030#' } 
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Password reset to default: OzAME@2030#");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserForEdit) return;

      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { 
          action: 'UPDATE_USER', 
          payload: { 
            userId: selectedUserForEdit.id,
            full_name: editFormUserInfo.full_name,
            phone: editFormUserInfo.phone
          } 
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      setSelectedUserForEdit(null);
      toast.success("User profile updated successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || "??";
  };

  return (
    <div>
      <PageHeader title="Users & Roles">
        <Button 
          onClick={() => setIsAddUserOpen(true)}
          className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 h-11 px-6 uppercase font-black tracking-widest text-[10px] shadow-lg shadow-accent/20"
        >
          <Plus className="h-4 w-4" /> Add Team Member
        </Button>
      </PageHeader>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground animate-pulse">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : users?.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                        {getInitials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{u.full_name}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.roles?.map((role: string) => (
                          <Badge key={role} variant="secondary" className="text-[8px] px-1 h-3.5 uppercase tracking-tighter bg-primary/5 text-primary/60 border-none">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles?.map((role: string) => (
                      <div key={role} className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-[10px] font-bold">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        {role}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[10px] font-bold uppercase tracking-widest gap-1.5 hover:bg-accent/10 hover:text-accent"
                      onClick={() => {
                        setSelectedUserForEdit(u);
                        setEditFormUserInfo({ full_name: u.full_name, phone: u.phone || "" });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[10px] font-bold uppercase tracking-widest gap-1.5 hover:bg-accent/10 hover:text-accent"
                      onClick={() => resetPasswordMutation.mutate(u.id)}
                      disabled={resetPasswordMutation.isPending}
                    >
                      <Shield className="h-3.5 w-3.5" /> Reset Pass
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[10px] font-bold uppercase tracking-widest gap-1.5"
                      onClick={() => setSelectedUserForRoles(u)}
                    >
                      <Key className="h-3.5 w-3.5" /> Permissions
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={u.is_active ? "text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-[10px] font-bold uppercase tracking-widest" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 text-[10px] font-bold uppercase tracking-widest"}
                      disabled={u.roles?.includes('Admin') || toggleStatusMutation.isPending}
                      onClick={() => toggleStatusMutation.mutate({ id: u.id, is_active: !u.is_active, isAdmin: u.roles?.includes('Admin') })}
                    >
                      {u.is_active ? <UserX className="h-3.5 w-3.5 mr-1" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
                      {u.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedUserForRoles} onOpenChange={() => setSelectedUserForRoles(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Manage Permissions</SheetTitle>
            <SheetDescription>Assign or remove functional roles for {selectedUserForRoles?.full_name}.</SheetDescription>
          </SheetHeader>
          <div className="py-8 space-y-6">
            <div className="space-y-4">
               {(["Admin", "Leads", "Sales", "Operations"] as UserRole[]).map(role => {
                 const hasRole = selectedUserForRoles?.roles?.includes(role);
                 return (
                   <div key={role} className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3">
                         <div className={cn("p-2 rounded-lg", hasRole ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-muted/50")}>
                            <Shield className="h-4 w-4" />
                         </div>
                         <div>
                            <p className="text-sm font-bold">{role}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                               {role === 'Admin' ? 'Global System Control' : 
                                role === 'Leads' ? 'Inquiry & Front Desk' :
                                role === 'Sales' ? 'Pipeline & Quotations' : 'Fleet & Shipments'}
                            </p>
                         </div>
                      </div>
                      <Button
                        size="sm"
                        variant={hasRole ? "destructive" : "outline"}
                        className="h-8 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => syncRolesMutation.mutate({ 
                          userId: selectedUserForRoles!.id, 
                          role, 
                          action: hasRole ? 'remove' : 'add',
                          isTargetAdmin: selectedUserForRoles!.roles?.includes('Admin')
                        })}
                        disabled={syncRolesMutation.isPending || (role === 'Admin' && hasRole)}
                      >
                         {hasRole ? "Remove" : "Assign"}
                      </Button>
                   </div>
                 );
               })}
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSelectedUserForRoles(null)} className="w-full h-11 uppercase font-black tracking-widest text-[10px]">Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Add Team Member</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Create a new employee account with domain enforcement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
              <Input 
                placeholder="e.g. John Doe"
                value={newUserInfo.full_name}
                onChange={(e) => setNewUserInfo(prev => ({ ...prev, full_name: e.target.value }))}
                className="h-11 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Corporate Email</Label>
              <div className="flex items-center">
                <Input 
                  placeholder="username"
                  value={newUserInfo.username}
                  onChange={(e) => setNewUserInfo(prev => ({ ...prev, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, "") }))}
                  className="h-11 font-bold rounded-r-none border-r-0 focus-visible:ring-0"
                />
                <div className="h-11 px-4 flex items-center bg-muted border border-l-0 rounded-r-md text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  @ozmaelogistics.com
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Initial Roles</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["Leads", "Sales", "Operations"] as UserRole[]).map(role => (
                  <div key={role} className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border hover:border-primary/20 transition-all">
                    <Checkbox 
                      id={`new-role-${role}`} 
                      checked={newUserInfo.roles.includes(role)}
                      onCheckedChange={(checked) => {
                        setNewUserInfo(prev => ({
                          ...prev,
                          roles: checked 
                            ? [...prev.roles, role]
                            : prev.roles.filter(r => r !== role)
                        }))
                      }}
                    />
                    <label 
                      htmlFor={`new-role-${role}`}
                      className="text-[10px] font-bold uppercase cursor-pointer"
                    >
                      {role}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
               <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> Note on Security
               </p>
               <p className="text-[10px] text-emerald-700/80 leading-relaxed italic">
                  Default password will be set to <span className="font-black text-emerald-900 mx-1">OzAME@2030#</span>. The user should be advised to change this post-login.
               </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
               variant="outline" 
               onClick={() => setIsAddUserOpen(false)}
               className="h-11 px-6 uppercase font-black tracking-widest text-[10px]"
            >
               Cancel
            </Button>
            <Button 
              className="h-11 px-8 uppercase font-black tracking-widest text-[10px] bg-accent hover:bg-accent/90"
              onClick={() => createUserMutation.mutate()}
              disabled={createUserMutation.isPending || !newUserInfo.username || !newUserInfo.full_name}
            >
              {createUserMutation.isPending ? "Creating..." : "Confirm & Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedUserForEdit} onOpenChange={(open) => !open && setSelectedUserForEdit(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Team Member</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
              Update personal details for {selectedUserForEdit?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
              <Input 
                placeholder="e.g. John Doe"
                value={editFormUserInfo.full_name}
                onChange={(e) => setEditFormUserInfo(prev => ({ ...prev, full_name: e.target.value }))}
                className="h-11 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phone Number</Label>
              <Input 
                placeholder="+255..."
                value={editFormUserInfo.phone}
                onChange={(e) => setEditFormUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="h-11 font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
               variant="outline" 
               onClick={() => setSelectedUserForEdit(null)}
               className="h-11 px-6 uppercase font-black tracking-widest text-[10px]"
            >
               Cancel
            </Button>
            <Button 
              className="h-11 px-8 uppercase font-black tracking-widest text-[10px] bg-accent hover:bg-accent/90"
              onClick={() => updateUserMutation.mutate()}
              disabled={updateUserMutation.isPending || !editFormUserInfo.full_name}
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
