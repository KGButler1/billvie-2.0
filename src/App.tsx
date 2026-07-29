import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import EventComparison from "./pages/EventComparison";
import Settings from "./pages/Settings";
import More from "./pages/More";
import FinancialInfo from "./pages/FinancialInfo";
import TaxDocuments from "./pages/TaxDocuments";
import AccountantPortal from "./pages/AccountantPortal";
import Documents from "./pages/Documents";
import AdvisorPortal from "./pages/AdvisorPortal";
import HouseholdSummary from "./pages/HouseholdSummary";
import SharedView from "./pages/SharedView";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { UserService } from "./services/UserService";

const queryClient = new QueryClient();

const App = () => {
  // Initialize theme on app load
  useEffect(() => {
    UserService.initializeTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bills" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/events/compare" element={<EventComparison />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/more" element={<More />} />
            <Route path="/financial" element={<FinancialInfo />} />
            <Route path="/tax-documents" element={<TaxDocuments />} />
            <Route path="/accountant" element={<AccountantPortal />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/advisor" element={<AdvisorPortal />} />
            <Route path="/export/summary" element={<HouseholdSummary />} />
            <Route path="/shared/:token" element={<SharedView />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
