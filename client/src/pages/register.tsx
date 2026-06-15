import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Loader2, Shield, AlertCircle, ArrowRight, Gift, Mail, ArrowLeft } from "lucide-react";
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
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Email verification step
  const [step, setStep] = useState<"details" | "verify">("details");
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

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
    const ref = params.get("ref");
    if (ref) {
      const cleaned = ref.trim().toUpperCase();
      setReferralCode(cleaned);
      fetch(`/api/referral-codes/validate/${encodeURIComponent(cleaned)}`)
        .then(r => r.json())
        .then(data => setReferralValid(!!data.valid))
        .catch(() => setReferralValid(false));
    }
  }, [search]);

  // Step 1: validate the form, then email a 6-digit verification code.
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    if (!ageConfirmed) {
      toast({ title: "Age confirmation required", description: "TurboAnswer is not available to users under 13. Please confirm you are at least 13 years old.", variant: "destructive" });
      return;
    }

    if (!termsAgreed) {
      toast({ title: "Please accept the Terms", description: "You must agree to the Terms & Privacy Policy to create an account.", variant: "destructive" });
      return;
    }

    setSendingCode(true);
    try {
      const response = await fetch("/api/email/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();
      if (response.ok) {
        setStep("verify");
        setVerificationCode("");
        setResendCooldown(60);
        toast({ title: "Code sent", description: `We emailed a 6-digit code to ${formData.email}.` });
      } else {
        toast({ title: "Error", description: data.message || "Failed to send verification code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send verification code. Please try again.", variant: "destructive" });
    } finally {
      setSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || sendingCode) return;
    setSendingCode(true);
    try {
      const response = await fetch("/api/email/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();
      if (response.ok) {
        setResendCooldown(60);
        toast({ title: "Code resent", description: `A new code was emailed to ${formData.email}.` });
      } else {
        toast({ title: "Error", description: data.message || "Failed to resend code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to resend code. Please try again.", variant: "destructive" });
    } finally {
      setSendingCode(false);
    }
  };

  // Step 2: verify the emailed code, then create the account.
  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(verificationCode.trim())) {
      toast({ title: "Error", description: "Enter the 6-digit code from your email", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const verifyRes = await fetch("/api/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: formData.email, code: verificationCode.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        toast({ title: "Error", description: verifyData.message || "Verification failed", variant: "destructive" });
        return;
      }

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
          ageConfirmed: true,
          termsAgreed: true,
          ...(inviteToken && inviteValid ? { inviteToken } : {}),
          ...(referralCode && referralValid ? { referralCode } : {}),
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
          <p className="text-sm text-[#9aa0a6]">to start using TurboAnswer</p>
        </div>

        <div className="rounded-2xl border border-[#2d2f31] bg-[#1e1f20] p-8">
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
          {referralCode && referralValid === true && (
            <div className="mb-5 flex items-start gap-2 bg-pink-500/10 border border-pink-500/30 rounded-xl px-3 py-2.5 text-sm text-pink-200">
              <Gift size={16} className="flex-shrink-0 text-pink-400 mt-0.5" />
              <span><strong>Referral applied:</strong> you'll get <strong>1 month of Pro free</strong> when your account is created.</span>
            </div>
          )}
          {referralCode && referralValid === false && (
            <div className="mb-5 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2.5 text-sm text-yellow-300">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>That referral code isn't valid or has already been used.</span>
            </div>
          )}

          {step === "details" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="firstName"
                type="text"
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
                className="bg-transparent border-[#2d2f31] text-white placeholder-[#9aa0a6] rounded-lg h-12 text-sm focus:border-[#4285F4] focus:ring-0 focus:ring-offset-0 transition-colors"
              />
              <Input
                id="lastName"
                type="text"
                placeholder="Last name"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
                className="bg-transparent border-[#2d2f31] text-white placeholder-[#9aa0a6] rounded-lg h-12 text-sm focus:border-[#4285F4] focus:ring-0 focus:ring-offset-0 transition-colors"
              />
            </div>

            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              className="bg-transparent border-[#2d2f31] text-white placeholder-[#9aa0a6] rounded-lg h-12 text-sm focus:border-[#4285F4] focus:ring-0 focus:ring-offset-0 transition-colors"
            />

            <Input
              id="password"
              type="password"
              placeholder="Password (min. 6 characters)"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              minLength={6}
              className="bg-transparent border-[#2d2f31] text-white placeholder-[#9aa0a6] rounded-lg h-12 text-sm focus:border-[#4285F4] focus:ring-0 focus:ring-offset-0 transition-colors"
            />

            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              required
              minLength={6}
              className="bg-transparent border-[#2d2f31] text-white placeholder-[#9aa0a6] rounded-lg h-12 text-sm focus:border-[#4285F4] focus:ring-0 focus:ring-offset-0 transition-colors"
            />

            <div className="pt-2 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#2d2f31] bg-transparent accent-[#4285F4] cursor-pointer flex-shrink-0"
                />
                <span className="text-xs text-[#c9c3b8] leading-relaxed group-hover:text-white transition-colors">
                  I confirm I am <strong>at least 13 years old</strong>. TurboAnswer is not intended for children under 13 (COPPA).
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#2d2f31] bg-transparent accent-[#4285F4] cursor-pointer flex-shrink-0"
                />
                <span className="text-xs text-[#c9c3b8] leading-relaxed group-hover:text-white transition-colors">
                  I agree to the <Link href="/terms-conditions" className="text-[#4285F4] hover:text-[#5b9bff] underline">Terms</Link> and <Link href="/privacy-policy" className="text-[#4285F4] hover:text-[#5b9bff] underline">Privacy Policy</Link>.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-3">
              <Link href="/login" className="text-sm text-[#4285F4] hover:text-[#5b9bff] font-medium transition-colors">
                Sign in instead
              </Link>
              <Button
                type="submit"
                disabled={sendingCode || !ageConfirmed || !termsAgreed}
                className="h-10 px-6 rounded-full bg-[#4285F4] hover:bg-[#5b9bff] text-[#131314] font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {sendingCode ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending</span>
                ) : (
                  <span className="flex items-center gap-1.5">Send code <ArrowRight className="h-3.5 w-3.5" /></span>
                )}
              </Button>
            </div>
          </form>
          ) : (
          <form onSubmit={handleVerifyAndCreate} className="space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#4285F4]/15 flex items-center justify-center mb-3">
                <Mail size={22} className="text-[#4285F4]" />
              </div>
              <p className="text-sm text-white">Enter the 6-digit code</p>
              <p className="text-xs text-[#9aa0a6] mt-1">We sent it to <strong className="text-[#c9c3b8]">{formData.email}</strong></p>
            </div>

            <Input
              id="verificationCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className="bg-transparent border-[#2d2f31] text-white text-center tracking-[0.5em] text-xl placeholder-[#5a564d] rounded-lg h-14 focus:border-[#4285F4] focus:ring-0 focus:ring-offset-0 transition-colors"
            />

            <div className="text-center text-xs text-[#9aa0a6]">
              Didn't get it?{" "}
              {resendCooldown > 0 ? (
                <span className="text-[#5a564d]">Resend in {resendCooldown}s</span>
              ) : (
                <button type="button" onClick={handleResendCode} disabled={sendingCode} className="text-[#4285F4] hover:text-[#5b9bff] font-medium transition-colors disabled:opacity-50">
                  Resend code
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => { setStep("details"); setVerificationCode(""); }}
                className="flex items-center gap-1 text-sm text-[#4285F4] hover:text-[#5b9bff] font-medium transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change email
              </button>
              <Button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="h-10 px-6 rounded-full bg-[#4285F4] hover:bg-[#5b9bff] text-[#131314] font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating</span>
                ) : (
                  <span className="flex items-center gap-1.5">{inviteValid ? "Create Admin" : "Verify & create"} <ArrowRight className="h-3.5 w-3.5" /></span>
                )}
              </Button>
            </div>
          </form>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-[#9aa0a6]">
          <Link href="/privacy-policy" className="hover:text-[#5b9bff] transition-colors">Privacy</Link>
          <span>·</span>
          <Link href="/terms-conditions" className="hover:text-[#5b9bff] transition-colors">Terms</Link>
          <span>·</span>
          <Link href="/support" className="hover:text-[#5b9bff] transition-colors">Help</Link>
        </div>
      </div>
    </div>
  );
}
