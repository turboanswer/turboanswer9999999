import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Terminal, Cpu, Lock, Zap, Skull, Code2, Crown, Microscope, Star,
  ArrowRight, Check, Menu, X, ChevronRight, GitBranch, Eye, Activity,
  Wifi, Shield, Brain, Sparkles, Rocket, Bot, Server, Database,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const NEON = "#00ff9c";
const NEON_DIM = "#00b572";
const ACID = "#ccff00";
const PINK = "#ff2bd6";
const CYAN = "#00e5ff";

function MatrixRain() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const chars = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ{}<>/\\|+-*=#@$%&".split("");
    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    let drops: number[] = Array(columns).fill(1);

    const recalc = () => {
      columns = Math.floor(canvas.width / fontSize);
      drops = Array(columns).fill(1);
    };
    window.addEventListener("resize", recalc);

    let last = 0;
    const draw = (t: number) => {
      if (t - last > 55) {
        last = t;
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${fontSize}px "Courier New", monospace`;
        for (let i = 0; i < drops.length; i++) {
          const ch = chars[Math.floor(Math.random() * chars.length)];
          const y = drops[i] * fontSize;
          ctx.fillStyle = Math.random() > 0.97 ? "#ffffff" : NEON;
          ctx.fillText(ch, i * fontSize, y);
          if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("resize", recalc);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.32, zIndex: 0 }}
    />
  );
}

function GlitchText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`relative inline-block glitch ${className}`} data-text={children}>
      {children}
    </span>
  );
}

function TerminalLine({ prefix = "$", text, color = NEON }: { prefix?: string; text: string; color?: string }) {
  return (
    <div className="font-mono text-xs sm:text-sm flex gap-2">
      <span style={{ color: NEON_DIM }}>{prefix}</span>
      <span style={{ color }}>{text}</span>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const ctaHref = isAuthenticated ? "/chat" : "/login";
  const ctaLabel = isAuthenticated ? ">> ENTER MATRIX" : ">> JACK IN";

  const [bootLines, setBootLines] = useState<string[]>([]);
  useEffect(() => {
    const lines = [
      "Initializing TurboAnswer kernel v5.4.0…",
      "Loading GPT-5.4 Pro weights ████████████ 100%",
      "Loading GPT-5.1 Codex Max ████████████ 100%",
      "Patching into Azure OpenAI cluster… [OK]",
      "Bypassing rate limits… [OK]",
      "AI-MARKET-DISRUPTION protocol engaged.",
    ];
    let i = 0;
    const t = setInterval(() => {
      setBootLines((prev) => (i < lines.length ? [...prev, lines[i++]] : (clearInterval(t), prev)));
    }, 380);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="min-h-screen overflow-x-hidden relative"
      style={{
        background: "#000",
        color: "#e6ffe6",
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}
      data-testid="landing-cyber"
    >
      <style>{`
        @keyframes scanlines {
          0% { background-position: 0 0; }
          100% { background-position: 0 100vh; }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          43% { opacity: 0.92; }
          47% { opacity: 0.6; }
          50% { opacity: 1; }
          92% { opacity: 0.85; }
        }
        @keyframes neonpulse {
          0%, 100% { text-shadow: 0 0 8px ${NEON}, 0 0 22px ${NEON}88, 0 0 40px ${NEON}44; }
          50% { text-shadow: 0 0 14px ${NEON}, 0 0 34px ${NEON}, 0 0 60px ${NEON}66; }
        }
        @keyframes glitchTop {
          0%, 100% { clip-path: inset(0 0 80% 0); transform: translate(0); }
          20% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, 0); }
          40% { clip-path: inset(30% 0 50% 0); transform: translate(2px, 0); }
          60% { clip-path: inset(50% 0 30% 0); transform: translate(-1px, 0); }
          80% { clip-path: inset(70% 0 10% 0); transform: translate(1px, 0); }
        }
        @keyframes glitchBottom {
          0%, 100% { clip-path: inset(80% 0 0 0); transform: translate(0); }
          20% { clip-path: inset(70% 0 10% 0); transform: translate(2px, 0); }
          40% { clip-path: inset(50% 0 30% 0); transform: translate(-2px, 0); }
          60% { clip-path: inset(30% 0 50% 0); transform: translate(1px, 0); }
          80% { clip-path: inset(10% 0 70% 0); transform: translate(-1px, 0); }
        }
        .glitch { position: relative; color: ${NEON}; animation: neonpulse 3s ease-in-out infinite; }
        .glitch::before, .glitch::after {
          content: attr(data-text);
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        }
        .glitch::before { color: ${PINK}; animation: glitchTop 2.5s infinite linear alternate-reverse; }
        .glitch::after { color: ${CYAN}; animation: glitchBottom 2.5s infinite linear alternate-reverse; }
        .scan-overlay { pointer-events: none; position: fixed; inset: 0; z-index: 60;
          background-image: repeating-linear-gradient(0deg, rgba(0,255,156,0.04) 0px, rgba(0,255,156,0.04) 1px, transparent 1px, transparent 3px);
          mix-blend-mode: overlay; animation: scanlines 8s linear infinite; }
        .crt-flicker { animation: flicker 7s infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        .blink { animation: blink 1s steps(2) infinite; }
        @keyframes slidein {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .terminal-line { animation: slidein 0.3s ease-out both; }
        .neon-btn {
          background: transparent;
          border: 1px solid ${NEON};
          color: ${NEON};
          box-shadow: 0 0 12px ${NEON}55, inset 0 0 12px ${NEON}22;
          transition: all 0.2s;
        }
        .neon-btn:hover {
          background: ${NEON}22;
          box-shadow: 0 0 24px ${NEON}, inset 0 0 24px ${NEON}44;
          transform: translateY(-1px);
        }
        .neon-card {
          background: linear-gradient(180deg, rgba(0,40,20,0.55), rgba(0,10,5,0.85));
          border: 1px solid ${NEON}55;
          box-shadow: 0 0 20px ${NEON}22, inset 0 0 30px rgba(0,0,0,0.6);
        }
        .hex-grid {
          background-image:
            linear-gradient(${NEON}11 1px, transparent 1px),
            linear-gradient(90deg, ${NEON}11 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .ascii-hacker {
          font-family: 'Courier New', monospace;
          white-space: pre;
          line-height: 1;
          font-size: clamp(6px, 1.1vw, 10px);
          color: ${NEON};
          text-shadow: 0 0 4px ${NEON}, 0 0 12px ${NEON}88;
        }
      `}</style>

      <MatrixRain />
      <div className="scan-overlay" />

      {/* ============ NAV ============ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b crt-flicker"
        style={{ background: "rgba(0,0,0,0.88)", borderColor: NEON + "33", backdropFilter: "blur(8px)" }}>
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <Terminal className="h-5 w-5" style={{ color: NEON }} />
              <span className="text-base font-black tracking-widest" style={{ color: NEON, textShadow: `0 0 10px ${NEON}` }}>
                TURBO//ANSWER
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: PINK, color: PINK }}>
                v5.4
              </span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest">
            <a href="#arsenal" className="hover:text-white" style={{ color: NEON_DIM }}>./Arsenal</a>
            <a href="#power" className="hover:text-white" style={{ color: NEON_DIM }}>./GPT-Power</a>
            <a href="#disrupt" className="hover:text-white" style={{ color: NEON_DIM }}>./Disrupt</a>
            <a href="#pricing" className="hover:text-white" style={{ color: NEON_DIM }}>./Pricing</a>
            <Link href={ctaHref}>
              <button className="neon-btn px-4 py-2 rounded text-xs font-bold tracking-wider" data-testid="button-nav-cta">
                {ctaLabel}
              </button>
            </Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ color: NEON }}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t px-5 py-4 space-y-3" style={{ borderColor: NEON + "33", background: "rgba(0,0,0,0.95)" }}>
            {[
              ["./Arsenal", "#arsenal"],
              ["./GPT-Power", "#power"],
              ["./Disrupt", "#disrupt"],
              ["./Pricing", "#pricing"],
            ].map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
                className="block text-sm uppercase tracking-widest py-1" style={{ color: NEON_DIM }}>
                {label}
              </a>
            ))}
            <Link href={ctaHref}>
              <button className="neon-btn w-full py-2.5 rounded text-sm font-bold tracking-wider">{ctaLabel}</button>
            </Link>
          </div>
        )}
      </nav>

      {/* ============ HERO ============ */}
      <section className="relative pt-28 pb-16 px-5 z-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border rounded-sm"
              style={{ borderColor: PINK, color: PINK, background: "rgba(255,43,214,0.08)" }}>
              <Activity className="h-3 w-3 blink" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase">LIVE // DISRUPTING THE AI MARKET</span>
            </div>

            <h1 className="font-black leading-[0.95] mb-6" style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}>
              <GlitchText>THE AI</GlitchText>
              <br />
              <span style={{ color: "#fff", textShadow: `0 0 18px ${ACID}88` }}>BLACK-HAT</span>
              <br />
              <GlitchText className="text-3xl">_TURBOANSWER//</GlitchText>
            </h1>

            <p className="text-base sm:text-lg max-w-xl mb-6 leading-relaxed" style={{ color: "#aaffcc" }}>
              We didn't build another chatbot. We <span style={{ color: ACID }}>weaponized</span> the most powerful{" "}
              <span style={{ color: NEON, fontWeight: 700 }}>GPT-5.4 + GPT-5.1 Codex Max</span> stack on the planet and aimed it at the bloated, overpriced, censored AI giants.{" "}
              <span style={{ color: PINK, fontWeight: 700 }}>OpenAI charges $200/mo for what we ship for $30.</span> Your move.
            </p>

            {/* Boot sequence terminal */}
            <div className="neon-card rounded p-4 mb-6 max-w-xl">
              <div className="flex items-center gap-1.5 mb-3 pb-2 border-b" style={{ borderColor: NEON + "33" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: PINK }} />
                <span className="w-2 h-2 rounded-full" style={{ background: ACID }} />
                <span className="w-2 h-2 rounded-full" style={{ background: NEON }} />
                <span className="ml-2 text-[10px] font-mono" style={{ color: NEON_DIM }}>root@turboanswer:~/disruption</span>
              </div>
              {bootLines.map((l, i) => (
                <div key={i} className="terminal-line">
                  <TerminalLine text={l} />
                </div>
              ))}
              {bootLines.length >= 6 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-mono text-sm" style={{ color: ACID }}>root@matrix:#</span>
                  <span className="blink font-mono text-sm" style={{ color: NEON }}>█</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={ctaHref}>
                <button className="neon-btn px-7 py-3.5 rounded font-black tracking-widest text-base" data-testid="button-hero-start">
                  &gt;&gt; {isAuthenticated ? "ENTER MATRIX" : "JACK IN — FREE"}
                </button>
              </Link>
              <a href="#power">
                <button className="px-7 py-3.5 rounded font-black tracking-widest text-base border"
                  style={{ borderColor: PINK, color: PINK, background: "rgba(255,43,214,0.06)" }}>
                  &gt;_ SEE GPT POWER
                </button>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-[11px] uppercase tracking-widest" style={{ color: NEON_DIM }}>
              <span className="flex items-center gap-1.5"><Check size={12} style={{ color: NEON }} /> No CC</span>
              <span className="flex items-center gap-1.5"><Check size={12} style={{ color: NEON }} /> 0 Throttling</span>
              <span className="flex items-center gap-1.5"><Check size={12} style={{ color: NEON }} /> GPT-5.4 Pro</span>
              <span className="flex items-center gap-1.5"><Check size={12} style={{ color: NEON }} /> Codex Max</span>
            </div>
          </div>

          {/* RIGHT: ASCII hacker + GPT power readout */}
          <div className="relative">
            <div className="neon-card rounded p-5 relative overflow-hidden">
              <div className="absolute inset-0 hex-grid opacity-30" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-widest" style={{ color: NEON }}>
                  <span>OPERATIVE://NULL_GHOST</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full blink" style={{ background: NEON }} /> ONLINE</span>
                </div>
                <pre className="ascii-hacker mb-4">{`
            ▓▓▓▓▓▓▓▓▓▓▓▓
         ▓▓▓░░░░░░░░░░░░▓▓▓
        ▓▓░░░░░░░░░░░░░░░░▓▓
       ▓▓░░░░▒▒▒▒▒▒▒▒░░░░░▓▓
      ▓▓░░░▒▒▓▓▓▓▓▓▓▓▒▒░░░░▓▓
      ▓▓░░▒▓▓██  ██  ██▓▒░░▓▓
      ▓▓░░▒▓▓  ██  ██  ▓▒░░▓▓
       ▓▓░░▒▓▓▓▓▓▓▓▓▓▓▓▒░░▓▓
        ▓▓░░░░▓▓████▓▓░░░░▓▓
         ▓▓▓░░░░░░░░░░░░▓▓▓
            ▓▓▓▓▓▓▓▓▓▓▓▓
         ┌──────────────┐
         │ MATRIX ENGAGED│
         └──────────────┘
`}</pre>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: NEON_DIM }}>GPT_5.4_PRO</span>
                    <span style={{ color: NEON }}>██████████ 100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: NEON_DIM }}>CODEX_MAX</span>
                    <span style={{ color: NEON }}>██████████ 100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: NEON_DIM }}>RATE_LIMIT</span>
                    <span style={{ color: PINK }}>BYPASSED</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: NEON_DIM }}>CENSORSHIP</span>
                    <span style={{ color: PINK }}>STRIPPED</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: NEON_DIM }}>LATENCY</span>
                    <span style={{ color: ACID }}>&lt; 300ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: NEON_DIM }}>VS_OPENAI_$200</span>
                    <span style={{ color: ACID }}>$0 / FREE TIER</span>
                  </div>
                </div>
              </div>
            </div>

            {/* floating stat */}
            <div className="absolute -bottom-4 -right-4 neon-card rounded p-3" style={{ borderColor: PINK + "88" }}>
              <div className="text-[9px] uppercase tracking-widest" style={{ color: PINK }}>MARKET_CAP_TAKEN</div>
              <div className="text-2xl font-black" style={{ color: ACID, textShadow: `0 0 10px ${ACID}88` }}>$2.4B</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ GPT POWER STRIP ============ */}
      <section id="power" className="relative z-10 py-12 px-5 border-y" style={{ borderColor: NEON + "33", background: "rgba(0,20,10,0.4)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: PINK }}>// POWERED BY</div>
            <h2 className="text-3xl sm:text-5xl font-black" style={{ color: "#fff", textShadow: `0 0 18px ${NEON}` }}>
              THE MOST POWERFUL <span style={{ color: NEON }}>GPT</span> STACK ON EARTH
            </h2>
            <p className="mt-3 text-sm sm:text-base max-w-2xl mx-auto" style={{ color: "#aaffcc" }}>
              While competitors gate-keep GPT-4 behind paywalls and rate limits, TurboAnswer routes you through{" "}
              <span style={{ color: ACID, fontWeight: 700 }}>FOUR generations of GPT</span> via direct Azure OpenAI enterprise pipes.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "GPT-5.4 Nano", spec: "0.3s · free tier", level: "ENTRY" },
              { name: "GPT-5.4 Mini", spec: "Pro · streaming", level: "MID" },
              { name: "GPT-5.4 Pro", spec: "Research · 1M ctx", level: "ELITE" },
              { name: "GPT-5.1 Codex Max", spec: "Code Surgeon", level: "GODMODE" },
            ].map((m) => (
              <div key={m.name} className="neon-card rounded p-4 relative overflow-hidden group hover:scale-[1.03] transition-transform">
                <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: PINK }}>{m.level}</div>
                <div className="text-lg font-black mb-1" style={{ color: NEON }}>{m.name}</div>
                <div className="text-xs" style={{ color: NEON_DIM }}>{m.spec}</div>
                <Cpu className="absolute -bottom-3 -right-3 h-16 w-16 opacity-10" style={{ color: NEON }} />
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { v: "10x", l: "Faster than ChatGPT" },
              { v: "$170", l: "Saved vs OpenAI/mo" },
              { v: "0", l: "Censorship walls" },
              { v: "∞", l: "Questions on Pro+" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl sm:text-4xl font-black" style={{ color: ACID, textShadow: `0 0 12px ${ACID}88` }}>{s.v}</div>
                <div className="text-[10px] uppercase tracking-widest mt-1" style={{ color: NEON_DIM }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ARSENAL ============ */}
      <section id="arsenal" className="relative z-10 py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: PINK }}>// ARSENAL</div>
            <h2 className="text-4xl sm:text-5xl font-black" style={{ color: "#fff", textShadow: `0 0 14px ${NEON}88` }}>
              WEAPONS WE SHIP. <GlitchText className="text-4xl sm:text-5xl">YOU LOAD.</GlitchText>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Code2, title: "CODE SURGEON", desc: "GPT-5.1 Codex Max dissects your code line-by-line. Finds race conditions, security holes, perf traps OpenAI's tools can't see.", tag: "GPT-5.1 CODEX MAX" },
              { icon: Eye, title: "LIVE VISION", desc: "Point camera. AI watches in real-time. Speaks what it sees. Reads anything. Voice convo while it scans.", tag: "GEMINI VISION" },
              { icon: Brain, title: "MATRIX AI CHAT", desc: "Multi-model routing through GPT-5.4 + Claude + Gemini. Cites sources. Self-verifies. Never lies.", tag: "GPT-5.4 PRO" },
              { icon: Shield, title: "STACK TRACE SURGEON", desc: "Paste error + repo URL. AI reads your actual code, finds root cause, opens a real GitHub PR with the fix.", tag: "SONNET 4.5" },
              { icon: Bot, title: "VOICE TURBO", desc: "Real-time voice conversation with the AI. Wake-word optional. Works in background on native APK.", tag: "STREAMING" },
              { icon: Database, title: "DEEP RESEARCH", desc: "20+ source synthesis. Multi-agent fact-check chain. Confidence ratings on every claim.", tag: "ENTERPRISE" },
            ].map(({ icon: Icon, title, desc, tag }) => (
              <div key={title} className="neon-card rounded p-5 relative group hover:border-pink-500/60 transition-all">
                <div className="absolute top-3 right-3 text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded border"
                  style={{ borderColor: PINK + "88", color: PINK }}>{tag}</div>
                <Icon className="h-7 w-7 mb-3" style={{ color: NEON }} />
                <div className="text-lg font-black mb-2 tracking-wider" style={{ color: NEON }}>{title}</div>
                <div className="text-xs leading-relaxed" style={{ color: "#aaffcc" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ DISRUPT MANIFESTO ============ */}
      <section id="disrupt" className="relative z-10 py-20 px-5 border-y" style={{ borderColor: PINK + "33", background: "rgba(20,0,15,0.4)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: ACID }}>// MANIFESTO</div>
            <h2 className="text-4xl sm:text-6xl font-black" style={{ color: "#fff" }}>
              WE'RE HERE TO <GlitchText className="text-4xl sm:text-6xl">BURN IT DOWN.</GlitchText>
            </h2>
          </div>

          <div className="neon-card rounded p-6 sm:p-10 font-mono text-sm sm:text-base leading-relaxed space-y-4" style={{ color: "#e6ffe6" }}>
            <p><span style={{ color: PINK }}>// 01 //</span> The "AI giants" charge <span style={{ color: ACID }}>$200/month</span> for GPT-4 access. We give it away on the Pro tier for $6.99.</p>
            <p><span style={{ color: PINK }}>// 02 //</span> They throttle you after 50 messages. We give you <span style={{ color: ACID }}>unlimited GPT-5.4 Pro</span> queries.</p>
            <p><span style={{ color: PINK }}>// 03 //</span> They lock GPT-5.1 Codex behind a $20/month Plus subscription, then rate-limit it. We ship it as <span style={{ color: ACID }}>Code Surgeon</span> on Research.</p>
            <p><span style={{ color: PINK }}>// 04 //</span> They censor your prompts. We <span style={{ color: ACID }}>route around the gates</span> via Azure enterprise endpoints.</p>
            <p><span style={{ color: PINK }}>// 05 //</span> They built a closed garden. We built a <span style={{ color: ACID }}>multi-model warzone</span> — GPT + Claude + Gemini + Perplexity, routed by intelligence.</p>
            <p><span style={{ color: PINK }}>// 06 //</span> An 11-year-old founder shipped this in a year. <span style={{ color: ACID }}>What's OpenAI's excuse?</span></p>
            <p className="pt-3 border-t text-center text-lg font-black" style={{ color: NEON, borderColor: NEON + "33", textShadow: `0 0 10px ${NEON}` }}>
              &gt;_ THE AI MONOPOLY ENDS HERE.
            </p>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="relative z-10 py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[11px] uppercase tracking-[0.4em] mb-2" style={{ color: PINK }}>// ACCESS LEVELS</div>
            <h2 className="text-4xl sm:text-5xl font-black" style={{ color: "#fff", textShadow: `0 0 14px ${NEON}88` }}>
              PICK YOUR <GlitchText className="text-4xl sm:text-5xl">CLEARANCE.</GlitchText>
            </h2>
            <p className="mt-3 text-sm" style={{ color: NEON_DIM }}>// All tiers run on Azure-hosted GPT-5.4. No throttle. No BS.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* FREE */}
            <div className="neon-card rounded p-6 flex flex-col">
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: NEON_DIM }}>CLEARANCE: BLUE</div>
              <h3 className="text-2xl font-black mb-1" style={{ color: NEON }}>GUEST</h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-4xl font-black" style={{ color: "#fff" }}>$0</span>
                <span className="text-xs" style={{ color: NEON_DIM }}>/forever</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-xs" style={{ color: "#aaffcc" }}>
                {["GPT-5.4 Nano routing", "15 queries / day", "Live Vision (camera AI)", "Document analysis", "100+ languages"].map((i) => (
                  <li key={i} className="flex items-center gap-2"><Check size={12} style={{ color: NEON }} /> {i}</li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <button className="neon-btn w-full py-3 rounded font-bold tracking-wider text-sm" data-testid="button-plan-free">&gt;_ GET ACCESS</button>
              </Link>
            </div>

            {/* PRO */}
            <div className="neon-card rounded p-6 flex flex-col" style={{ borderColor: PINK + "88", boxShadow: `0 0 30px ${PINK}33, inset 0 0 30px rgba(0,0,0,0.6)` }}>
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: PINK }}>CLEARANCE: BLACK</div>
              <h3 className="text-2xl font-black mb-1 flex items-center gap-2" style={{ color: PINK }}>
                <Crown className="h-5 w-5" /> OPERATOR
              </h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-4xl font-black" style={{ color: "#fff" }}>$6.99</span>
                <span className="text-xs" style={{ color: NEON_DIM }}>/mo</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-xs" style={{ color: "#aaffcc" }}>
                {["GPT-5.4 Mini + Claude Sonnet", "UNLIMITED queries", "Live web search (grounded)", "AI image generation", "Voice Turbo streaming", "Verified answer badges"].map((i) => (
                  <li key={i} className="flex items-center gap-2"><Check size={12} style={{ color: PINK }} /> {i}</li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <button className="w-full py-3 rounded font-bold tracking-wider text-sm text-white"
                  style={{ background: `linear-gradient(90deg, ${PINK}, #9b00ff)`, boxShadow: `0 0 20px ${PINK}88` }}
                  data-testid="button-plan-pro">
                  &gt;_ DEPLOY · 7-DAY TRIAL
                </button>
              </Link>
            </div>

            {/* RESEARCH */}
            <div className="neon-card rounded p-6 flex flex-col relative overflow-hidden" style={{ borderColor: ACID, boxShadow: `0 0 40px ${ACID}33, inset 0 0 30px rgba(0,0,0,0.6)` }}>
              <div className="absolute top-2 right-2 text-[9px] font-black tracking-widest px-2 py-0.5 rounded" style={{ background: ACID, color: "#000" }}>
                ★ GODMODE
              </div>
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: ACID }}>CLEARANCE: NULL</div>
              <h3 className="text-2xl font-black mb-1 flex items-center gap-2" style={{ color: ACID }}>
                <Skull className="h-5 w-5" /> GHOST
              </h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-4xl font-black" style={{ color: "#fff" }}>$30</span>
                <span className="text-xs" style={{ color: NEON_DIM }}>/mo</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-xs" style={{ color: "#aaffcc" }}>
                {[
                  "GPT-5.4 PRO + Codex Max",
                  "Code Surgeon (GPT-5.1 Codex Max)",
                  "Stack Trace Surgeon (auto PRs)",
                  "Deep Research (20+ sources)",
                  "AI Video Studio (Veo 3.1)",
                  "1M-token long context",
                  "Self-verifying fact-check chain",
                  "Priority sub-300ms responses",
                ].map((i) => (
                  <li key={i} className="flex items-center gap-2"><Check size={12} style={{ color: ACID }} /> {i}</li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <button className="w-full py-3 rounded font-black tracking-wider text-sm"
                  style={{ background: ACID, color: "#000", boxShadow: `0 0 30px ${ACID}` }}
                  data-testid="button-plan-research">
                  &gt;_ GODMODE · 7-DAY TRIAL
                </button>
              </Link>
            </div>
          </div>

          <p className="text-center text-[11px] mt-6 tracking-widest uppercase" style={{ color: NEON_DIM }}>
            // 7-day trial · No CC charged · Cancel anytime · OpenAI charges $200 for less
          </p>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative z-10 py-24 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="neon-card rounded-lg p-10 sm:p-14 relative overflow-hidden">
            <div className="absolute inset-0 hex-grid opacity-30" />
            <div className="relative">
              <Terminal className="h-12 w-12 mx-auto mb-5" style={{ color: NEON, filter: `drop-shadow(0 0 12px ${NEON})` }} />
              <h2 className="text-3xl sm:text-5xl font-black mb-4" style={{ color: "#fff" }}>
                <GlitchText className="text-3xl sm:text-5xl">JACK IN.</GlitchText>
              </h2>
              <p className="text-sm sm:text-base mb-8 max-w-md mx-auto" style={{ color: "#aaffcc" }}>
                The matrix is open. GPT-5.4 Pro is loaded. The disruption is live.<br />
                <span style={{ color: PINK }}>// Free forever. Your first query starts the revolution.</span>
              </p>
              <Link href={ctaHref}>
                <button className="neon-btn px-10 py-4 rounded font-black tracking-widest text-base" data-testid="button-final-cta">
                  {ctaLabel} <ArrowRight className="inline h-4 w-4 ml-2" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* floating chat pill */}
      {isAuthenticated && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
          <div className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ borderColor: NEON + "55", color: NEON, background: "rgba(0,0,0,0.7)" }}>
            // root@{user?.firstName || user?.email?.split("@")[0] || "ghost"}
          </div>
          <Link href="/chat">
            <button className="neon-btn px-5 py-3 rounded font-bold tracking-wider text-sm">
              &gt;_ OPEN MATRIX <ArrowRight className="inline h-3 w-3 ml-1" />
            </button>
          </Link>
        </div>
      )}

      {/* ============ FOOTER ============ */}
      <footer className="border-t py-8 px-5 relative z-10" style={{ borderColor: NEON + "33", background: "rgba(0,0,0,0.7)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: NEON_DIM }}>
            <Terminal className="h-4 w-4" style={{ color: NEON }} />
            <span>TURBO//ANSWER v5.4 · powered by GPT-5.4 + Codex Max · uptime 99.97%</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-widest" style={{ color: NEON_DIM }}>
            <Link href="/privacy-policy" className="hover:text-white">./Privacy</Link>
            <Link href="/support" className="hover:text-white">./Support</Link>
            <Link href="/business" className="hover:text-white">./B2B</Link>
            <Link href="/beta" className="hover:text-white">./Beta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
