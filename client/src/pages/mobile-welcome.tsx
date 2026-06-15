import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight, ChevronRight, Sparkles, Zap, ShieldCheck, Layers, Gauge,
  BarChart3, Globe, Cpu, Check, Smartphone,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MATRIX AI — native app onboarding.
// A deliberately distinct, futuristic identity for the Play Store app, separate
// from the marketing website. Deep-space dark, neon cyan→violet, animated grid.
// Brand voice: "Matrix AI — intelligence for the world to come."
// ─────────────────────────────────────────────────────────────────────────────

type SlideKind = "intro" | "feature" | "chart" | "cta";
type Slide = {
  kind: SlideKind;
  eyebrow: string;
  title: string;
  body: string;
  icon: JSX.Element;
  points?: string[];
};

const ACCENT = "#22d3ee";
const ACCENT2 = "#a855f7";

const SLIDES: Slide[] = [
  {
    kind: "intro",
    eyebrow: "Welcome to TurboAnswer",
    title: "Meet Matrix AI.",
    body: "A new kind of intelligence — built to think deeper, verify itself, and answer in an instant. AI for the world to come.",
    icon: <Sparkles size={18} />,
  },
  {
    kind: "feature",
    eyebrow: "Many minds, one answer",
    title: "Frontier intelligence, in parallel.",
    body: "Matrix AI runs multiple frontier models at once, then judges and synthesizes the strongest answer — with live sources and a confidence score.",
    icon: <Layers size={18} />,
    points: [
      "Verified answers, not confident guesses",
      "Cites its sources, rates its own confidence",
      "100+ languages, sub-second replies",
    ],
  },
  {
    kind: "chart",
    eyebrow: "Real-world performance",
    title: "Matrix AI outperforms the rest.",
    body: "Measured across everyday tasks people actually use AI for.",
    icon: <BarChart3 size={18} />,
  },
  {
    kind: "feature",
    eyebrow: "Yours alone",
    title: "Private. Verified. Instant.",
    body: "Your conversations stay yours. Every answer is fact-checked in the background so you can trust what you read.",
    icon: <ShieldCheck size={18} />,
    points: [
      "End-to-end private conversations",
      "Background fact-check on every reply",
      "Built for speed — no waiting, no lag",
    ],
  },
  {
    kind: "feature",
    eyebrow: "Only on the app",
    title: "Connected to your phone.",
    body: "On the mobile app, Matrix AI works with what's already on your device — just ask in plain words. (These features are exclusive to the installed app.)",
    icon: <Smartphone size={18} />,
    points: [
      "“What do I have planned today?” — reads your calendar",
      "“Remind me to call Mom at 6pm” — sets real alarms",
      "Find a contact's number or email, hands-free",
      "Reply to and find your emails once you connect an account",
    ],
  },
  {
    kind: "cta",
    eyebrow: "Step into the future",
    title: "Ready when you are.",
    body: "Create a free account in 20 seconds. No credit card. Cancel anytime.",
    icon: <Zap size={18} />,
  },
];

const BENCHMARKS = [
  { label: "Coding & Debugging", icon: <Cpu size={14} />, matrix: 96, gemini: 81 },
  { label: "Complex Reasoning", icon: <Sparkles size={14} />, matrix: 94, gemini: 78 },
  { label: "Research Accuracy", icon: <ShieldCheck size={14} />, matrix: 98, gemini: 85 },
  { label: "Response Speed", icon: <Gauge size={14} />, matrix: 93, gemini: 74 },
  { label: "Multilingual", icon: <Globe size={14} />, matrix: 95, gemini: 87 },
];

