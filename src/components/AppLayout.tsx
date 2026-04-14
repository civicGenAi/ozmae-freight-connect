import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, DollarSign, Truck, MapPin,
  CreditCard, FolderOpen, Settings, Building2, UserCog, Bell,
  ClipboardList, Receipt, Menu, X, LogOut, AlertTriangle,
  Activity, Phone, CheckSquare, TrendingDown, ChevronDown, 
  ChevronRight, PanelLeft, PanelLeftClose, BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ozmaeLogoImg from "@/assets/ozmae-logo.png";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/NotificationCenter";

const navSections = [
  {
    label: "OVERVIEW",
    items: [
      { title: "Dashboard", path: "/", icon: LayoutDashboard },
      { title: "Reports", path: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "CRM & RELATIONSHIPS",
    items: [
      { title: "Customers", path: "/crm/customers", icon: Users },
      { title: "Interactions", path: "/crm/interactions", icon: Phone },
      { title: "Tasks Queue", path: "/crm/tasks", icon: CheckSquare },
      { title: "Health Metrics", path: "/crm/health", icon: Activity },
      { title: "Lost Deals", path: "/crm/lost-deals", icon: TrendingDown },
    ],
  },
  {
    label: "SALES",
    items: [
      { title: "Leads", path: "/leads", icon: Users },
      { title: "Quotations", path: "/quotations", icon: FileText },
      { title: "Rate Card", path: "/rate-card", icon: DollarSign },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { title: "Job Orders", path: "/job-orders", icon: ClipboardList },
      { title: "Fleet & Drivers", path: "/fleet", icon: Truck },
      { title: "Shipment Tracking", path: "/tracking", icon: MapPin },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { title: "Invoices", path: "/invoices", icon: Receipt },
      { title: "Payments", path: "/payments", icon: CreditCard },
    ],
  },
  {
    label: "DOCUMENTS",
    items: [
      { title: "Document Vault", path: "/documents", icon: FolderOpen },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { title: "My Account", path: "/settings/profile", icon: UserCog },
      { title: "Users & Roles", path: "/settings/users", icon: Users },
    ],
  },
];

function SidebarNav({ 
  onClose, 
  isCollapsed, 
  openGroups, 
  toggleGroup 
}: { 
  onClose?: () => void;
  isCollapsed: boolean;
  openGroups: string[];
  toggleGroup: (label: string) => void;
}) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-primary text-primary-foreground/80 overflow-hidden">
      {/* Logo */}
      <div className={cn(
        "px-5 py-5 flex items-center border-b border-sidebar-border h-14 overflow-hidden shrink-0",
        isCollapsed ? "justify-center px-0" : "gap-2"
      )}>
        <motion.img 
          initial={false}
          animate={{ width: isCollapsed ? 28 : "auto", opacity: 1 }}
          src={ozmaeLogoImg} 
          alt="Ozmae" 
          className={cn("h-7 brightness-0 invert shrink-0", isCollapsed && "mx-auto")} 
        />
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-black text-white tracking-tighter text-lg"
          >
            OZMAE
          </motion.span>
        )}
        {onClose && (
          <button onClick={onClose} className="ml-auto md:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-4 custom-scrollbar">
        {navSections.map((section) => {
          const isOpen = openGroups.includes(section.label);
          const hasActiveItem = section.items.some(item => location.pathname === item.path);

          return (
            <div key={section.label} className="space-y-1">
              {!isCollapsed && (
                <button 
                  onClick={() => toggleGroup(section.label)}
                  className="w-full flex items-center justify-between px-3 mb-1 group"
                >
                  <p className="text-[10px] font-black tracking-widest text-primary-foreground/30 uppercase group-hover:text-primary-foreground/50 transition-colors">
                    {section.label}
                  </p>
                  <motion.div animate={{ rotate: isOpen ? 0 : -90 }}>
                    <ChevronDown className="h-3 w-3 text-primary-foreground/20" />
                  </motion.div>
                </button>
              )}

              <AnimatePresence initial={false}>
                {(isOpen || isCollapsed || section.label === "OVERVIEW") && (
                  <motion.div 
                    initial={isCollapsed ? { opacity: 1 } : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-0.5 overflow-hidden"
                  >
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      const content = (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-all duration-200 group relative",
                            isActive
                              ? "bg-accent text-accent-foreground font-bold shadow-lg shadow-accent/20"
                              : "hover:bg-white/5 text-primary-foreground/60 hover:text-white"
                          )}
                        >
                          <item.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive && "text-accent-foreground")} />
                          {!isCollapsed && (
                             <motion.span 
                               initial={{ opacity: 0, x: -10 }}
                               animate={{ opacity: 1, x: 0 }}
                               className="truncate"
                             >
                               {item.title}
                             </motion.span>
                          )}
                          {isCollapsed && isActive && (
                             <motion.div 
                               layoutId="active-indicator"
                               className="absolute left-[-12px] w-1 h-6 bg-accent rounded-r-full"
                             />
                          )}
                        </Link>
                      );

                      if (isCollapsed) {
                        return (
                          <Tooltip key={item.path} delayDuration={0}>
                            <TooltipTrigger asChild>
                              {content}
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-[#0f1d35] border-white/10 text-white font-bold text-[10px] uppercase tracking-widest">
                              {item.title}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      return content;
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
      
      {/* Settings Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/5 bg-black/10">
           <div className="flex items-center gap-3 px-3 py-2 text-[10px] font-black text-primary-foreground/40 uppercase tracking-widest">
              <Settings className="h-3 w-3" /> System Status: Online
           </div>
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  // Sidebar state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("ozmae_sidebar_collapsed");
    return saved === "true";
  });
  
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem("ozmae_sidebar_groups");
    return saved ? JSON.parse(saved) : ["OVERVIEW", "CRM & RELATIONSHIPS", "OPERATIONS"];
  });

  const toggleGroup = (label: string) => {
    if (label === "OVERVIEW") return; // Keep overview always accessible
    setOpenGroups(prev => {
      const next = prev.includes(label) 
        ? prev.filter(l => l !== label) 
        : [...prev, label];
      localStorage.setItem("ozmae_sidebar_groups", JSON.stringify(next));
      return next;
    });
  };

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("ozmae_sidebar_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    const fetchProfile = async (u?: any) => {
      try {
        const user = u || (await supabase.auth.getUser()).data.user;
        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          setProfile(data);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    // The listener fires INITIAL_SESSION on mount in many cases, 
    // but we can also just rely on its first valid event to avoid parallel calls with AuthGuard.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        if (session?.user) {
          fetchProfile(session.user);
        }
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        navigate("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const confirmLogout = async () => {
    setShowLogoutDialog(false);
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || "??";
  };

  // Find current page title
  const currentTitle = navSections
    .flatMap((s) => s.items)
    .find((i) => i.path === location.pathname)?.title || "Ozmae Freight";

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 76 : 240 }}
        className="hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-primary z-40 transition-all duration-300 ease-in-out"
      >
        <SidebarNav 
          isCollapsed={isCollapsed} 
          openGroups={openGroups} 
          toggleGroup={toggleGroup} 
        />
      </motion.aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 h-full overflow-y-auto bg-primary">
            <SidebarNav onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 hover:bg-muted rounded-xl transition-colors">
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            
            <button 
              onClick={toggleCollapse} 
              className="hidden md:flex p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
            >
              {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>

            <div className="h-6 w-px bg-border mx-1 hidden md:block" />
            
            <motion.h2 
              key={currentTitle}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-black text-xs uppercase tracking-widest text-foreground"
            >
              {currentTitle}
            </motion.h2>
          </div>
          <div className="flex items-center gap-3">
             <NotificationCenter />
             <div className="h-6 w-[1px] bg-border/40 mx-1 hidden md:block" />
            
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <Avatar className="h-8 w-8 cursor-pointer ring-offset-2 ring-accent/20 hover:ring-2 transition-all">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {profile ? getInitials(profile.full_name) : "??"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate max-w-[200px]">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
                  <UserCog className="mr-2 h-4 w-4" />
                  <span>My Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F8F9FA]">
          {children}
        </main>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">Sign out of Ozmae?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              You will need to re-authenticate to access your secure logistics dashboard again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-10 px-4">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmLogout} 
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2 h-10 px-6 font-semibold transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
