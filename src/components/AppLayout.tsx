import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, DollarSign, Truck, MapPin,
  CreditCard, FolderOpen, Settings, Building2, UserCog, Bell,
  ClipboardList, Receipt, Menu, X
} from "lucide-react";
import ozmaeLogoImg from "@/assets/ozmae-logo.png";
import { useState } from "react";

const navSections = [
  {
    label: "OVERVIEW",
    items: [
      { title: "Dashboard", path: "/", icon: LayoutDashboard },
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
      { title: "Company Profile", path: "/settings/company", icon: Building2 },
      { title: "Users & Roles", path: "/settings/users", icon: UserCog },
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
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <aside className="relative w-60 h-full">
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
            <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
            </button>
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              AM
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
