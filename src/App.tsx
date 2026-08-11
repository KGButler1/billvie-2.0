import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { MilestoneToastHost } from "@/components/MilestoneToast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
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
import AcceptInvite from "./pages/AcceptInvite";
import ResetPassword from "./pages/ResetPassword";
import DemoRoute from "./demo/DemoRoute";
import RecentlyDeleted from "./pages/RecentlyDeleted";
import KeyPeople from "./pages/KeyPeople";
import Readiness from "./pages/Readiness";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import UpgradeSuccess from "./pages/UpgradeSuccess";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalSearch from "./components/search/GlobalSearch";

import { useEffect } from "react";
import { UserService } from "./services/UserService";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { PlanProvider } from "./hooks/usePlan";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

// Root route: if already signed in, go straight to the dashboard instead of
// showing the landing page every visit.
const RootRoute = () => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (session) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
};

const App = () => {
  useEffect(() => {
    UserService.initializeTheme();
  }, []);

  return (
    <AuthProvider>
      <PlanProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <MilestoneToastHost />
          <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
              <Route path="/events/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
              <Route path="/events/compare" element={<ProtectedRoute><EventComparison /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
              <Route path="/financial" element={<ProtectedRoute><FinancialInfo /></ProtectedRoute>} />
              <Route path="/tax-documents" element={<ProtectedRoute><TaxDocuments /></ProtectedRoute>} />
              <Route path="/accountant" element={<ProtectedRoute><AccountantPortal /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/people" element={<ProtectedRoute><People /></ProtectedRoute>} />
              <Route path="/advisor" element={<Navigate to="/people" replace />} />
              <Route path="/export/summary" element={<ProtectedRoute><HouseholdSummary /></ProtectedRoute>} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/upgrade/success" element={<ProtectedRoute><UpgradeSuccess /></ProtectedRoute>} />
              <Route path="/demo" element={<DemoRoute><Navigate to="/demo/dashboard" replace /></DemoRoute>} />
              <Route path="/demo/dashboard" element={<DemoRoute><Dashboard /></DemoRoute>} />
              <Route path="/demo/bills" element={<DemoRoute><Bills /></DemoRoute>} />
              <Route path="/demo/documents" element={<DemoRoute><Documents /></DemoRoute>} />
              <Route path="/demo/people" element={<DemoRoute><People /></DemoRoute>} />
              <Route path="/demo/financial" element={<DemoRoute><FinancialInfo /></DemoRoute>} />
              <Route path="/recently-deleted" element={<ProtectedRoute><RecentlyDeleted /></ProtectedRoute>} />
              <Route path="/key-people" element={<ProtectedRoute><KeyPeople /></ProtectedRoute>} />
              <Route path="/readiness" element={<ProtectedRoute><Readiness /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/cookies" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
            <GlobalSearch />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
      </PlanProvider>
    </AuthProvider>
  );
};

export default App;