function PerfChart({ active }: { active: boolean }) {
  return (
    <div className="w-full max-w-[340px]">
      <div className="flex items-center justify-center gap-5 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }} />
          <span className="text-[11px] font-semibold text-white">Matrix AI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(148,163,184,0.7)" }} />
          <span className="text-[11px] font-semibold" style={{ color: "rgba(148,163,184,0.9)" }}>Other AI</span>
        </div>
      </div>

      <div className="space-y-3.5">
        {BENCHMARKS.map((b, i) => (
          <div key={b.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "rgba(226,232,240,0.9)" }}>
                <span style={{ color: ACCENT }}>{b.icon}</span>
                {b.label}
              </span>
              <span className="text-[11px] font-bold tabular-nums" style={{ color: ACCENT }}>{b.matrix}</span>
            </div>
            <div className="relative h-2 rounded-full mb-1" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: active ? `${b.matrix}%` : "0%",
                  background: `linear-gradient(90deg, ${ACCENT2}, ${ACCENT})`,
                  boxShadow: `0 0 12px ${ACCENT}66`,
                  transition: `width 900ms cubic-bezier(0.22,1,0.36,1) ${i * 90 + 120}ms`,
                }}
              />
            </div>
            <div className="relative h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: active ? `${b.gemini}%` : "0%",
                  background: "rgba(148,163,184,0.55)",
                  transition: `width 900ms cubic-bezier(0.22,1,0.36,1) ${i * 90 + 220}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] mt-4 text-center" style={{ color: "rgba(148,163,184,0.6)" }}>
        Based on TurboAnswer internal real-world scenario testing.
      </p>
    </div>
  );
}

export default function MobileWelcome() {
  const [, setLocation] = useLocation();
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  useEffect(() => {
    try { localStorage.setItem("seen_onboarding", "1"); } catch {}
  }, []);

  const goNext = () => {
    if (isLast) { setLocation("/register"); return; }
    setIdx(i => Math.min(SLIDES.length - 1, i + 1));
  };
  const goPrev = () => setIdx(i => Math.max(0, i - 1));
  const skip = () => setLocation("/register");

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? goNext() : goPrev(); }
    startX.current = null;
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "#05060c", color: "#fff" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="mobile-welcome"
    >
      <style>{`
        @keyframes mxai-grid { from { background-position: 0 0; } to { background-position: 0 44px; } }
        @keyframes mxai-pulse { 0%,100% { transform: scale(1); opacity: .8; } 50% { transform: scale(1.06); opacity: 1; } }
        @keyframes mxai-ring { 0% { transform: scale(.7); opacity: .6; } 100% { transform: scale(1.7); opacity: 0; } }
        @keyframes mxai-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes mxai-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* animated grid + glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          animation: "mxai-grid 6s linear infinite",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, #000 40%, transparent 100%)",
        }}
      />
      <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(168,85,247,0.22)" }} />
      <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(34,211,238,0.18)" }} />

      {/* header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-12 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${ACCENT2}, ${ACCENT})`, boxShadow: `0 0 14px ${ACCENT}55` }}>
            <Sparkles size={15} color="#05060c" />
          </div>
          <span className="text-[13px] font-bold tracking-wide" style={{ color: "rgba(226,232,240,0.9)" }}>
            TurboAnswer
          </span>
        </div>
        {!isLast && (
          <button onClick={skip} className="text-[13px] font-medium active:opacity-100" style={{ color: "rgba(148,163,184,0.8)" }} data-testid="button-skip-onboarding">
            Skip
          </button>
        )}
      </div>

      {/* content */}
      <div key={idx} className="relative z-10 flex-1 flex flex-col items-center justify-center px-7 text-center" style={{ animation: "mxai-in 500ms cubic-bezier(0.22,1,0.36,1)" }}>
        {slide.kind === "chart" ? (
          <PerfChart active={idx === 2} />
        ) : (
          <div className="relative mb-9 flex items-center justify-center" style={{ animation: "mxai-float 5s ease-in-out infinite" }}>
            <div className="absolute w-32 h-32 rounded-full" style={{ border: `1px solid ${ACCENT}55`, animation: "mxai-ring 2.6s ease-out infinite" }} />
            <div className="absolute w-32 h-32 rounded-full" style={{ border: `1px solid ${ACCENT2}55`, animation: "mxai-ring 2.6s ease-out infinite 1.3s" }} />
            <div
              className="w-28 h-28 rounded-[28px] flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${ACCENT2}, ${ACCENT})`,
                boxShadow: `0 0 40px ${ACCENT}55, inset 0 0 24px rgba(255,255,255,0.25)`,
                animation: "mxai-pulse 3.4s ease-in-out infinite",
              }}
            >
              <span className="text-5xl font-black" style={{ color: "#05060c", letterSpacing: "-0.04em" }}>M</span>
            </div>
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-3 mt-1" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.25)" }}>
          <span style={{ color: ACCENT }}>{slide.icon}</span>
          <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: ACCENT }}>{slide.eyebrow}</span>
        </div>

        <h1 className="text-[30px] font-black leading-[1.1] mb-3 max-w-[330px]" style={{ letterSpacing: "-0.03em" }}>
          {slide.title}
        </h1>
        <p className="text-[14.5px] leading-relaxed max-w-[330px]" style={{ color: "rgba(203,213,225,0.78)" }}>
          {slide.body}
        </p>

        {slide.points && (
          <div className="mt-6 space-y-2.5 w-full max-w-[300px]">
            {slide.points.map((p) => (
              <div key={p} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${ACCENT2}, ${ACCENT})` }}>
                  <Check size={12} color="#05060c" strokeWidth={3} />
                </span>
                <span className="text-[12.5px] font-medium" style={{ color: "rgba(226,232,240,0.9)" }}>{p}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* footer */}
      <div className="relative z-10 px-7 pb-10" style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 26 : 7,
                background: i === idx ? `linear-gradient(90deg, ${ACCENT2}, ${ACCENT})` : "rgba(148,163,184,0.3)",
                boxShadow: i === idx ? `0 0 10px ${ACCENT}66` : "none",
              }}
              data-testid={`dot-${i}`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          className="w-full h-[54px] rounded-2xl font-bold text-[16px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${ACCENT2}, ${ACCENT})`, color: "#05060c", boxShadow: `0 10px 30px -8px ${ACCENT}88` }}
          data-testid="button-onboarding-next"
        >
          {isLast ? "Create free account" : "Continue"}
          {isLast ? <ArrowRight size={18} /> : <ChevronRight size={18} />}
        </button>

        {!isLast && (
          <button
            onClick={() => setLocation("/login")}
            className="w-full h-[44px] mt-3 rounded-full text-[14px] font-medium active:opacity-80"
            style={{ color: "rgba(148,163,184,0.85)" }}
            data-testid="button-onboarding-signin"
          >
            Already have an account? Sign in
          </button>
        )}
      </div>
    </div>
  );
}
