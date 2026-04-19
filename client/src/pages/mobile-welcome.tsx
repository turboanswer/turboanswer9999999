import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Shield, ArrowRight, Check } from "lucide-react";
import TurboLogo from "@/components/TurboLogo";

export default function MobileWelcome() {
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const fade = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 700ms ease-out ${delay}ms, transform 700ms ease-out ${delay}ms`,
  });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-7 pt-16 pb-8 relative overflow-hidden"
      style={{ background: "#05060a", color: "#fff" }}
    >
      {/* Soft emerald glow background */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 600,
          background: "radial-gradient(ellipse, rgba(16,185,129,0.18), rgba(16,185,129,0.04) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-sm text-center">
        <div style={fade(0)} className="mb-8">
          <TurboLogo size={84} animated={false} />
        </div>

        {/* Verified badge */}
        <div
          style={fade(80)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-6"
          aria-label="Verified by second AI"
        >
          <Shield size={12} className="text-emerald-400" />
          <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">
            Matrix AI
          </span>
        </div>

        <h1
          style={{ ...fade(160), letterSpacing: "-0.02em" }}
          className="text-[34px] font-semibold tracking-tight mb-3 leading-[1.1]"
        >
          The AI you can<br />
          <span
            style={{
              background: "linear-gradient(90deg, #10b981, #34d399)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            actually trust.
          </span>
        </h1>

        <p
          style={fade(240)}
          className="text-[15px] leading-relaxed text-zinc-400 max-w-[300px]"
        >
          Every answer is fact-checked by a second AI model. No hallucinations. Just verified truth.
        </p>
      </div>

      <div
        className="relative z-10 w-full max-w-sm space-y-3"
        style={{
          ...fade(340),
          paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={() => setLocation("/trial-chat")}
          className="w-full h-[54px] rounded-2xl font-semibold text-[15px] active:opacity-90 transition-all flex items-center justify-center gap-2 text-white"
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            boxShadow: "0 10px 30px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
          data-testid="button-get-started"
        >
          Get started
          <ArrowRight size={17} />
        </button>

        <button
          onClick={() => setLocation("/login")}
          className="w-full h-[54px] rounded-2xl font-medium text-[15px] active:bg-white/5 transition-colors text-zinc-300"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
          data-testid="button-sign-in"
        >
          Sign in
        </button>

        <div className="flex items-center justify-center gap-4 pt-3 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1"><Check size={11} className="text-emerald-500" /> Free forever</span>
          <span className="flex items-center gap-1"><Check size={11} className="text-emerald-500" /> No credit card</span>
        </div>
      </div>
    </div>
  );
}
