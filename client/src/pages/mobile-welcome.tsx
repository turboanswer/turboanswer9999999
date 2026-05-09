import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ChevronRight, Sparkles, Zap, Shield, Image as ImageIcon, MessageSquare } from "lucide-react";
import turboLogo from "@/assets/turboanswer-logo.png";
import shotLanding from "@assets/turboanswer_screenshots/01_landing_hero.jpg";
import shotPricing from "@assets/turboanswer_screenshots/02_pricing.jpg";
import shotChat from "@assets/turboanswer_screenshots/03_trial_chat.jpg";
import shotLogin from "@assets/turboanswer_screenshots/04_login.jpg";

type Slide = {
  bg: string;
  accent: string;
  icon: JSX.Element;
  eyebrow: string;
  title: string;
  body: string;
  image?: string;
};

const SLIDES: Slide[] = [
  {
    bg: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
    accent: "#fff",
    icon: <Sparkles size={20} />,
    eyebrow: "Welcome to TurboAnswer",
    title: "AI you can actually trust.",
    body: "Verified answers, not confident guesses. Every answer cites its sources and rates its own confidence.",
    image: shotLanding,
  },
  {
    bg: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)",
    accent: "#fff",
    icon: <MessageSquare size={20} />,
    eyebrow: "Lightning-fast chat",
    title: "Powered by OpenAI GPT-4o mini.",
    body: "Free forever. Ask anything — homework, code, recipes, life advice. Sub-second answers in 100+ languages.",
    image: shotChat,
  },
  {
    bg: "linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)",
    accent: "#fff",
    icon: <Zap size={20} />,
    eyebrow: "Upgrade for power",
    title: "Pro unlocks Claude Sonnet 4.5.",
    body: "4× longer answers, image generation, live web search, verified badges, and unlimited questions.",
    image: shotPricing,
  },
  {
    bg: "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #6366f1 100%)",
    accent: "#fff",
    icon: <Shield size={20} />,
    eyebrow: "Research-grade",
    title: "5 AI models. One answer.",
    body: "Research tier runs Claude + GPT-4o + Gemini Pro in parallel and judges the best answer with cited sources.",
    image: shotLogin,
  },
  {
    bg: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)",
    accent: "#fff",
    icon: <ImageIcon size={20} />,
    eyebrow: "Ready when you are",
    title: "Let's get you started.",
    body: "Free account. No credit card. Cancel anytime. Sign up takes 20 seconds.",
  },
];

export default function MobileWelcome() {
  const [, setLocation] = useLocation();
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
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
      className="min-h-screen flex flex-col text-white relative overflow-hidden"
      style={{ background: slide.bg, transition: "background 600ms ease" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="mobile-welcome"
    >
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-30 blur-3xl" style={{ background: "rgba(255,255,255,0.4)" }} />
      <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "rgba(255,255,255,0.5)" }} />

      <div className="relative z-10 flex items-center justify-between px-6 pt-12 pb-3">
        <div className="flex items-center gap-2">
          <img src={turboLogo} alt="TurboAnswer" className="w-8 h-8 rounded-xl object-cover" />
          <span className="text-sm font-bold tracking-wide">TurboAnswer</span>
        </div>
        {!isLast && (
          <button
            onClick={skip}
            className="text-sm font-medium opacity-80 active:opacity-100"
            data-testid="button-skip-onboarding"
          >
            Skip
          </button>
        )}
      </div>

      <div ref={trackRef} className="relative z-10 flex-1 flex flex-col items-center justify-center px-7 text-center">
        {slide.image && (
          <div
            className="w-full max-w-[300px] aspect-[3/4] rounded-3xl overflow-hidden mb-7 shadow-2xl border-2"
            style={{
              borderColor: "rgba(255,255,255,0.25)",
              boxShadow: "0 24px 60px -12px rgba(0,0,0,0.5)",
              transform: "perspective(800px) rotateX(2deg)",
            }}
          >
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
          </div>
        )}
        {!slide.image && (
          <div className="w-32 h-32 rounded-full mb-8 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)" }}>
            <img src={turboLogo} alt="TurboAnswer" className="w-20 h-20 rounded-2xl object-cover" />
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)" }}>
          {slide.icon}
          <span className="text-xs font-semibold tracking-wide uppercase">{slide.eyebrow}</span>
        </div>

        <h1 className="text-3xl font-black leading-tight mb-3 max-w-[320px]" style={{ letterSpacing: "-0.02em" }}>
          {slide.title}
        </h1>
        <p className="text-[15px] leading-relaxed max-w-[320px]" style={{ color: "rgba(255,255,255,0.85)" }}>
          {slide.body}
        </p>
      </div>

      <div className="relative z-10 px-7 pb-10" style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 24 : 8,
                background: i === idx ? "#fff" : "rgba(255,255,255,0.4)",
              }}
              data-testid={`dot-${i}`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          className="w-full h-[54px] rounded-full font-bold text-[16px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl"
          style={{ background: "#fff", color: "#0b0b0d" }}
          data-testid="button-onboarding-next"
        >
          {isLast ? "Create free account" : "Next"}
          {isLast ? <ArrowRight size={18} /> : <ChevronRight size={18} />}
        </button>

        {!isLast && (
          <button
            onClick={() => setLocation("/login")}
            className="w-full h-[44px] mt-3 rounded-full text-[14px] font-medium active:opacity-80"
            style={{ color: "rgba(255,255,255,0.85)" }}
            data-testid="button-onboarding-signin"
          >
            Already have an account? Sign in
          </button>
        )}
      </div>
    </div>
  );
}
