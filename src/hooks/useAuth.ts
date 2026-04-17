import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";

export type UserRole = "Admin" | "Leads" | "Sales" | "Operations" | "Finance";

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuthData = async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .eq("id", userId)
        .single();
      
      setUser(profile);

      // 2. Process Roles
      const normalizeRole = (r: string) => (r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()) as UserRole;
      
      if (profile?.user_roles && profile.user_roles.length > 0) {
        setRoles(profile.user_roles.map((r: any) => normalizeRole(r.role)));
      } else if (profile?.role) {
        setRoles([normalizeRole(profile.role)]);
      }
    } catch (error) {
      console.error("Error fetching auth data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchAuthData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchAuthData(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setRoles([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: UserRole | UserRole[]) => {
    if (Array.isArray(role)) {
      return role.some(r => roles.includes(r));
    }
    return roles.includes(role);
  };

  const isAdmin = roles.includes("Admin");
  const isOperations = roles.includes("Operations");
  const isSales = roles.includes("Sales");
  const isLeads = roles.includes("Leads");
  const isFinance = roles.includes("Finance");

  const passwordAgeDays = user?.password_updated_at 
    ? Math.floor((new Date().getTime() - new Date(user.password_updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const isUsingDefaultPassword = user?.is_using_default_password ?? false;
  const mustChangePassword = passwordAgeDays > 7 || isUsingDefaultPassword;
  const shouldShowPasswordReminder = (passwordAgeDays > 0 && passwordAgeDays <= 7) && !isUsingDefaultPassword;

  return { 
    user, 
    roles, 
    loading, 
    hasRole, 
    isAdmin, 
    isOperations, 
    isSales, 
    isLeads,
    isFinance,
    passwordAgeDays,
    isUsingDefaultPassword,
    mustChangePassword,
    shouldShowPasswordReminder
  };
}
