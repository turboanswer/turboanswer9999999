import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { Loader2 } from "lucide-react";
import Home from "@/pages/home";
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

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/home" component={Home} />
      <Route path="/chat" component={Chat} />
      <Route path="/" component={Chat} />
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
      <Route component={LandingPage} />
    </Switch>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedRouter /> : <UnauthenticatedRouter />;
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
