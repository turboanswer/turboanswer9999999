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
import CustomerSupport from "@/pages/customer-support";
import EmployeeDashboard from "@/pages/employee-dashboard";
import ReceptionistDashboard from "@/pages/receptionist-dashboard";
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
import CodeCustomizer from "@/pages/code-customizer";
import DevTools from "@/pages/devtools";
import { WebOnlyGate } from "@/components/WebOnlyGate";

import NotificationPopup from "@/components/NotificationPopup";
import DataDeletion from "@/pages/data-deletion";
import TermsConditions from "@/pages/terms-conditions";
import MobileWelcome from "@/pages/mobile-welcome";
import TrialChat from "@/pages/trial-chat";
import { primeAudioContext } from "@/lib/audio-manager";
import { useIsMobile } from "@/hooks/use-mobile";

const isNativeMobile = !!(window as any).Capacitor?.isNativePlatform?.();

/* On native (Android AAB), AI features are gated behind WebOnlyGate so the
 * Play Store build ships as a marketing + subscription manager, while every
 * AI feature points users to the full web experience. Account, billing,
 * pricing, support, and legal pages remain fully usable inside the app. */
const gate = (name: string, Page: React.ComponentType<any>) =>
  function GatedPage() {
    return (
      <WebOnlyGate featureName={name}>
        <Page />
      </WebOnlyGate>
    );
  };

// AI Chat + AI Settings are intentionally NOT gated on native: the Play
// compliance issue was only a broken account-deletion URL, not AI features.
const ChatGated = Chat;
const AISettingsGated = AISettings;
const CrisisSupportGated = gate("Crisis Support", CrisisSupport);
const ImageStudioGated = gate("Image Studio", ImageStudio);
const PhotoEditorGated = gate("Photo Editor", PhotoEditor);
const MediaEditorGated = gate("Media Editor", MediaEditor);
const VideoStudioGated = gate("Video Studio", VideoStudio);
const WorkgroupsGated = gate("Workgroups", Workgroups);
const CollabRoomsGated = gate("Collab Rooms", CollabRooms);
const StackTraceGated = gate("Stack Trace Surgeon", StackTraceSurgeon);
const CodeCustomizerGated = gate("Code Customizer", CodeCustomizer);
const TrialChatGated = gate("Trial Chat", TrialChat);

function AuthenticatedRouter() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const isReceptionist = !!(user as any)?.isReceptionist && !(user as any)?.isEmployee;
  const isEmployee = !!(user as any)?.isEmployee;

  useEffect(() => {
    // Land each role on its portal ONCE per tab session, then leave navigation alone.
    // Without the guard, owners/employees get bounced back to the dashboard every time
    // they open "/" or "/home", which traps them out of the main app.
    if (sessionStorage.getItem("rolePortalRedirected")) return;
    if (isReceptionist && ["/", "/home", "/chat"].includes(location)) {
      sessionStorage.setItem("rolePortalRedirected", "1");
      setLocation("/receptionist");
    } else if (isEmployee && ["/", "/home"].includes(location)) {
      sessionStorage.setItem("rolePortalRedirected", "1");
      setLocation("/employee/dashboard");
    }
  }, [isReceptionist, isEmployee, location, setLocation]);

  return (
    <Switch>
      <Route path="/" component={isNativeMobile ? ChatGated : LandingPage} />
      <Route path="/home" component={LandingPage} />
      <Route path="/chat" component={ChatGated} />
      <Route path="/ai-settings" component={AISettingsGated} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/support" component={Support} />
      <Route path="/customer-support" component={CustomerSupport} />
      <Route path="/employee/dashboard" component={EmployeeDashboard} />
      <Route path="/receptionist" component={ReceptionistDashboard} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-conditions" component={TermsConditions} />
      <Route path="/data-deletion" component={DataDeletion} />
      <Route path="/business" component={Business} />
      <Route path="/enterprise" component={Enterprise} />
      <Route path="/integration" component={Integration} />
      <Route path="/simple" component={Simple} />
      <Route path="/where-to-add" component={WhereToAdd} />
      <Route path="/widget-demo" component={WidgetDemo} />
      <Route path="/crisis-support" component={CrisisSupportGated} />
      <Route path="/crisis-info" component={CrisisInfo} />
      <Route path="/email-templates" component={EmailTemplates} />
      <Route path="/image-studio" component={ImageStudioGated} />
      <Route path="/photo-editor" component={PhotoEditorGated} />
      <Route path="/media-editor" component={MediaEditorGated} />
      <Route path="/video-studio" component={VideoStudioGated} />
      <Route path="/workgroups" component={WorkgroupsGated} />
      <Route path="/collab" component={CollabRoomsGated} />
      <Route path="/stack-trace-surgeon" component={CodeCustomizerGated} />
      <Route path="/code-customizer" component={CodeCustomizerGated} />
      <Route path="/code-surgeon" component={CodeCustomizerGated} />
      <Route path="/devtools" component={DevTools} />

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
  // Only show the 5-slide onboarding on a user's FIRST mobile launch.
  // Returning visitors land on the login page so they don't see the carousel
  // every single time they open the app.
  const hasSeenOnboarding = typeof window !== "undefined" && (() => {
    try { return localStorage.getItem("seen_onboarding") === "1"; } catch { return false; }
  })();
  const mobileRoot = (isNativeMobile || isRealMobileDevice)
    ? (hasSeenOnboarding ? Login : MobileWelcome)
    : LandingPage;
  return (
    <Switch>
      <Route path="/" component={mobileRoot} />
      <Route path="/welcome" component={MobileWelcome} />
      <Route path="/trial-chat" component={TrialChatGated} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/support" component={Support} />
      <Route path="/customer-support" component={CustomerSupport} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-conditions" component={TermsConditions} />
      <Route path="/data-deletion" component={DataDeletion} />
      <Route path="/business" component={Business} />
      <Route path="/enterprise" component={Enterprise} />
      <Route path="/widget-demo" component={WidgetDemo} />
      <Route path="/crisis-info" component={CrisisInfo} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/image-studio" component={ImageStudioGated} />
      <Route path="/devtools" component={DevTools} />
      <Route path="/workgroups">{() => {
        const inviteParam = new URLSearchParams(window.location.search).get('invite');
        if (inviteParam) {
          localStorage.setItem('turbo_pending_invite', inviteParam);
        }
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return null;
      }}</Route>
      <Route path="/beta" component={BetaApply} />
      <Route path="/code-surgeon">{() => {
        window.location.href = '/login?redirect=/code-customizer';
        return null;
      }}</Route>
      <Route path="/stack-trace-surgeon">{() => {
        // Research-only feature: bounce unauthenticated visitors to login
        // with a return path so they land back here after signing in.
        window.location.href = '/login?redirect=/code-customizer';
        return null;
      }}</Route>
      <Route path="/code-customizer">{() => {
        window.location.href = '/login?redirect=/code-customizer';
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
