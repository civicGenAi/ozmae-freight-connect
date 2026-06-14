import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, DollarSign, Truck, MapPin,
  CreditCard, FolderOpen, Settings, Building2, UserCog, Bell,
  ClipboardList, Receipt, Menu, X, LogOut, AlertTriangle,
  Activity, Phone, CheckSquare, TrendingDown, ChevronDown, 
  ChevronRight, PanelLeft, PanelLeftClose, BarChart3, Calculator
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
import { LogisticsLoader } from "./LogisticsLoader";

import { useAuth, UserRole } from "@/hooks/useAuth";

interface NavItem {
  title: string;
  path: string;
  icon: any;
  roles?: UserRole[];
}

interface NavSection {
  label: string;
  items: NavItem[];
  roles?: UserRole[];
}

const navSections: NavSection[] = [
  {
    label: "OVERVIEW",
    items: [
      { title: "Dashboard", path: "/", icon: LayoutDashboard },
      { title: "Reports", path: "/reports", icon: BarChart3, roles: ["Admin", "Sales"] },
    ],
  },
  {
    label: "CRM & RELATIONSHIPS",
    roles: ["Admin", "Leads", "Sales", "Operations"],
    items: [
      { title: "Customers", path: "/crm/customers", icon: Users },
      { title: "Interactions", path: "/crm/interactions", icon: Phone },
      { title: "Tasks Queue", path: "/crm/tasks", icon: CheckSquare },
      { title: "Health Metrics", path: "/crm/health", icon: Activity, roles: ["Admin", "Sales"] },
      { title: "Lost Deals", path: "/crm/lost-deals", icon: TrendingDown, roles: ["Admin", "Sales"] },
    ],
  },
  {
    label: "SALES",
    roles: ["Admin", "Leads", "Sales", "Operations", "Finance"],
    items: [
      { title: "Leads", path: "/leads", icon: Users },
      { title: "Quotations", path: "/quotations", icon: FileText },
      { title: "Rate Card", path: "/rate-card", icon: DollarSign, roles: ["Admin", "Sales"] },
    ],
  },
  {
    label: "OPERATIONS",
    roles: ["Admin", "Operations", "Finance"],
    items: [
      { title: "Job Orders", path: "/job-orders", icon: ClipboardList },
      { title: "Fleet & Drivers", path: "/fleet", icon: Truck },
      { title: "Shipment Tracking", path: "/tracking", icon: MapPin },
    ],
  },
  {
    label: "FINANCE",
    roles: ["Admin", "Sales", "Finance"],
    items: [
      { title: "Invoices", path: "/invoices", icon: Receipt },
      { title: "Payments", path: "/payments", icon: CreditCard },
      { title: "Job Costing", path: "/job-costing", icon: Calculator, roles: ["Admin", "Finance"] },
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
    roles: ["Admin"],
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
  toggleGroup,
  roles
}: { 
  onClose?: () => void;
  isCollapsed: boolean;
  openGroups: string[];
  toggleGroup: (label: string) => void;
  roles: UserRole[];
}) {
  const location = useLocation();

  const filteredSections = navSections.filter(section => {
    // If section has role restrictions, check them
    if (section.roles && !section.roles.some(r => roles.includes(r))) {
      return false;
    }
    return true;
  }).map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.roles && !item.roles.some(r => roles.includes(r))) {
        return false;
      }
      return true;
    })
  })).filter(section => section.items.length > 0);

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
        {filteredSections.map((section) => {
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
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user: profile, roles, loading: authLoading, mustChangePassword, shouldShowPasswordReminder, isUsingDefaultPassword, passwordDaysRemaining } = useAuth();

  useEffect(() => {
    if (!authLoading && mustChangePassword && location.pathname !== "/reset-password") {
      navigate("/reset-password", { replace: true });
    }
  }, [authLoading, mustChangePassword, location.pathname, navigate]);
  
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

  const confirmLogout = async () => {
    setShowLogoutDialog(false);
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || "??";
  };

  // Find current page title
  const currentTitle = navSections
    .flatMap((s) => s.items)
    .find((i) => i.path === location.pathname)?.title || "Ozmae Freight";

  if (authLoading || isLoggingOut) {
    return <LogisticsLoader message={isLoggingOut ? "Securely Terminating Session..." : "Initializing Ozmae Systems..."} />;
  }

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
          roles={roles}
        />
      </motion.aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 h-full overflow-y-auto bg-primary">
            <SidebarNav onClose={() => setMobileOpen(false)} roles={roles} isCollapsed={false} openGroups={openGroups} toggleGroup={toggleGroup} />
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

        {/* Mandatory Password Update Banner */}
        {(shouldShowPasswordReminder || isUsingDefaultPassword) && location.pathname !== "/reset-password" && (
          <div className={cn(
            "px-6 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top duration-500 shadow-md",
            isUsingDefaultPassword ? "bg-rose-600 text-white" : "bg-amber-100 border-b border-amber-200"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("p-1.5 rounded-lg", isUsingDefaultPassword ? "bg-white/20" : "bg-amber-200")}>
                <AlertTriangle className={cn("h-4 w-4", isUsingDefaultPassword ? "text-white" : "text-amber-700")} />
              </div>
              <div className="space-y-0.5">
                <p className={cn("text-[10px] font-black uppercase tracking-[0.15em] leading-none", isUsingDefaultPassword ? "text-white" : "text-amber-800")}>
                  {isUsingDefaultPassword ? "MANDATORY SECURITY UPDATE" : "SECURITY RECOMMENDATION"}
                </p>
                <p className={cn("text-[9px] font-bold opacity-90", isUsingDefaultPassword ? "text-rose-100" : "text-amber-700")}>
                  {isUsingDefaultPassword
                    ? "You are currently using a default password. System access is restricted until updated."
                    : `Your password expires in ${passwordDaysRemaining} day${passwordDaysRemaining === 1 ? "" : "s"}. Update it to keep uninterrupted access.`}
                </p>
              </div>
            </div>
            <Link to="/reset-password">
              <button className={cn(
                "text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg",
                isUsingDefaultPassword ? "bg-white text-rose-600 hover:bg-rose-50" : "bg-amber-500 text-white hover:bg-amber-600"
              )}>
                Update Password
              </button>
            </Link>
          </div>
        )}

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
