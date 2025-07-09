import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StartupScreen } from "@/components/StartupScreen";
import Chat from "@/pages/chat-mobile";
import Subscribe from "@/pages/subscribe";
import EnhancedSubscribe from "@/pages/enhanced-subscribe";
import NotFound from "@/pages/not-found";
import Register from "@/pages/register";
import Login from "@/pages/login";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/pricing" component={EnhancedSubscribe} />
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
