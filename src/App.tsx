import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Quotations from "@/pages/Quotations";
import RateCard from "@/pages/RateCard";
import JobOrders from "@/pages/JobOrders";
import Fleet from "@/pages/Fleet";
import Tracking from "@/pages/Tracking";
import Invoices from "@/pages/Invoices";
import Payments from "@/pages/Payments";
import Documents from "@/pages/Documents";
import CompanyProfile from "@/pages/CompanyProfile";
import UsersRoles from "@/pages/UsersRoles";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout><Dashboard /></AppLayout>} path="/" />
          <Route element={<AppLayout><Leads /></AppLayout>} path="/leads" />
          <Route element={<AppLayout><Quotations /></AppLayout>} path="/quotations" />
          <Route element={<AppLayout><RateCard /></AppLayout>} path="/rate-card" />
          <Route element={<AppLayout><JobOrders /></AppLayout>} path="/job-orders" />
          <Route element={<AppLayout><Fleet /></AppLayout>} path="/fleet" />
          <Route element={<AppLayout><Tracking /></AppLayout>} path="/tracking" />
          <Route element={<AppLayout><Invoices /></AppLayout>} path="/invoices" />
          <Route element={<AppLayout><Payments /></AppLayout>} path="/payments" />
          <Route element={<AppLayout><Documents /></AppLayout>} path="/documents" />
          <Route element={<AppLayout><CompanyProfile /></AppLayout>} path="/settings/company" />
          <Route element={<AppLayout><UsersRoles /></AppLayout>} path="/settings/users" />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
