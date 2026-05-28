import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, Check, Menu, X, Code2, Eye, Brain, Shield,
  Mic, Database, Zap, Terminal,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const ACCENT = "#ff6b1a";
const ACCENT_HOVER = "#ff8541";
const ACCENT_GLOW = "rgba(255,107,26,0.55)";
const INK = "#06060a";
const INK_HI = "#0d0d14";
const LINE = "rgba(255,255,255,0.08)";
const TEXT = "#e8eaed";
const MUTED = "#8a8f98";
const NEON = "#00d4ff";

/* ─────────── MATRIX RAIN ─────────── */
function MatrixRain() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let cols = 0;
    let drops: number[] = [];
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ$%#@&*<>{}[]/\\|=+";
    const fontSize = 14;

    const resize = () => {
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
      cols = Math.floor(c.width / fontSize);
      drops = new Array(cols).fill(0).map(() => Math.random() * -50);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const draw = () => {
      ctx.fillStyle = "rgba(6,6,10,0.08)";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        // head: bright orange. trail: dim.
        ctx.fillStyle = drops[i] > 0 && Math.random() < 0.04
          ? "rgba(255,140,60,0.85)"
          : "rgba(255,107,26,0.32)";
        ctx.fillText(ch, x, y);
        if (y > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.35 + Math.random() * 0.4;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ opacity: 0.55, zIndex: 0 }}
    />
  );
}

/* ─────────── ORB + STARS ─────────── */
function Orb() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
      <div
        className="absolute rounded-full"
        style={{
          width: "min(1100px, 130vw)",
          height: "min(1100px, 130vw)",
          left: "50%",
          top: "-35%",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,107,26,0.28) 0%, rgba(255,107,26,0.10) 26%, rgba(60,30,120,0.18) 52%, rgba(6,6,10,0) 72%)",
          filter: "blur(22px)",
          animation: "orb 32s linear infinite",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(to bottom, transparent, #06060a)" }} />
    </div>
  );
}

