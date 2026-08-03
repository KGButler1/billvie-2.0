import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Bills from "./pages/Bills";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import EventComparison from "./pages/EventComparison";
import Settings from "./pages/Settings";
import More from "./pages/More";
import FinancialInfo from "./pages/FinancialInfo";
import TaxDocuments from "./pages/TaxDocuments";
import AccountantPortal from "./pages/AccountantPortal";
import Documents from "./pages/Documents";
import People from "./pages/People";
import HouseholdSummary from "./pages/HouseholdSummary";
import SharedView from "./pages/SharedView";
import RecentlyDeleted from "./pages/RecentlyDeleted";
import KeyPeople from "./pages/KeyPeople";
import Readiness from "./pages/Readiness";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import GlobalSearch from "./components/search/GlobalSearch";

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
            <Route path="/bills" element={<Bills />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/events/compare" element={<EventComparison />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/more" element={<More />} />
            <Route path="/financial" element={<FinancialInfo />} />
            <Route path="/tax-documents" element={<TaxDocuments />} />
            <Route path="/accountant" element={<AccountantPortal />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/people" element={<People />} />
            <Route path="/advisor" element={<Navigate to="/people" replace />} />
            <Route path="/export/summary" element={<HouseholdSummary />} />
            <Route path="/shared/:token" element={<SharedView />} />
            <Route path="/recently-deleted" element={<RecentlyDeleted />} />
            <Route path="/key-people" element={<KeyPeople />} />
            <Route path="/readiness" element={<Readiness />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <GlobalSearch />
        </BrowserRouter>

      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
