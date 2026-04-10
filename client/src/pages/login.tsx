import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

        try {
          const pending = localStorage.getItem("turbo_pending_subscription");
          if (pending) {
            const pendingData = JSON.parse(pending);
            if (Date.now() - pendingData.timestamp < 30 * 60 * 1000) {
              const syncRes = await fetch("/api/sync-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expectedTier: pendingData.tier, subscriptionId: pendingData.subscriptionId }),
                credentials: "include",
              });
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                if (syncData.tier) {
                  localStorage.removeItem("turbo_pending_subscription");
                  queryClient.invalidateQueries({ queryKey: ["/api/models"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/enterprise-code"] });
                  toast({ title: "Subscription Activated!", description: `Your ${syncData.tier} plan is now active.` });
                }
              }
            } else {
              localStorage.removeItem("turbo_pending_subscription");
            }
          }
        } catch {}

        toast({ title: "Welcome back!", description: "You're now signed in to Turbo Answer." });
        const redirectParam = new URLSearchParams(window.location.search).get('redirect');
        setLocation(redirectParam || "/chat");
      } else {
        toast({ title: "Error", description: data.message || "Invalid credentials", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Login failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131314] text-white flex items-center justify-center px-4">
      <style>{`
        @keyframes gemini-fade-up { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="w-full max-w-[400px]" style={{ animation: 'gemini-fade-up 0.5s ease-out forwards' }}>
        <div className="flex flex-col items-center mb-8">
          <img src={turboLogo} alt="TurboAnswer" className="w-12 h-12 rounded-2xl object-cover mb-5" />
          <h1 className="text-2xl font-normal text-white mb-1">Sign in</h1>
          <p className="text-sm text-[#8e918f]">to continue to TurboAnswer</p>
        </div>

        <div className="rounded-2xl border border-[#3c4043] bg-[#1e1f20] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                className="bg-transparent border-[#3c4043] text-white placeholder-[#8e918f] rounded-lg h-12 text-sm focus:border-[#8ab4f8] focus:ring-0 focus:ring-offset-0 transition-colors"
              />
            </div>

            <div>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                className="bg-transparent border-[#3c4043] text-white placeholder-[#8e918f] rounded-lg h-12 text-sm focus:border-[#8ab4f8] focus:ring-0 focus:ring-offset-0 transition-colors"
              />
            </div>

            <div className="text-left">
              <Link href="/forgot-password" className="text-sm text-[#8ab4f8] hover:text-[#aecbfa] transition-colors">
                Forgot password?
              </Link>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link href="/register" className="text-sm text-[#8ab4f8] hover:text-[#aecbfa] font-medium transition-colors">
                Create account
              </Link>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-10 px-6 rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Signing in</span>
                ) : (
                  <span className="flex items-center gap-1.5">Next <ArrowRight className="h-3.5 w-3.5" /></span>
                )}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-[#8e918f]">
          <Link href="/privacy-policy" className="hover:text-[#aecbfa] transition-colors">Privacy</Link>
          <span>·</span>
          <Link href="/terms-conditions" className="hover:text-[#aecbfa] transition-colors">Terms</Link>
          <span>·</span>
          <Link href="/support" className="hover:text-[#aecbfa] transition-colors">Help</Link>
        </div>
      </div>
    </div>
  );
}
