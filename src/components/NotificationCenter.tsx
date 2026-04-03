import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  created_at: string;
}

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
  });

  useEffect(() => {
    if (notifications) {
      setUnreadCount(notifications.filter(n => !n.read).length);
    }
  }, [notifications]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications' 
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        toast.info(`New Notification: ${payload.new.title}`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
       const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
       if (error) throw error;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-rose-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-muted/50 rounded-full h-10 w-10">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-4 w-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden shadow-2xl border-muted/20">
        <div className="p-4 bg-primary text-primary-foreground flex justify-between items-center">
          <h3 className="font-black text-xs uppercase tracking-widest">Notifications</h3>
          {unreadCount > 0 && (
             <button onClick={() => markAllAsRead.mutate()} className="text-[9px] font-bold uppercase hover:underline opacity-80">
                Mark all as read
             </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground italic">Loading...</div>
          ) : notifications?.length === 0 ? (
            <div className="p-8 text-center space-y-3">
               <div className="h-12 w-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                  <Bell className="h-5 w-5 text-muted-foreground/50" />
               </div>
               <p className="text-xs text-muted-foreground font-medium">All caught up! No notifications yet.</p>
            </div>
          ) : (
            notifications?.map((n) => (
              <div 
                key={n.id} 
                className={cn(
                  "p-4 border-b border-muted/10 last:border-0 hover:bg-muted/5 transition-colors group",
                  !n.read && "bg-accent/5"
                )}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">{getTypeIcon(n.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className={cn("text-xs font-bold leading-none", !n.read ? "text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </p>
                      <button 
                        onClick={() => deleteNotification.mutate(n.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-500/10 rounded"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-rose-500" />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{n.message}</p>
                    <div className="flex justify-between items-center pt-2">
                       <span className="text-[9px] font-bold uppercase text-muted-foreground/60">{new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       {!n.read && (
                          <button 
                            onClick={() => markAsRead.mutate(n.id)}
                            className="text-[9px] font-black uppercase text-accent hover:underline flex items-center gap-1"
                          >
                             <Check className="h-2.5 w-2.5" /> Mark read
                          </button>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
