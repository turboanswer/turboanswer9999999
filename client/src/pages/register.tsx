import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Loader2, Shield, AlertCircle, Sparkles, Brain, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import TurboLogo from "@/components/TurboLogo";

export default function Register() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteLabel, setInviteLabel] = useState<string>("");
  const [inviteError, setInviteError] = useState<string>("");
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("invite");
    if (token) {
      setInviteToken(token);
      fetch(`/api/invite/validate/${token}`)
        .then(r => r.json())
        .then(data => {
          setInviteValid(data.valid);
          if (data.valid) setInviteLabel(data.label || "Admin Invite");
          else setInviteError(data.reason || "Invalid invite link");
        })
        .catch(() => { setInviteValid(false); setInviteError("Could not validate invite link"); });
    }
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          timezone: formData.timezone,
          ...(inviteToken && inviteValid ? { inviteToken } : {}),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({
          title: "Account created!",
          description: data.isEmployee ? "Welcome! Your admin account is ready." : "Welcome to Turbo Answer!",
        });
        setLocation(data.isEmployee ? "/employee/dashboard" : "/chat");
      } else {
        toast({ title: "Error", description: data.message || "Failed to create account", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Registration failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col lg:flex-row overflow-hidden">
      <style>{`
        @keyframes float-gentle { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        @keyframes gradient-flow { 0% { background-position: 0% center; } 50% { background-position: 200% center; } 100% { background-position: 0% center; } }
      `}</style>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:py-0 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(66,133,244,0.12) 0%, transparent 70%)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[140px]" style={{ background: "radial-gradient(circle, rgba(234,67,53,0.06) 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 max-w-md text-center lg:text-left">
          <div className="flex justify-center lg:justify-start mb-8" style={{ animation: "float-gentle 6s ease-in-out infinite" }}>
            <TurboLogo size={72} animated={true} />
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold leading-tight mb-4" style={{
            background: "linear-gradient(135deg, #4285F4 0%, #9B72CB 25%, #D96570 50%, #D96570 75%, #FFC857 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "gradient-flow 8s ease infinite",
          }}>
            Hello, let's get started
          </h1>

          <p className="text-lg text-zinc-500 mb-8">
            Create your account and start exploring the power of AI.
          </p>

          <div className="hidden lg:flex flex-col gap-3">
            {[
              { icon: Brain, text: "Chat with world-class AI models", color: "text-violet-400" },
              { icon: Zap, text: "Build apps, generate images & videos", color: "text-cyan-400" },
              { icon: Sparkles, text: "100+ languages, document analysis & more", color: "text-amber-400" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                <item.icon className={`h-4 w-4 ${item.color} flex-shrink-0`} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-0">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8">
            <h2 className="text-xl font-semibold text-white mb-1">Create account</h2>
            <p className="text-sm text-zinc-500 mb-6">Fill in your details to get started</p>

            {inviteToken && inviteValid === true && (
              <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-sm text-red-300">
                <Shield size={16} className="flex-shrink-0 text-red-400" />
                <span><strong>Admin Invite:</strong> {inviteLabel}</span>
              </div>
            )}
            {inviteToken && inviteValid === false && (
              <div className="mb-4 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 text-sm text-yellow-300">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-zinc-300 text-sm">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                    className="bg-white/[0.05] border-white/[0.08] text-white placeholder-zinc-600 rounded-xl h-11 focus:border-blue-500/50 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-zinc-300 text-sm">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                    className="bg-white/[0.05] border-white/[0.08] text-white placeholder-zinc-600 rounded-xl h-11 focus:border-blue-500/50 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300 text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="bg-white/[0.05] border-white/[0.08] text-white placeholder-zinc-600 rounded-xl h-11 focus:border-blue-500/50 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300 text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={6}
                  className="bg-white/[0.05] border-white/[0.08] text-white placeholder-zinc-600 rounded-xl h-11 focus:border-blue-500/50 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-zinc-300 text-sm">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                  className="bg-white/[0.05] border-white/[0.08] text-white placeholder-zinc-600 rounded-xl h-11 focus:border-blue-500/50 focus:ring-blue-500/20"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className={`w-full h-11 rounded-xl text-white font-semibold text-sm disabled:opacity-50`}
                style={{ background: inviteValid ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" : "linear-gradient(135deg, #4285F4 0%, #7B68EE 50%, #9B72CB 100%)" }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating Account...</span>
                ) : (
                  <span className="flex items-center gap-2">{inviteValid ? "Create Admin Account" : "Create Account"} <ArrowRight className="h-4 w-4" /></span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/[0.06]">
              <p className="text-center text-sm text-zinc-500">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
