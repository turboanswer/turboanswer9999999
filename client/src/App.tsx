import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { Loader2 } from "lucide-react";
import Chat from "@/pages/chat";
import AISettings from "@/pages/ai-settings";
import Subscribe from "@/pages/subscribe";
import NotFound from "@/pages/not-found";
import Pricing from "@/pages/pricing";
import Support from "@/pages/support";
import EmployeeDashboard from "@/pages/employee-dashboard";
import PrivacyPolicy from "@/pages/privacy-policy";
import Business from "@/pages/business";
import Integration from "@/pages/integration";
import Simple from "@/pages/simple";
import WhereToAdd from "@/pages/where-to-add";
import WidgetDemo from "@/pages/widget-demo";
import LandingPage from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import CrisisSupport from "@/pages/crisis-support";
import CrisisInfo from "@/pages/crisis-info";
import EmailTemplates from "@/pages/email-templates";
import ForgotPassword from "@/pages/forgot-password";
import ImageStudio from "@/pages/image-studio";
import VideoStudio from "@/pages/video-studio";
import CodeStudio from "@/pages/code-studio";
import BetaApply from "@/pages/beta-apply";
import LockdownScreen from "@/components/lockdown-screen";
import { primeAudioContext } from "@/lib/audio-manager";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/home" component={LandingPage} />
      <Route path="/chat" component={Chat} />
      <Route path="/ai-settings" component={AISettings} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/support" component={Support} />
      <Route path="/employee/dashboard" component={EmployeeDashboard} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/business" component={Business} />
      <Route path="/integration" component={Integration} />
      <Route path="/simple" component={Simple} />
      <Route path="/where-to-add" component={WhereToAdd} />
      <Route path="/widget-demo" component={WidgetDemo} />
      <Route path="/crisis-support" component={CrisisSupport} />
      <Route path="/crisis-info" component={CrisisInfo} />
      <Route path="/email-templates" component={EmailTemplates} />
      <Route path="/image-studio" component={ImageStudio} />
      <Route path="/video-studio" component={VideoStudio} />
      <Route path="/code-studio" component={CodeStudio} />
      <Route path="/beta" component={BetaApply} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/support" component={Support} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/business" component={Business} />
      <Route path="/widget-demo" component={WidgetDemo} />
      <Route path="/crisis-info" component={CrisisInfo} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/image-studio" component={ImageStudio} />
      <Route path="/beta" component={BetaApply} />
      <Route component={LandingPage} />
    </Switch>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    const unlock = () => primeAudioContext();
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const { data: lockdownStatus } = useQuery<{ active: boolean; scenario?: string; restoredAt?: string }>({
    queryKey: ['/api/system/lockdown-status'],
    refetchInterval: 15000,
    staleTime: 0,
  });

  const [showRestored, setShowRestored] = useState(false);
  const prevLockdownRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevLockdownRef.current === true && lockdownStatus?.active === false) {
      setShowRestored(true);
      const t = setTimeout(() => setShowRestored(false), 20000);
      return () => clearTimeout(t);
    }
    if (lockdownStatus !== undefined) {
      prevLockdownRef.current = lockdownStatus.active;
    }
  }, [lockdownStatus?.active]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isAdminPanel = location.startsWith('/employee');
  const showLockdown = lockdownStatus?.active && !isAdminPanel;

  return (
    <>
      {showLockdown && <LockdownScreen scenario={lockdownStatus?.scenario || 'system_failure'} />}
      {showRestored && !isAdminPanel && (
        <div
          className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center px-4 py-3"
          style={{ background: 'linear-gradient(135deg, #052e16, #14532d)', borderBottom: '1px solid #166534' }}
        >
          <div className="flex items-center gap-3 text-center">
            <span style={{ color: '#4ade80', fontSize: '1.1rem' }}>✓</span>
            <p style={{ color: '#bbf7d0', fontSize: '0.9rem', margin: 0 }}>
              We apologize for any inconvenience. TurboAnswer is back online — you may now continue as usual. Thank you and have a good one!
            </p>
            <button onClick={() => setShowRestored(false)} style={{ color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginLeft: '0.5rem' }}>✕</button>
          </div>
        </div>
      )}
      {isAuthenticated ? <AuthenticatedRouter /> : <UnauthenticatedRouter />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
