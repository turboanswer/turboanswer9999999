import { useState } from "react";
import { Loader2, ShieldCheck, Copy, Check, ArrowRight, ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface TwoFactorSetupProps {
  qr: string;
  otpauthUrl: string;
  backupCodes: string[];
  email?: string;
  onVerified: (user: any) => void;
}

// Shared two-factor enrollment flow used by both signup and the legacy-account login
// upgrade path. Shows one-time backup codes (the user must confirm they saved them),
// then the authenticator QR + a 6-digit confirmation that enables 2FA on the server.
export default function TwoFactorSetup({ qr, otpauthUrl, backupCodes, email, onVerified }: TwoFactorSetupProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"backup" | "verify">("backup");
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const manualSecret = (() => {
    try { return new URL(otpauthUrl).searchParams.get("secret") || ""; } catch { return ""; }
  })();

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied", description: "Backup codes copied to your clipboard." });
    } catch {
      toast({ title: "Couldn't copy", description: "Please select and copy the codes manually.", variant: "destructive" });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(token.trim())) {
      toast({ title: "Error", description: "Enter the 6-digit code from your authenticator app", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onVerified(data);
      } else {
        toast({ title: "Error", description: data.message || "Verification failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Verification failed. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (phase === "backup") {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-[#4285F4]/15 flex items-center justify-center mb-3">
            <KeyRound size={22} className="text-[#4285F4]" />
          </div>
          <p className="text-sm text-white">Save your backup codes</p>
          <p className="text-xs text-[#9aa0a6] mt-1">
            Store these somewhere safe. Each code works once if you ever lose access to your authenticator app.
          </p>
        </div>

        <div className="rounded-xl border border-[#2d2f31] bg-[#131314] p-4">
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code) => (
              <div key={code} className="font-mono text-sm text-[#c9c3b8] tracking-wider text-center py-1.5">
                {code}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={copyCodes}
          className="w-full flex items-center justify-center gap-2 text-xs text-[#4285F4] hover:text-[#5b9bff] font-medium transition-colors"
        >
          {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy codes</>}
        </button>

        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={savedConfirmed}
            onChange={(e) => setSavedConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#2d2f31] bg-transparent accent-[#4285F4] cursor-pointer flex-shrink-0"
          />
          <span className="text-xs text-[#c9c3b8] leading-relaxed group-hover:text-white transition-colors">
            I've saved my backup codes somewhere safe.
          </span>
        </label>

        <Button
          type="button"
          disabled={!savedConfirmed}
          onClick={() => setPhase("verify")}
          className="w-full h-10 rounded-full bg-[#4285F4] hover:bg-[#5b9bff] text-[#131314] font-medium text-sm disabled:opacity-50 transition-colors"
        >
          <span className="flex items-center justify-center gap-1.5">Continue <ArrowRight className="h-3.5 w-3.5" /></span>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-5">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-[#4285F4]/15 flex items-center justify-center mb-3">
          <ShieldCheck size={22} className="text-[#4285F4]" />
        </div>
        <p className="text-sm text-white">Scan with your authenticator app</p>
        <p className="text-xs text-[#9aa0a6] mt-1">
          Use Google Authenticator, Authy, or any TOTP app{email ? <> for <strong className="text-[#c9c3b8]">{email}</strong></> : null}.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="rounded-xl bg-white p-3">
          <img src={qr} alt="2FA QR code" width={200} height={200} className="block" />
        </div>
      </div>

      {manualSecret && (
        <div className="text-center">
          <p className="text-xs text-[#9aa0a6]">Can't scan? Enter this key manually:</p>
          <p className="font-mono text-xs text-[#c9c3b8] tracking-wider break-all mt-1">{manualSecret}</p>
        </div>
      )}

      <Input
        id="twofaToken"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        value={token}
        onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
        required
        className="bg-transparent border-[#2d2f31] text-white text-center tracking-[0.5em] text-xl placeholder-[#5a564d] rounded-lg h-14 focus:border-[#4285F4] focus:ring-0 focus:ring-offset-0 transition-colors"
      />

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setPhase("backup")}
          className="flex items-center gap-1 text-sm text-[#4285F4] hover:text-[#5b9bff] font-medium transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Backup codes
        </button>
        <Button
          type="submit"
          disabled={loading || token.length !== 6}
          className="h-10 px-6 rounded-full bg-[#4285F4] hover:bg-[#5b9bff] text-[#131314] font-medium text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying</span>
          ) : (
            <span className="flex items-center gap-1.5">Enable 2FA <ArrowRight className="h-3.5 w-3.5" /></span>
          )}
        </Button>
      </div>
    </form>
  );
}
