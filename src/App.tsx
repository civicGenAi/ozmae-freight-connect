import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import AuthGuard from "@/components/AuthGuard";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Quotations from "@/pages/Quotations";
import RateCard from "@/pages/RateCard";
import JobOrders from "@/pages/JobOrders";
import Fleet from "@/pages/Fleet";
import Tracking from "@/pages/Tracking";
import Invoices from "@/pages/Invoices";
import Payments from "@/pages/Payments";
import JobCosting from "@/pages/JobCosting";
import StatusPage from "@/pages/StatusPage";
import SecurityLogs from "@/pages/SecurityLogs";
import { VaultGuard } from "@/components/VaultGuard";
import Documents from "@/pages/Documents";
import CompanyProfile from "@/pages/CompanyProfile";
import UsersRoles from "@/pages/UsersRoles";
import MyAccount from "@/pages/MyAccount";
import NotFound from "@/pages/NotFound";
import Verify2FA from "@/pages/Verify2FA";
import ResetPassword from "@/pages/ResetPassword";
import Reports from "@/pages/Reports";
import PublicTracking from "@/pages/PublicTracking";

import Customers from "@/pages/crm/Customers";
import CustomerProfile from "@/pages/crm/CustomerProfile";
import InteractionsLog from "@/pages/crm/InteractionsLog";
import Tasks from "@/pages/crm/Tasks";
import CustomerHealth from "@/pages/crm/CustomerHealth";
import LostDeals from "@/pages/crm/LostDeals";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache aggressively so we don't re-hit Supabase on every navigation.
      staleTime: 60 * 1000, // 1 min: data is considered fresh, no refetch
      gcTime: 30 * 60 * 1000, // keep cached data 30 min after unused
      refetchOnWindowFocus: false, // don't refetch just because the tab regained focus
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-2fa" element={
            <AuthGuard>
              <Verify2FA />
            </AuthGuard>
          } />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Reports /></AppLayout>
            </AuthGuard>
          } path="/reports" />

          <Route element={
            <AuthGuard>
              <AppLayout><StatusPage /></AppLayout>
            </AuthGuard>
          } path="/status" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Dashboard /></AppLayout>
            </AuthGuard>
          } path="/" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Customers /></AppLayout>
            </AuthGuard>
          } path="/crm/customers" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><CustomerProfile /></AppLayout>
            </AuthGuard>
          } path="/crm/customers/:id" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><InteractionsLog /></AppLayout>
            </AuthGuard>
          } path="/crm/interactions" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Tasks /></AppLayout>
            </AuthGuard>
          } path="/crm/tasks" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><CustomerHealth /></AppLayout>
            </AuthGuard>
          } path="/crm/health" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><LostDeals /></AppLayout>
            </AuthGuard>
          } path="/crm/lost-deals" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Leads /></AppLayout>
            </AuthGuard>
          } path="/leads" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Quotations /></AppLayout>
            </AuthGuard>
          } path="/quotations" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><RateCard /></AppLayout>
            </AuthGuard>
          } path="/rate-card" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><JobOrders /></AppLayout>
            </AuthGuard>
          } path="/job-orders" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Fleet /></AppLayout>
            </AuthGuard>
          } path="/fleet" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Tracking /></AppLayout>
            </AuthGuard>
          } path="/tracking" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Invoices /></AppLayout>
            </AuthGuard>
          } path="/invoices" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Payments /></AppLayout>
            </AuthGuard>
          } path="/payments" />

          <Route element={
            <AuthGuard>
              <AppLayout>
                <VaultGuard title="Job Costing Vault"><JobCosting /></VaultGuard>
              </AppLayout>
            </AuthGuard>
          } path="/job-costing" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><Documents /></AppLayout>
            </AuthGuard>
          } path="/documents" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><CompanyProfile /></AppLayout>
            </AuthGuard>
          } path="/settings/company" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><UsersRoles /></AppLayout>
            </AuthGuard>
          } path="/settings/users" />
          
          <Route element={
            <AuthGuard>
              <AppLayout><MyAccount /></AppLayout>
            </AuthGuard>
          } path="/settings/profile" />

          <Route element={
            <AuthGuard>
              <AppLayout><SecurityLogs /></AppLayout>
            </AuthGuard>
          } path="/settings/security-logs" />
          
          <Route path="/track" element={<PublicTracking />} />
          <Route path="/track/:code" element={<PublicTracking />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
