import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import TurboLogo from "@/components/TurboLogo";
import { Shield, AlertCircle, Phone } from "lucide-react";

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
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
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

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSendCode = async () => {
    if (!formData.phoneNumber.trim()) {
      toast({ title: "Error", description: "Please enter your phone number first", variant: "destructive" });
      return;
    }
    setSendingCode(true);
    try {
      const res = await fetch("/api/sms/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        setCodeSent(true);
        setCooldown(60);
        toast({ title: "Code Sent", description: "Check your phone for the verification code" });
      } else {
        toast({ title: "Error", description: data.message || "Failed to send code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send verification code", variant: "destructive" });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!smsCode.trim()) return;
    setVerifyingCode(true);
    try {
      const res = await fetch("/api/sms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber, code: smsCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPhoneVerified(true);
        toast({ title: "Verified", description: "Phone number verified successfully" });
      } else {
        toast({ title: "Error", description: data.message || "Invalid code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Verification failed", variant: "destructive" });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneVerified) {
      toast({ title: "Error", description: "Please verify your phone number first", variant: "destructive" });
      return;
    }

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
          phoneNumber: formData.phoneNumber || undefined,
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
        if (data.message && (data.message.includes("verified") || data.message.includes("Phone number"))) {
          setPhoneVerified(false);
          setCodeSent(false);
          setSmsCode("");
          setCooldown(0);
        }
        toast({ title: "Error", description: data.message || "Failed to create account", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Registration failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative">
      <div style={{ position: "absolute", top: 20, left: 20 }}>
        <Link href="/login">
          <button style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
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
            Join TURBOANSWER
          </CardTitle>
          <CardDescription className="text-cyan-400 font-medium">
            NEVER STOP INNOVATING
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteToken && inviteValid === true && (
            <div className="mb-4 flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2.5 text-sm text-red-300">
              <Shield size={16} className="flex-shrink-0 text-red-400" />
              <span><strong>Admin Invite:</strong> {inviteLabel} — this account will have full admin access.</span>
            </div>
          )}
          {inviteToken && inviteValid === false && (
            <div className="mb-4 flex items-center gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-3 py-2.5 text-sm text-yellow-300">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-white">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-white">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email *</Label>
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
              <Label htmlFor="phoneNumber" className="text-white flex items-center gap-2">
                <Phone size={14} />
                Phone Number *
                {phoneVerified && <CheckCircle size={14} className="text-green-400" />}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="e.g. +1 (555) 000-0000"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, phoneNumber: e.target.value }));
                    if (phoneVerified) {
                      setPhoneVerified(false);
                      setCodeSent(false);
                      setSmsCode("");
                    }
                  }}
                  required
                  disabled={phoneVerified}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 flex-1"
                />
                {!phoneVerified && (
                  <Button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode || !formData.phoneNumber.trim() || cooldown > 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap px-3 text-sm"
                  >
                    {sendingCode ? <Loader2 size={16} className="animate-spin" /> : cooldown > 0 ? `${cooldown}s` : codeSent ? "Resend" : "Send Code"}
                  </Button>
                )}
              </div>
              {phoneVerified && (
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                  <CheckCircle size={12} /> Phone number verified
                </p>
              )}
            </div>

            {codeSent && !phoneVerified && (
              <div className="space-y-2">
                <Label htmlFor="smsCode" className="text-white">Verification Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="smsCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 flex-1 text-center tracking-[0.3em] text-lg font-mono"
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || smsCode.length !== 6}
                    className="bg-green-600 hover:bg-green-700 text-white px-4"
                  >
                    {verifyingCode ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Enter the 6-digit code sent to your phone</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !phoneVerified}
              className={`w-full text-white disabled:opacity-50 ${inviteValid ? "bg-red-700 hover:bg-red-800" : "bg-purple-600 hover:bg-purple-700"}`}
            >
              {isLoading ? "Creating Account..." : inviteValid ? "Create Admin Account" : "Create Account"}
            </Button>

            {!phoneVerified && (
              <p className="text-xs text-center text-amber-400/80">
                Please verify your phone number to create an account
              </p>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-purple-400 hover:text-purple-300">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
