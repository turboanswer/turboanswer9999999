import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Loader2, Shield, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

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
    <div className="min-h-screen bg-[#131314] text-white flex items-center justify-center px-4 py-8">
      <style>{`
        @keyframes gemini-fade-up { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="w-full max-w-[400px]" style={{ animation: 'gemini-fade-up 0.5s ease-out forwards' }}>
        <div className="flex flex-col items-center mb-8">
          <img src={turboLogo} alt="TurboAnswer" className="w-12 h-12 rounded-2xl object-cover mb-5" />
          <h1 className="text-2xl font-normal text-white mb-1">Create your account</h1>
          <p className="text-sm text-[#8e918f]">to start using TurboAnswer</p>
        </div>

        <div className="rounded-2xl border border-[#3c4043] bg-[#1e1f20] p-8">
          {inviteToken && inviteValid === true && (
            <div className="mb-5 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5 text-sm text-red-300">
              <Shield size={16} className="flex-shrink-0 text-red-400" />
              <span><strong>Admin Invite:</strong> {inviteLabel}</span>
            </div>
          )}
          {inviteToken && inviteValid === false && (
            <div className="mb-5 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2.5 text-sm text-yellow-300">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="firstName"
                type="text"
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
                className="bg-transparent border-[#3c4043] text-white placeholder-[#8e918f] rounded-lg h-12 text-sm focus:border-[#8ab4f8] focus:ring-0 focus:ring-offset-0 transition-colors"
              />
              <Input
                id="lastName"
                type="text"
                placeholder="Last name"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
                className="bg-transparent border-[#3c4043] text-white placeholder-[#8e918f] rounded-lg h-12 text-sm focus:border-[#8ab4f8] focus:ring-0 focus:ring-offset-0 transition-colors"
              />
            </div>

            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              className="bg-transparent border-[#3c4043] text-white placeholder-[#8e918f] rounded-lg h-12 text-sm focus:border-[#8ab4f8] focus:ring-0 focus:ring-offset-0 transition-colors"
            />

            <Input
              id="password"
              type="password"
              placeholder="Password (min. 6 characters)"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              minLength={6}
              className="bg-transparent border-[#3c4043] text-white placeholder-[#8e918f] rounded-lg h-12 text-sm focus:border-[#8ab4f8] focus:ring-0 focus:ring-offset-0 transition-colors"
            />

            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              required
              minLength={6}
              className="bg-transparent border-[#3c4043] text-white placeholder-[#8e918f] rounded-lg h-12 text-sm focus:border-[#8ab4f8] focus:ring-0 focus:ring-offset-0 transition-colors"
            />

            <div className="flex items-center justify-between pt-3">
              <Link href="/login" className="text-sm text-[#8ab4f8] hover:text-[#aecbfa] font-medium transition-colors">
                Sign in instead
              </Link>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-10 px-6 rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating</span>
                ) : (
                  <span className="flex items-center gap-1.5">{inviteValid ? "Create Admin" : "Next"} <ArrowRight className="h-3.5 w-3.5" /></span>
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
