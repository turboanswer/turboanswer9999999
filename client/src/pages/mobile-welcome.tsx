import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, Sparkles } from "lucide-react";
import turboLogo from "@/assets/turboanswer-logo.png";

export default function MobileWelcome() {
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const fade = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 600ms ease-out ${delay}ms, transform 600ms ease-out ${delay}ms`,
  });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-7 pt-20 pb-10"
      style={{ background: "#0b0b0d", color: "#fff" }}
    >
      {/* Top: logo + wordmark */}
      <div style={fade(0)} className="flex flex-col items-center">
        <img
          src={turboLogo}
          alt="Turbo Answer"
          className="w-14 h-14 rounded-2xl object-cover mb-4"
        />
        <span
          className="text-[13px] font-medium tracking-[0.18em] uppercase"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Turbo Answer
        </span>
      </div>

      {/* Middle: greeting */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm text-center">
        <h1
          style={{
            ...fade(120),
            letterSpacing: "-0.035em",
            background: "linear-gradient(90deg, #4285F4 0%, #9B72F2 35%, #D96570 65%, #F2B95E 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          className="text-[56px] font-light leading-[1] mb-6"
        >
          Hello.
        </h1>
        <p
          style={fade(220)}
          className="text-[17px] leading-relaxed font-light max-w-[280px]"
          /* Soft white, lots of whitespace — Gemini-style intro */
        >
          A new kind of intelligence.
          <br />
          <span style={{ color: "rgba(255,255,255,0.55)" }}>
            Verified. Cited. In seconds.
          </span>
        </p>
      </div>

      {/* Bottom: actions + trust strip */}
      <div
        className="w-full max-w-sm space-y-3"
        style={{
          ...fade(320),
          paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={() => setLocation("/trial-chat")}
          className="w-full h-[52px] rounded-full font-medium text-[15px] active:opacity-90 transition-all flex items-center justify-center gap-2"
          style={{
            background: "#fff",
            color: "#0b0b0d",
            letterSpacing: "-0.005em",
          }}
          data-testid="button-get-started"
        >
          <Sparkles size={15} />
          Get started
        </button>

        <button
          onClick={() => setLocation("/login")}
          className="w-full h-[52px] rounded-full font-medium text-[15px] active:bg-white/5 transition-colors"
          style={{
            background: "transparent",
            color: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          data-testid="button-sign-in"
        >
          Sign in
        </button>

        <div
          className="flex items-center justify-center gap-2 pt-4 text-[11px]"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <ShieldCheck size={12} />
          <span>Free to start. No card required.</span>
        </div>
      </div>
    </div>
  );
}
