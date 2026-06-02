import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight, Zap, ShieldCheck, Sparkles, Globe } from "lucide-react";
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
        const defaultRedirect = data.isReceptionist
          ? '/receptionist'
          : (data.isEmployee ? '/employee/dashboard' : '/chat');
        const safeRedirect = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
          ? redirectParam
          : defaultRedirect;
        // Login already lands the role on its portal, so suppress the one-time
        // AuthenticatedRouter redirect to avoid a bounce when navigating afterward.
        sessionStorage.setItem("rolePortalRedirected", "1");
        setLocation(safeRedirect);
      } else {
        toast({ title: "Couldn't sign in", description: data.message || data.error || "Please check your email and password and try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Login failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <style>{`
        @keyframes gemini-fade-up { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes welcome-glow { 0%,100% { opacity: 0.5; } 50% { opacity: 0.9; } }
      `}</style>

      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#8ab4f8]/10 blur-[120px]" style={{ animation: 'welcome-glow 8s ease-in-out infinite' }} />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" style={{ animation: 'welcome-glow 10s ease-in-out infinite' }} />
      </div>

      <div
        className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
        style={{ animation: 'gemini-fade-up 0.5s ease-out forwards' }}
      >
        {/* ── Welcome panel ── */}
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-7">
            <img src={turboLogo} alt="TurboAnswer" className="w-11 h-11 rounded-2xl object-cover" />
            <span className="text-lg font-semibold tracking-tight">TurboAnswer</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#8ab4f8]/30 bg-[#8ab4f8]/10 px-3.5 py-1.5 text-xs font-medium text-[#8ab4f8] mb-5">
            <Sparkles className="h-3.5 w-3.5" /> Welcome to TurboAnswer
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
            Answers at the<br className="hidden sm:block" /> speed of thought.
          </h1>
          <p className="text-[#9aa0a6] text-sm sm:text-base max-w-md mx-auto lg:mx-0 mb-8">
            Sign in to pick up where you left off — verified, cited answers across every field, available 24/7.
          </p>

          <div className="space-y-3.5 max-w-sm mx-auto lg:mx-0">
            {[
              { icon: Zap, title: "Ultra-fast answers", desc: "Sub-second responses, no lag." },
              { icon: ShieldCheck, title: "Verified & cited", desc: "Every answer rates its own confidence." },
              { icon: Globe, title: "100+ languages", desc: "Free to start, powerful when you scale." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 text-left">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#8ab4f8]/10 text-[#8ab4f8]">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-xs text-[#8e918f]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sign-in panel ── */}
        <div className="w-full max-w-[420px] mx-auto lg:ml-auto">
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-2xl font-normal text-white mb-1">Sign in</h2>
          <p className="text-sm text-[#8e918f]">to continue to TurboAnswer</p>
        </div>

        <div className="rounded-2xl border border-[#3c4043] bg-[#1e1f20]/80 backdrop-blur p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                id="email"
                type="email"
                autoComplete="email"
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
                autoComplete="current-password"
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
          <Link href="/customer-support" className="hover:text-[#aecbfa] transition-colors">Help</Link>
        </div>
        </div>
      </div>
    </div>
  );
}
