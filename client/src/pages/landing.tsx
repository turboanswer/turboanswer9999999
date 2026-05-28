import { useState } from "react";
import {
  ArrowRight, Check, Menu, X, Code2, Eye, Brain, Shield,
  Mic, Database, Zap,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const ACCENT = "#ff6b1a";
const ACCENT_HOVER = "#ff8541";
const INK = "#0a0a0f";
const INK_HI = "#101019";
const LINE = "rgba(255,255,255,0.08)";
const TEXT = "#e8eaed";
const MUTED = "#8a8f98";

function Orb() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: "min(1200px, 140vw)",
          height: "min(1200px, 140vw)",
          left: "50%",
          top: "-40%",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,107,26,0.22) 0%, rgba(255,107,26,0.08) 28%, rgba(60,30,120,0.18) 55%, rgba(10,10,15,0) 72%)",
          filter: "blur(20px)",
          animation: "orb 28s linear infinite",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6) 0, transparent 1px), radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.4) 0, transparent 1px), radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.5) 0, transparent 1px), radial-gradient(1px 1px at 85% 20%, rgba(255,255,255,0.35) 0, transparent 1px), radial-gradient(1px 1px at 15% 70%, rgba(255,255,255,0.45) 0, transparent 1px)",
          backgroundSize: "600px 600px",
          opacity: 0.5,
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background: "linear-gradient(to bottom, transparent, #0a0a0f)",
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const ctaHref = isAuthenticated ? "/chat" : "/login";
  const ctaLabel = isAuthenticated ? "Open the app" : "Get started — free";

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: INK,
        color: TEXT,
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontFeatureSettings: '"ss01", "cv11"',
      }}
      data-testid="landing-pro"
    >
      <style>{`
        @keyframes orb {
          0%   { transform: translateX(-50%) rotate(0deg); }
          100% { transform: translateX(-50%) rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease-out both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.15s; }
        .fade-up-3 { animation-delay: 0.25s; }
        .fade-up-4 { animation-delay: 0.35s; }
        .cta-primary {
          background: ${ACCENT};
          color: #fff;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .cta-primary:hover { background: ${ACCENT_HOVER}; }
        .cta-secondary {
          background: rgba(255,255,255,0.04);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.14);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .cta-secondary:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.24);
        }
        .card {
          background: ${INK_HI};
          border: 1px solid ${LINE};
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .card:hover { border-color: rgba(255,255,255,0.18); }
      `}</style>

      {/* ─────────── TOP STRIP ─────────── */}
      <div
        className="w-full text-center text-xs py-2 px-4"
        style={{ background: "#000", color: MUTED, borderBottom: `1px solid ${LINE}` }}
      >
        Built by an 11-year-old founder · Live on Azure ·{" "}
        <Link href={ctaHref}>
          <span className="underline cursor-pointer" style={{ color: TEXT }}>
            Try it free →
          </span>
        </Link>
      </div>

      {/* ─────────── NAV ─────────── */}
      <nav
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "rgba(10,10,15,0.78)",
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: ACCENT }}
              >
                <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-base font-semibold tracking-tight" style={{ color: TEXT }}>
                TurboAnswer
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm" style={{ color: MUTED }}>
            <a href="#capabilities" className="hover:text-white transition-colors">Capabilities</a>
            <a href="#models" className="hover:text-white transition-colors">Models</a>
            <a href="#policy" className="hover:text-white transition-colors">No-BS Policy</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href={ctaHref}>
              <button
                className="cta-primary px-4 py-2 rounded-md text-sm font-medium"
                data-testid="button-nav-cta"
              >
                {ctaLabel}
              </button>
            </Link>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: TEXT }}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="md:hidden px-5 py-4 space-y-3 border-t"
            style={{ borderColor: LINE, background: INK }}
          >
            {[
              ["Capabilities", "#capabilities"],
              ["Models", "#models"],
              ["No-BS Policy", "#policy"],
              ["Pricing", "#pricing"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm py-1"
                style={{ color: TEXT }}
              >
                {label}
              </a>
            ))}
            <Link href={ctaHref}>
              <button className="cta-primary w-full py-2.5 rounded-md text-sm font-medium">
                {ctaLabel}
              </button>
            </Link>
          </div>
        )}
      </nav>

      {/* ─────────── HERO ─────────── */}
      <section className="relative">
        <Orb />
        <div className="relative max-w-5xl mx-auto px-5 pt-20 pb-28 sm:pt-28 sm:pb-36 text-center z-10">
          <div
            className="fade-up fade-up-1 inline-flex items-center gap-2 px-3 py-1 mb-7 rounded-full text-xs"
            style={{
              border: `1px solid ${LINE}`,
              background: "rgba(255,255,255,0.03)",
              color: MUTED,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3ddc84" }} />
            Live on Azure · 99.97% uptime
          </div>

          <h1
            className="fade-up fade-up-2 font-semibold tracking-tight mb-6"
            style={{
              fontSize: "clamp(2.5rem, 6.5vw, 5.25rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: "#fff",
            }}
          >
            Real answers.
            <br />
            <span style={{ color: ACCENT }}>Zero theater.</span>
          </h1>

          <p
            className="fade-up fade-up-3 max-w-2xl mx-auto mb-9 text-base sm:text-lg"
            style={{ color: MUTED, lineHeight: 1.6 }}
          >
            TurboAnswer routes every query through the strongest production model
            for the job — GPT, Claude, Gemini — verifies the answer, and ships it
            back in under 300&nbsp;ms. No upsells. No hand-wavy marketing. No
            throttle.
          </p>

          <div className="fade-up fade-up-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href={ctaHref}>
              <button
                className="cta-primary px-6 py-3 rounded-md font-medium text-sm inline-flex items-center gap-2"
                data-testid="button-hero-primary"
              >
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <a href="#capabilities">
              <button className="cta-secondary px-6 py-3 rounded-md font-medium text-sm">
                See what it does
              </button>
            </a>
          </div>

          <div
            className="fade-up fade-up-4 flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-xs"
            style={{ color: MUTED }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Check size={13} style={{ color: ACCENT }} /> No credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={13} style={{ color: ACCENT }} /> No daily caps on Pro
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={13} style={{ color: ACCENT }} /> Cancel in one click
            </span>
          </div>
        </div>
      </section>

      {/* ─────────── MODELS STRIP ─────────── */}
      <section
        id="models"
        className="border-y"
        style={{ borderColor: LINE, background: "rgba(255,255,255,0.015)" }}
      >
        <div className="max-w-6xl mx-auto px-5 py-14">
          <div className="text-center mb-10">
            <div
              className="text-xs uppercase tracking-[0.18em] mb-3"
              style={{ color: MUTED }}
            >
              The stack
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight"
              style={{ color: "#fff", letterSpacing: "-0.02em" }}
            >
              Four model families. One router. Best answer wins.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "GPT-5.4 Pro", note: "Reasoning · 1M context" },
              { name: "GPT-5.1 Codex Max", note: "Code analysis · refactor" },
              { name: "Claude Sonnet 4.5", note: "Long-form · synthesis" },
              { name: "Gemini 2.5 Pro", note: "Vision · grounded search" },
            ].map((m) => (
              <div key={m.name} className="card rounded-lg p-5">
                <div className="text-sm font-semibold mb-1" style={{ color: "#fff" }}>
                  {m.name}
                </div>
                <div className="text-xs" style={{ color: MUTED }}>
                  {m.note}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { v: "<300ms", l: "Median response time" },
              { v: "99.97%", l: "Uptime, last 90 days" },
              { v: "0", l: "Hidden upsells" },
              { v: "20+", l: "Sources per Deep Research" },
            ].map((s, i) => (
              <div key={i}>
                <div
                  className="text-2xl sm:text-3xl font-semibold tracking-tight"
                  style={{ color: "#fff", letterSpacing: "-0.02em" }}
                >
                  {s.v}
                </div>
                <div className="text-xs mt-1" style={{ color: MUTED }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CAPABILITIES ─────────── */}
      <section id="capabilities" className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 max-w-2xl">
            <div className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: ACCENT }}>
              Capabilities
            </div>
            <h2
              className="text-3xl sm:text-5xl font-semibold tracking-tight"
              style={{ color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05 }}
            >
              What it actually ships.
            </h2>
            <p className="mt-4 text-base" style={{ color: MUTED, lineHeight: 1.6 }}>
              Six surfaces. Each one does one job, end-to-end, in the same chat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Code2,
                title: "Code Surgeon",
                desc: "Drops Codex Max into your code, finds race conditions, security holes, and perf traps. Returns a patch you can apply.",
              },
              {
                icon: Eye,
                title: "Live Vision",
                desc: "Point the camera. The model watches, reads, transcribes, and talks back in real time.",
              },
              {
                icon: Brain,
                title: "Verified Chat",
                desc: "Every answer is independently fact-checked by a second model. You see the confidence score.",
              },
              {
                icon: Shield,
                title: "Stack Trace Surgeon",
                desc: "Paste an error + your repo URL. It reads the actual source, isolates the root cause, opens a PR.",
              },
              {
                icon: Mic,
                title: "Voice Turbo",
                desc: "Real-time voice. Streaming response. Wake-word optional. Works on the native Android build.",
              },
              {
                icon: Database,
                title: "Deep Research",
                desc: "Twenty-plus sources synthesised by a multi-agent chain. Citations on every claim.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card rounded-lg p-6">
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,107,26,0.12)" }}
                >
                  <Icon className="h-4 w-4" style={{ color: ACCENT }} />
                </div>
                <div className="text-base font-semibold mb-1.5" style={{ color: "#fff" }}>
                  {title}
                </div>
                <div className="text-sm" style={{ color: MUTED, lineHeight: 1.55 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── NO-BS POLICY ─────────── */}
      <section
        id="policy"
        className="py-24 px-5 border-y"
        style={{ borderColor: LINE, background: "rgba(255,255,255,0.015)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: ACCENT }}>
              The No-BS Policy
            </div>
            <h2
              className="text-3xl sm:text-5xl font-semibold tracking-tight"
              style={{ color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05 }}
            >
              Six promises. Each one verifiable.
            </h2>
          </div>

          <div className="space-y-px">
            {[
              ["01", "Per-token honest pricing.", "If your monthly token spend stays under the next tier's threshold, you don't get upgraded. Period."],
              ["02", "No silent throttling.", "Pro and Research tiers have no per-message cap. If we ever add one, you'll see it in the billing console first."],
              ["03", "Every answer is verifiable.", "Citations on factual claims. A second model double-checks. The confidence score is shown — including when it's low."],
              ["04", "Your data stays yours.", "Conversations are not used to train any model. Crisis-support chats are AES-256-GCM encrypted client-side."],
              ["05", "Cancel in one click.", "No retention dark-patterns. No survey wall. The button is in Settings, two clicks from the chat."],
              ["06", "Built in public.", "An 11-year-old shipped this in twelve months. The roadmap is on GitHub. The bug tracker is open."],
            ].map(([n, h, d]) => (
              <div
                key={n}
                className="grid grid-cols-[auto_1fr] gap-6 py-6"
                style={{ borderTop: `1px solid ${LINE}` }}
              >
                <div
                  className="text-sm font-mono tabular-nums"
                  style={{ color: ACCENT }}
                >
                  {n}
                </div>
                <div>
                  <div
                    className="text-lg sm:text-xl font-semibold mb-1.5"
                    style={{ color: "#fff", letterSpacing: "-0.015em" }}
                  >
                    {h}
                  </div>
                  <div className="text-sm sm:text-base" style={{ color: MUTED, lineHeight: 1.55 }}>
                    {d}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── PRICING ─────────── */}
      <section id="pricing" className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: ACCENT }}>
              Pricing
            </div>
            <h2
              className="text-3xl sm:text-5xl font-semibold tracking-tight"
              style={{ color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05 }}
            >
              Three tiers. No fine print.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {/* FREE */}
            <div className="card rounded-lg p-7 flex flex-col">
              <div className="text-sm font-semibold mb-1" style={{ color: TEXT }}>
                Free
              </div>
              <div className="text-xs mb-5" style={{ color: MUTED }}>
                For trying it out
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-semibold tracking-tight" style={{ color: "#fff" }}>
                  $0
                </span>
                <span className="text-sm" style={{ color: MUTED }}>
                  forever
                </span>
              </div>
              <ul className="space-y-2.5 mb-7 flex-1 text-sm" style={{ color: TEXT }}>
                {[
                  "GPT-5.4 Nano routing",
                  "15 queries per day",
                  "Live Vision (camera)",
                  "Document analysis",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={14} className="mt-1 flex-shrink-0" style={{ color: ACCENT }} />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <button
                  className="cta-secondary w-full py-2.5 rounded-md font-medium text-sm"
                  data-testid="button-plan-free"
                >
                  Get started
                </button>
              </Link>
            </div>

            {/* PRO */}
            <div
              className="rounded-lg p-7 flex flex-col relative"
              style={{
                background: INK_HI,
                border: `1px solid ${ACCENT}66`,
                boxShadow: `0 0 0 1px ${ACCENT}1a, 0 20px 60px -20px ${ACCENT}33`,
              }}
            >
              <div
                className="absolute -top-2.5 right-5 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider"
                style={{ background: ACCENT, color: "#fff" }}
              >
                Most picked
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: TEXT }}>
                Pro
              </div>
              <div className="text-xs mb-5" style={{ color: MUTED }}>
                For daily work
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-semibold tracking-tight" style={{ color: "#fff" }}>
                  $6.99
                </span>
                <span className="text-sm" style={{ color: MUTED }}>
                  /month
                </span>
              </div>
              <ul className="space-y-2.5 mb-7 flex-1 text-sm" style={{ color: TEXT }}>
                {[
                  "GPT-5.4 Mini + Claude Sonnet",
                  "Unlimited messages",
                  "Live web search (grounded)",
                  "AI image generation",
                  "Voice Turbo streaming",
                  "Verified-answer badges",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={14} className="mt-1 flex-shrink-0" style={{ color: ACCENT }} />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <button
                  className="cta-primary w-full py-2.5 rounded-md font-medium text-sm"
                  data-testid="button-plan-pro"
                >
                  Start 7-day trial
                </button>
              </Link>
            </div>

            {/* RESEARCH */}
            <div className="card rounded-lg p-7 flex flex-col">
              <div className="text-sm font-semibold mb-1" style={{ color: TEXT }}>
                Research
              </div>
              <div className="text-xs mb-5" style={{ color: MUTED }}>
                For engineers and teams
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-semibold tracking-tight" style={{ color: "#fff" }}>
                  $30
                </span>
                <span className="text-sm" style={{ color: MUTED }}>
                  /month
                </span>
              </div>
              <ul className="space-y-2.5 mb-7 flex-1 text-sm" style={{ color: TEXT }}>
                {[
                  "GPT-5.4 Pro + Codex Max",
                  "Stack Trace Surgeon (auto-PRs)",
                  "Deep Research (20+ sources)",
                  "AI Video Studio (Veo 3.1)",
                  "1M-token long context",
                  "Priority sub-300ms routing",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={14} className="mt-1 flex-shrink-0" style={{ color: ACCENT }} />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <button
                  className="cta-secondary w-full py-2.5 rounded-md font-medium text-sm"
                  data-testid="button-plan-research"
                >
                  Start 7-day trial
                </button>
              </Link>
            </div>
          </div>

          <p className="text-center text-xs mt-8" style={{ color: MUTED }}>
            7-day free trial · No card required · Cancel any time
          </p>
        </div>
      </section>

      {/* ─────────── FINAL CTA ─────────── */}
      <section className="py-24 px-5 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(255,107,26,0.12) 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl sm:text-5xl font-semibold tracking-tight mb-5"
            style={{ color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Stop reading. Ask it something.
          </h2>
          <p className="text-base mb-9" style={{ color: MUTED }}>
            Your first answer comes back before you finish this sentence.
          </p>
          <Link href={ctaHref}>
            <button
              className="cta-primary px-7 py-3.5 rounded-md font-medium text-sm inline-flex items-center gap-2"
              data-testid="button-final-cta"
            >
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer
        className="border-t py-10 px-5"
        style={{ borderColor: LINE, background: "#06060a" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm" style={{ color: MUTED }}>
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: ACCENT }}
            >
              <Zap className="h-3 w-3 text-white" strokeWidth={2.5} />
            </div>
            <span>TurboAnswer · powered by Azure OpenAI</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm" style={{ color: MUTED }}>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/support" className="hover:text-white transition-colors">
              Support
            </Link>
            <Link href="/business" className="hover:text-white transition-colors">
              For business
            </Link>
            <Link href="/beta" className="hover:text-white transition-colors">
              Beta program
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
