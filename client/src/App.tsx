import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StartupScreen } from "@/components/StartupScreen";
import Home from "@/pages/home";
import Chat from "@/pages/chat-simple";
import AISettings from "@/pages/ai-settings";
import TestSimple from "@/pages/test-simple";
import Subscribe from "@/pages/subscribe";
import EnhancedSubscribe from "@/pages/enhanced-subscribe";
import NotFound from "@/pages/not-found";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Pricing from "@/pages/pricing";
import Support from "@/pages/support";
import EmployeeLogin from "@/pages/employee-login";
import EmployeeDashboard from "@/pages/employee-dashboard";
import PrivacyPolicy from "@/pages/privacy-policy";
import Business from "@/pages/business";
import Integration from "@/pages/integration";
import Simple from "@/pages/simple";
import WhereToAdd from "@/pages/where-to-add";
import WidgetDemo from "@/pages/widget-demo";

function Router() {
  return (
    <Switch>
      <Route path="/home" component={Home} />
      <Route path="/chat" component={Chat} />
      <Route path="/" component={Chat} />
      <Route path="/ai-settings" component={AISettings} />
      <Route path="/test" component={TestSimple} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/support" component={Support} />
      <Route path="/employee/login" component={EmployeeLogin} />
      <Route path="/employee/dashboard" component={EmployeeDashboard} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/business" component={Business} />
      <Route path="/integration" component={Integration} />
      <Route path="/simple" component={Simple} />
      <Route path="/where-to-add" component={WhereToAdd} />
      <Route path="/widget-demo" component={WidgetDemo} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showStartup, setShowStartup] = useState(false); // Skip startup screen for faster loading

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {showStartup ? (
          <StartupScreen onComplete={() => setShowStartup(false)} />
        ) : (
          <Router />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
