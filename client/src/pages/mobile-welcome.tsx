import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import TurboLogo from "@/components/TurboLogo";

export default function MobileWelcome() {
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-8 pt-20 pb-10"
      style={{ background: "#0a0a0b", color: "#fff" }}
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm text-center">
        <div
          className="mb-10 transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
          }}
        >
          <TurboLogo size={88} animated={false} />
        </div>

        <h1
          className="text-[34px] font-semibold tracking-tight mb-3 transition-all duration-700 delay-100"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
            letterSpacing: "-0.02em",
          }}
        >
          TurboAnswer
        </h1>

        <p
          className="text-[15px] leading-relaxed text-zinc-400 max-w-[280px] transition-all duration-700 delay-200"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
          }}
        >
          A faster way to think. Ask anything, get a clear answer.
        </p>
      </div>

      <div
        className="w-full max-w-sm space-y-3 transition-all duration-700 delay-300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={() => setLocation("/trial-chat")}
          className="w-full h-[52px] rounded-2xl font-medium text-[15px] active:opacity-80 transition-opacity"
          style={{
            background: "#fff",
            color: "#0a0a0b",
          }}
          data-testid="button-get-started"
        >
          Get started
        </button>

        <button
          onClick={() => setLocation("/login")}
          className="w-full h-[52px] rounded-2xl font-medium text-[15px] active:bg-white/5 transition-colors"
          style={{
            background: "transparent",
            color: "#a1a1aa",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          data-testid="button-sign-in"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
