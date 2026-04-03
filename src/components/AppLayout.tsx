import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, DollarSign, Truck, MapPin,
  CreditCard, FolderOpen, Settings, Building2, UserCog, Bell,
  ClipboardList, Receipt, Menu, X, LogOut, AlertTriangle,
  Activity, Phone, CheckSquare, TrendingDown
} from "lucide-react";
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

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-primary text-primary-foreground/80">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
        <img src={ozmaeLogoImg} alt="Ozmae" className="h-8 w-auto brightness-0 invert" />
        {onClose && (
          <button onClick={onClose} className="ml-auto md:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest text-primary-foreground/40 uppercase">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent text-primary-foreground/70 hover:text-primary-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    let isFetching = false;
    const fetchProfile = async (u?: any) => {
      if (isFetching) return;
      isFetching = true;
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
      } finally {
        isFetching = false;
      }
    };

    // Initial fetch
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        fetchProfile(session?.user);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
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
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border">
        <SidebarNav />
      </aside>

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
        <header className="h-14 bg-card border-b flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden">
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <h2 className="font-semibold text-foreground">{currentTitle}</h2>
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
