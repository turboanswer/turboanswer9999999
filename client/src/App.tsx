import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import Chat from "@/pages/chat";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";
import AISettings from "@/pages/ai-settings";
import Subscribe from "@/pages/subscribe";
import NotFound from "@/pages/not-found";
import Pricing from "@/pages/pricing";
import Support from "@/pages/support";
import EmployeeDashboard from "@/pages/employee-dashboard";
import PrivacyPolicy from "@/pages/privacy-policy";
import Business from "@/pages/business";
import Enterprise from "@/pages/enterprise";
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
import PhotoEditor from "@/pages/photo-editor";
import MediaEditor from "@/pages/media-editor";
import VideoStudio from "@/pages/video-studio";
import BetaApply from "@/pages/beta-apply";
import BetaFeedback from "@/pages/beta-feedback";
import Workgroups from "@/pages/workgroups";
import CollabRooms from "@/pages/collab-rooms";
import StackTraceSurgeon from "@/pages/stack-trace-surgeon";

import NotificationPopup from "@/components/NotificationPopup";
import DataDeletion from "@/pages/data-deletion";
import TermsConditions from "@/pages/terms-conditions";
import MobileWelcome from "@/pages/mobile-welcome";
import TrialChat from "@/pages/trial-chat";
import { primeAudioContext } from "@/lib/audio-manager";
import { useIsMobile } from "@/hooks/use-mobile";

const isNativeMobile = !!(window as any).Capacitor?.isNativePlatform?.();

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={isNativeMobile ? Chat : LandingPage} />
      <Route path="/home" component={LandingPage} />
      <Route path="/chat" component={Chat} />
      <Route path="/ai-settings" component={AISettings} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/support" component={Support} />
      <Route path="/employee/dashboard" component={EmployeeDashboard} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-conditions" component={TermsConditions} />
      <Route path="/data-deletion" component={DataDeletion} />
      <Route path="/business" component={Business} />
      <Route path="/enterprise" component={Enterprise} />
      <Route path="/integration" component={Integration} />
      <Route path="/simple" component={Simple} />
      <Route path="/where-to-add" component={WhereToAdd} />
      <Route path="/widget-demo" component={WidgetDemo} />
      <Route path="/crisis-support" component={CrisisSupport} />
      <Route path="/crisis-info" component={CrisisInfo} />
      <Route path="/email-templates" component={EmailTemplates} />
      <Route path="/image-studio" component={ImageStudio} />
      <Route path="/photo-editor" component={PhotoEditor} />
      <Route path="/media-editor" component={MediaEditor} />
      <Route path="/video-studio" component={VideoStudio} />
      <Route path="/workgroups" component={Workgroups} />
      <Route path="/collab" component={CollabRooms} />
      <Route path="/stack-trace-surgeon" component={StackTraceSurgeon} />

      <Route path="/beta" component={BetaApply} />
      <Route path="/beta-feedback" component={BetaFeedback} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedRouter() {
  const isMobileWeb = useIsMobile();
  const isRealMobileDevice = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return (
    <Switch>
      <Route path="/" component={(isNativeMobile || isRealMobileDevice) ? MobileWelcome : LandingPage} />
      <Route path="/trial-chat" component={TrialChat} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/support" component={Support} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-conditions" component={TermsConditions} />
      <Route path="/data-deletion" component={DataDeletion} />
      <Route path="/business" component={Business} />
      <Route path="/enterprise" component={Enterprise} />
      <Route path="/widget-demo" component={WidgetDemo} />
      <Route path="/crisis-info" component={CrisisInfo} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/image-studio" component={ImageStudio} />
      <Route path="/workgroups">{() => {
        const inviteParam = new URLSearchParams(window.location.search).get('invite');
        if (inviteParam) {
          localStorage.setItem('turbo_pending_invite', inviteParam);
        }
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return null;
      }}</Route>
      <Route path="/beta" component={BetaApply} />
      <Route path="/stack-trace-surgeon">{() => {
        // Research-only feature: bounce unauthenticated visitors to login
        // with a return path so they land back here after signing in.
        window.location.href = '/login?redirect=/stack-trace-surgeon';
        return null;
      }}</Route>
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] relative overflow-hidden">
        <style>{`
          @keyframes splash-fade-in { 0% { opacity: 0; transform: scale(0.92); } 100% { opacity: 1; transform: scale(1); } }
          @keyframes splash-text-fade { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
          @keyframes splash-dot-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
          @keyframes splash-ring { 0% { transform: scale(0.8); opacity: 0.6; } 100% { transform: scale(2.5); opacity: 0; } }
        `}</style>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', animation: 'splash-ring 2.5s ease-out infinite' }} />
        </div>
        <div className="flex flex-col items-center gap-5 relative z-10" style={{ animation: 'splash-fade-in 0.6s ease-out forwards' }}>
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', transform: 'scale(1.5)' }} />
            <img src={turboLogo} alt="TurboAnswer" className="w-16 h-16 rounded-2xl object-cover relative z-10" style={{ boxShadow: '0 0 30px rgba(99,102,241,0.15)' }} />
          </div>
          <div className="flex flex-col items-center gap-2" style={{ animation: 'splash-text-fade 0.6s ease-out 0.2s both' }}>
            <h1 className="text-xl font-semibold text-white tracking-tight">TurboAnswer</h1>
          </div>
          <div className="flex gap-1.5 mt-2" style={{ animation: 'splash-text-fade 0.6s ease-out 0.4s both' }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500" style={{ animation: `splash-dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
        <div className="absolute bottom-8 flex flex-col items-center gap-1" style={{ animation: 'splash-text-fade 0.8s ease-out 0.6s both' }}>
          <p className="text-[11px] text-zinc-600 tracking-wide">By TurboAnswer Inc.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated && <NotificationPopup />}
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