/* ─────────── BOOT TERMINAL ─────────── */
function BootTerminal() {
  const lines = [
    { p: "$", t: "turbo --boot --stack=gpt5.4 --region=azure-eastus" },
    { p: ">", t: "init router ............ ok" },
    { p: ">", t: "warm gpt-5.4-pro ....... 287ms" },
    { p: ">", t: "warm gpt-5.4-mini ...... 142ms" },
    { p: ">", t: "warm codex-max ......... 198ms" },
    { p: ">", t: "fact-check chain ....... online" },
    { p: "$", t: "ready. ask anything._" },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) return;
    const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 350 : 220);
    return () => clearTimeout(id);
  }, [shown, lines.length]);
  return (
    <div
      className="rounded-lg overflow-hidden mx-auto max-w-2xl text-left"
      style={{
        background: "rgba(6,6,10,0.72)",
        border: `1px solid ${LINE}`,
        backdropFilter: "blur(6px)",
        boxShadow: `0 0 0 1px rgba(255,107,26,0.12), 0 20px 60px -20px ${ACCENT_GLOW}`,
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: LINE, background: "rgba(255,255,255,0.02)" }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
        <span className="ml-2 text-[11px] font-mono" style={{ color: MUTED }}>
          turbo@azure-eastus ~ /chat
        </span>
      </div>
      <div
        className="px-4 py-4 font-mono text-[12.5px] sm:text-[13px] leading-[1.7]"
        style={{ color: "#cfd2d6", minHeight: 196 }}
      >
        {lines.slice(0, shown).map((l, i) => (
          <div key={i} style={{ animation: "fadeUp 0.3s ease-out both" }}>
            <span style={{ color: l.p === "$" ? ACCENT : NEON }}>{l.p}</span>{" "}
            <span>{l.t}</span>
            {i === shown - 1 && shown < lines.length && (
              <span className="inline-block w-2 h-3.5 ml-0.5 align-middle" style={{ background: ACCENT, animation: "blink 0.9s steps(2) infinite" }} />
            )}
          </div>
        ))}
      </div>
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
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes glitch1 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0,0); }
          15% { clip-path: inset(20% 0 30% 0); transform: translate(-2px,1px); }
          30% { clip-path: inset(50% 0 5% 0);  transform: translate(2px,-1px); }
          45% { clip-path: inset(10% 0 60% 0); transform: translate(-1px,0); }
          60% { clip-path: inset(70% 0 10% 0); transform: translate(0,0); }
        }
        @keyframes glitch2 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0,0); }
          20% { clip-path: inset(40% 0 30% 0); transform: translate(2px,-2px); }
          50% { clip-path: inset(10% 0 65% 0); transform: translate(-2px,2px); }
          80% { clip-path: inset(60% 0 15% 0); transform: translate(1px,0); }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 ${ACCENT_GLOW}; }
          50% { box-shadow: 0 0 24px 2px ${ACCENT_GLOW}; }
        }
        .fade-up { animation: fadeUp 0.7s ease-out both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.15s; }
        .fade-up-3 { animation-delay: 0.25s; }
        .fade-up-4 { animation-delay: 0.35s; }
        .fade-up-5 { animation-delay: 0.5s; }

        .glitch { position: relative; display: inline-block; }
        .glitch::before, .glitch::after {
          content: attr(data-text);
          position: absolute; left: 0; top: 0; width: 100%;
          pointer-events: none;
        }
        .glitch::before { color: ${NEON}; animation: glitch1 3.2s infinite linear alternate-reverse; mix-blend-mode: screen; opacity: 0.65; }
        .glitch::after  { color: ${ACCENT}; animation: glitch2 2.6s infinite linear alternate-reverse; mix-blend-mode: screen; opacity: 0.7; }

        .scanlines::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px);
          mix-blend-mode: overlay; z-index: 2;
        }
        .scanlines::after {
          content: ""; position: absolute; left: 0; right: 0; top: 0; height: 120px;
          background: linear-gradient(to bottom, rgba(255,107,26,0.06), transparent);
          animation: scan 7s linear infinite; pointer-events: none; z-index: 2;
        }

        .cta-primary {
          background: ${ACCENT}; color: #fff;
          transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.2s ease;
          box-shadow: 0 0 0 1px rgba(255,107,26,0.4), 0 8px 24px -8px ${ACCENT_GLOW};
        }
        .cta-primary:hover { background: ${ACCENT_HOVER}; box-shadow: 0 0 0 1px rgba(255,107,26,0.6), 0 12px 32px -8px ${ACCENT_GLOW}; transform: translateY(-1px); }
        .cta-secondary {
          background: rgba(255,255,255,0.04); color: #fff;
          border: 1px solid rgba(255,255,255,0.14);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .cta-secondary:hover { background: rgba(255,255,255,0.08); border-color: ${ACCENT}; color: ${ACCENT}; }
        .card {
          background: ${INK_HI};
          border: 1px solid ${LINE};
          transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.25s ease;
        }
        .card:hover {
          border-color: rgba(255,107,26,0.4);
          box-shadow: 0 0 0 1px rgba(255,107,26,0.18), 0 12px 40px -16px ${ACCENT_GLOW};
          transform: translateY(-2px);
        }
        .mono { font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace; }
        .live-dot {
          width: 6px; height: 6px; border-radius: 999px; background: #3ddc84;
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>

      {/* ─────────── TOP STRIP ─────────── */}
      <div
        className="w-full text-center text-xs py-2 px-4 mono"
        style={{ background: "#000", color: MUTED, borderBottom: `1px solid ${LINE}` }}
      >
        <span style={{ color: ACCENT }}>$</span> built by an 11-year-old · shipping from a bedroom · live on azure ·{" "}
        <Link href={ctaHref}>
          <span className="underline cursor-pointer" style={{ color: TEXT }}>try it →</span>
        </Link>
      </div>

      {/* ─────────── NAV ─────────── */}
      <nav
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: "rgba(6,6,10,0.78)", borderBottom: `1px solid ${LINE}` }}
      >
        <div className="max-w-7xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: ACCENT, boxShadow: `0 0 12px ${ACCENT_GLOW}` }}
              >
                <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-base font-semibold tracking-tight" style={{ color: TEXT }}>
                TurboAnswer
              </span>
              <span className="hidden sm:inline-block text-[10px] mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,107,26,0.1)", color: ACCENT, border: `1px solid ${ACCENT}33` }}>
                v5.4
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm" style={{ color: MUTED }}>
            <a href="#capabilities" className="hover:text-white transition-colors">Capabilities</a>
            <a href="#stack" className="hover:text-white transition-colors">Stack</a>
            <a href="#policy" className="hover:text-white transition-colors">No-BS</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href={ctaHref}>
              <button className="cta-primary px-4 py-2 rounded-md text-sm font-medium" data-testid="button-nav-cta">
                {ctaLabel}
              </button>
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ color: TEXT }}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-5 py-4 space-y-3 border-t" style={{ borderColor: LINE, background: INK }}>
            {[
              ["Capabilities", "#capabilities"],
              ["Stack", "#stack"],
              ["No-BS", "#policy"],
              ["Pricing", "#pricing"],
            ].map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMobileMenuOpen(false)} className="block text-sm py-1" style={{ color: TEXT }}>
                {label}
              </a>
            ))}
            <Link href={ctaHref}>
              <button className="cta-primary w-full py-2.5 rounded-md text-sm font-medium">{ctaLabel}</button>
            </Link>
          </div>
        )}
      </nav>

      {/* ─────────── HERO ─────────── */}
      <section className="relative scanlines" style={{ background: "radial-gradient(ellipse at top, rgba(255,107,26,0.04), transparent 60%)" }}>
        <MatrixRain />
        <Orb />
        <div className="relative max-w-5xl mx-auto px-5 pt-16 pb-24 sm:pt-24 sm:pb-32 text-center" style={{ zIndex: 3 }}>
          <div
            className="fade-up fade-up-1 inline-flex items-center gap-2 px-3 py-1 mb-7 rounded-full text-xs mono"
            style={{ border: `1px solid ${LINE}`, background: "rgba(255,255,255,0.03)", color: MUTED }}
          >
            <span className="live-dot" />
            <span>azure-eastus · 99.97% uptime · 287ms p50</span>
          </div>

          <h1
            className="fade-up fade-up-2 font-semibold tracking-tight mb-6"
            style={{
              fontSize: "clamp(2.6rem, 6.8vw, 5.5rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: "#fff",
            }}
          >
            Real answers.
            <br />
            <span className="glitch" data-text="Zero theater." style={{ color: ACCENT, textShadow: `0 0 24px ${ACCENT_GLOW}` }}>
              Zero theater.
            </span>
          </h1>

          <p
            className="fade-up fade-up-3 max-w-2xl mx-auto mb-9 text-base sm:text-lg"
            style={{ color: MUTED, lineHeight: 1.6 }}
          >
            One model family, tuned to death. GPT-5.4 routed through Azure with a
            fact-check chain bolted on. <span style={{ color: TEXT }}>Sub-300ms.</span> No upsells,
            no throttling, no "as a large language model" excuses.
          </p>

          <div className="fade-up fade-up-4 flex flex-col sm:flex-row gap-3 justify-center items-center mb-10">
            <Link href={ctaHref}>
              <button
                className="cta-primary px-6 py-3 rounded-md font-medium text-sm inline-flex items-center gap-2"
                data-testid="button-hero-primary"
              >
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <a href="#capabilities">
              <button className="cta-secondary px-6 py-3 rounded-md font-medium text-sm inline-flex items-center gap-2">
                <Terminal className="h-4 w-4" /> See what it does
              </button>
            </a>
          </div>

          <div className="fade-up fade-up-5">
            <BootTerminal />
          </div>

          <div
            className="fade-up fade-up-5 flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-xs mono"
            style={{ color: MUTED }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Check size={13} style={{ color: ACCENT }} /> no credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={13} style={{ color: ACCENT }} /> no daily caps on pro
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={13} style={{ color: ACCENT }} /> cancel in one click
            </span>
          </div>
        </div>
      </section>

      {/* ─────────── STACK STRIP ─────────── */}
      <section
        id="stack"
        className="border-y relative"
        style={{ borderColor: LINE, background: "rgba(255,255,255,0.015)" }}
      >
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-[0.18em] mb-3 mono" style={{ color: ACCENT }}>
              ─── the stack ───
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight"
              style={{ color: "#fff", letterSpacing: "-0.02em" }}
            >
              Four blades. One handle. <span style={{ color: ACCENT }}>Cut clean.</span>
            </h2>
            <p className="mt-3 text-sm max-w-2xl mx-auto" style={{ color: MUTED }}>
              The GPT-5.4 family, billed direct through Azure. No middleman, no markup,
              no quota games.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "GPT-5.4 Nano", note: "free tier · 287ms median · routing brain" },
              { name: "GPT-5.4 Mini", note: "pro daily driver · adaptive throttle" },
              { name: "GPT-5.4 Pro", note: "research tier · 1M context · the heavy" },
              { name: "GPT-5.1 Codex Max", note: "code surgeon · refactor & PR" },
            ].map((m) => (
              <div key={m.name} className="card rounded-lg p-5">
                <div className="text-[10px] mono mb-2" style={{ color: ACCENT }}>
                  ▸ active
                </div>
                <div className="text-sm font-semibold mb-1.5 mono" style={{ color: "#fff" }}>
                  {m.name}
                </div>
                <div className="text-xs" style={{ color: MUTED, lineHeight: 1.5 }}>
                  {m.note}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { v: "<300ms", l: "median response" },
              { v: "99.97%", l: "uptime, 90d" },
              { v: "$0", l: "hidden upsells" },
              { v: "20+", l: "sources / deep research" },
            ].map((s, i) => (
              <div key={i}>
                <div
                  className="text-2xl sm:text-3xl font-semibold tracking-tight mono"
                  style={{ color: "#fff", letterSpacing: "-0.02em" }}
                >
                  {s.v}
                </div>
                <div className="text-xs mt-1 mono" style={{ color: MUTED }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CAPABILITIES ─────────── */}
      <section id="capabilities" className="py-24 px-5 relative">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 max-w-2xl">
            <div className="text-xs uppercase tracking-[0.18em] mb-3 mono" style={{ color: ACCENT }}>
              ─── what it actually does ───
            </div>
            <h2
              className="text-3xl sm:text-5xl font-semibold tracking-tight"
              style={{ color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05 }}
            >
              Six surfaces. <span style={{ color: ACCENT }}>Zero filler.</span>
            </h2>
            <p className="mt-4 text-base mono" style={{ color: MUTED, lineHeight: 1.6 }}>
              <span style={{ color: NEON }}>{">"}</span> each one does one job, end-to-end,
              in the same chat. no tab juggling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Code2, title: "Code Surgeon", desc: "Drops Codex Max into your codebase, hunts race conditions, security holes, and perf traps. Ships a patch you can apply with one click." },
              { icon: Eye, title: "Live Vision", desc: "Point the camera. The model watches, reads, transcribes, and talks back in real time. Native on Android." },
              { icon: Brain, title: "Verified Chat", desc: "Every factual claim gets a confidence score. A second pass independently grades the answer. We show low scores too." },
              { icon: Shield, title: "Stack Trace Surgeon", desc: "Paste an error + your repo URL. It reads the actual source, isolates root cause, opens a PR. No screenshots required." },
              { icon: Mic, title: "Voice Turbo", desc: "Real-time voice. Streaming token-by-token. Wake-word optional. Sounds like a person, not a kiosk." },
              { icon: Database, title: "Deep Research", desc: "Twenty-plus sources synthesised through a multi-agent chain. Citations on every claim. Disagrees with itself in public." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card rounded-lg p-6">
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,107,26,0.12)", border: `1px solid ${ACCENT}33` }}
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
        className="py-24 px-5 border-y relative"
        style={{ borderColor: LINE, background: "rgba(255,255,255,0.015)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="text-xs uppercase tracking-[0.18em] mb-3 mono" style={{ color: ACCENT }}>
              ─── the no-bs policy ───
            </div>
            <h2
              className="text-3xl sm:text-5xl font-semibold tracking-tight"
              style={{ color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05 }}
            >
              Six promises. <span style={{ color: ACCENT }}>Each one verifiable.</span>
            </h2>
          </div>

          <div className="space-y-px">
            {[
              ["01", "Per-token honest pricing.", "If your monthly token spend stays under the next tier's threshold, you don't get upgraded. Period."],
              ["02", "No silent throttling.", "Pro and Research tiers have no per-message cap. If we ever add one, you'll see it in the billing console first."],
              ["03", "Every answer is verifiable.", "Citations on factual claims. A second pass double-checks. The confidence score is shown — including when it's low."],
              ["04", "Your data stays yours.", "Conversations are not used to train any model. Crisis-support chats are AES-256-GCM encrypted client-side."],
              ["05", "Cancel in one click.", "No retention dark-patterns. No survey wall. The button is in Settings, two clicks from the chat."],
              ["06", "Built in public.", "An 11-year-old shipped this in twelve months. The roadmap is on GitHub. The bug tracker is open."],
            ].map(([n, h, d]) => (
              <div key={n} className="grid grid-cols-[auto_1fr] gap-6 py-6" style={{ borderTop: `1px solid ${LINE}` }}>
                <div className="text-sm font-mono tabular-nums" style={{ color: ACCENT }}>
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
            <div className="text-xs uppercase tracking-[0.18em] mb-3 mono" style={{ color: ACCENT }}>
              ─── pricing ───
            </div>
            <h2
              className="text-3xl sm:text-5xl font-semibold tracking-tight"
              style={{ color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05 }}
            >
              Three tiers. <span style={{ color: ACCENT }}>No fine print.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {/* FREE */}
            <div className="card rounded-lg p-7 flex flex-col">
              <div className="text-sm font-semibold mb-1" style={{ color: TEXT }}>Free</div>
              <div className="text-xs mb-5" style={{ color: MUTED }}>For trying it out</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-semibold tracking-tight" style={{ color: "#fff" }}>$0</span>
                <span className="text-sm" style={{ color: MUTED }}>forever</span>
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
                <button className="cta-secondary w-full py-2.5 rounded-md font-medium text-sm" data-testid="button-plan-free">
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
                boxShadow: `0 0 0 1px ${ACCENT}1a, 0 20px 60px -20px ${ACCENT}55`,
              }}
            >
              <div
                className="absolute -top-2.5 right-5 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider mono"
                style={{ background: ACCENT, color: "#fff", boxShadow: `0 0 12px ${ACCENT_GLOW}` }}
              >
                most picked
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: TEXT }}>Pro</div>
              <div className="text-xs mb-5" style={{ color: MUTED }}>For daily work</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-semibold tracking-tight" style={{ color: "#fff" }}>$6.99</span>
                <span className="text-sm" style={{ color: MUTED }}>/month</span>
              </div>
              <ul className="space-y-2.5 mb-7 flex-1 text-sm" style={{ color: TEXT }}>
                {[
                  "GPT-5.4 Mini (adaptive throttle)",
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
                <button className="cta-primary w-full py-2.5 rounded-md font-medium text-sm" data-testid="button-plan-pro">
                  Start 7-day trial
                </button>
              </Link>
            </div>

            {/* RESEARCH */}
            <div className="card rounded-lg p-7 flex flex-col">
              <div className="text-sm font-semibold mb-1" style={{ color: TEXT }}>Research</div>
              <div className="text-xs mb-5" style={{ color: MUTED }}>For engineers and teams</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-semibold tracking-tight" style={{ color: "#fff" }}>$30</span>
                <span className="text-sm" style={{ color: MUTED }}>/month</span>
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
                <button className="cta-secondary w-full py-2.5 rounded-md font-medium text-sm" data-testid="button-plan-research">
                  Start 7-day trial
                </button>
              </Link>
            </div>
          </div>

          <p className="text-center text-xs mt-8 mono" style={{ color: MUTED }}>
            7-day free trial · no card required · cancel any time
          </p>
        </div>
      </section>

      {/* ─────────── FINAL CTA ─────────── */}
      <section className="py-24 px-5 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,107,26,0.18) 0%, transparent 60%)" }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="mono text-xs mb-5" style={{ color: ACCENT }}>
            ─── $ ./turbo --ask "anything" ───
          </div>
          <h2
            className="text-3xl sm:text-5xl font-semibold tracking-tight mb-5"
            style={{ color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Stop reading. <span style={{ color: ACCENT }}>Ask it something.</span>
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
      <footer className="border-t py-10 px-5" style={{ borderColor: LINE, background: "#040408" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm mono" style={{ color: MUTED }}>
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: ACCENT, boxShadow: `0 0 8px ${ACCENT_GLOW}` }}
            >
              <Zap className="h-3 w-3 text-white" strokeWidth={2.5} />
            </div>
            <span>turboanswer · azure openai · azure eastus</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm" style={{ color: MUTED }}>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            <Link href="/business" className="hover:text-white transition-colors">For business</Link>
            <Link href="/beta" className="hover:text-white transition-colors">Beta program</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
