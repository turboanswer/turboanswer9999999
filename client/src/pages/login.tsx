import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import TurboLogo from "@/components/TurboLogo";

const RECAPTCHA_SITE_KEY =
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string) ||
  "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      toast({
        title: "Verification required",
        description: "Please complete the reCAPTCHA check before signing in.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          captchaToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

        try {
          const pending = localStorage.getItem('turbo_pending_subscription');
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
                  localStorage.removeItem('turbo_pending_subscription');
                  queryClient.invalidateQueries({ queryKey: ["/api/models"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/enterprise-code"] });
                  toast({
                    title: "Subscription Activated!",
                    description: `Your ${syncData.tier} plan is now active.`,
                  });
                }
              }
            } else {
              localStorage.removeItem('turbo_pending_subscription');
            }
          }
        } catch (e) {}

        toast({
          title: "Welcome back!",
          description: "You're now signed in to Turbo Answer.",
        });
        setLocation("/chat");
      } else {
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        toast({
          title: "Error",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative">
      <div style={{ position: 'absolute', top: 20, left: 20 }}>
        <Link href="/">
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            <ArrowLeft size={15} /> Back
          </button>
        </Link>
      </div>

      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <TurboLogo size={48} animated={true} />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Welcome Back to TURBOANSWER
          </CardTitle>
          <CardDescription className="text-cyan-400 font-medium">
            NEVER STOP INNOVATING
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>

            <div className="flex justify-center py-1">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                theme="dark"
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !captchaToken}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-gray-400 hover:text-purple-400 transition-colors">
              Forgot your password?
            </Link>
          </div>

          <div className="mt-4 text-center">
            <p className="text-gray-400">
              Don't have an account?{" "}
              <Link href="/register" className="text-purple-400 hover:text-purple-300">
                Create one
              </Link>
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Lock size={11} className="text-green-500" />
                <span>256-bit AES Encrypted</span>
              </div>
              <div className="w-px h-3 bg-gray-700" />
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={11} className="text-blue-400" />
                <span>bcrypt Password Hashing</span>
              </div>
              <div className="w-px h-3 bg-gray-700" />
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={11} className="text-purple-400" />
                <span>reCAPTCHA Protected</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
