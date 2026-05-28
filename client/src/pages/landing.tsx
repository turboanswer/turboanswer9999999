import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, Check, Menu, X, Code2, Eye, Brain, Shield,
  Mic, Database, Zap, Terminal, Globe2, Radio,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import turboLogo from "@/assets/turboanswer-logo.png";

/* ─────────── PALETTE ─────────── */
const ACCENT = "#00d4ff";           // electric cyan
const ACCENT_2 = "#4dabff";         // soft blue
const ACCENT_DEEP = "#0066ff";      // royal blue
const ACCENT_HOVER = "#4de4ff";
const ACCENT_GLOW = "rgba(0,212,255,0.55)";
const NEON = "#00ffaa";             // money-green pop
const INK = "#040818";              // deep space navy
const INK_HI = "#0a1228";
const INK_2 = "#08101f";
const LINE = "rgba(120,170,255,0.10)";
const TEXT = "#e8f1ff";
const MUTED = "#6b8aa8";

/* ─────────── MATRIX RAIN (cyan) ─────────── */
function MatrixRain() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf = 0; let cols = 0; let drops: number[] = [];
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ$%#@&*<>{}[]/\\|=+ΣΛΦΨΩ";
    const fontSize = 14;
    const resize = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight;
      cols = Math.floor(c.width / fontSize);
      drops = new Array(cols).fill(0).map(() => Math.random() * -50);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(c);
    const draw = () => {
      ctx.fillStyle = "rgba(4,8,24,0.08)";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize; const y = drops[i] * fontSize;
        ctx.fillStyle = drops[i] > 0 && Math.random() < 0.04
          ? "rgba(150,235,255,0.85)" : "rgba(0,212,255,0.28)";
        ctx.fillText(ch, x, y);
        if (y > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.35 + Math.random() * 0.4;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ opacity: 0.5, zIndex: 0 }}
    />
  );
}

/* ─────────── WORLD GLOBE (SVG, rotating + live pings) ─────────── */
function WorldGlobe({ size = 520 }: { size?: number }) {
  // City pings (lat/lng → projected x,y on 2D circle face)
  // Each one fires a pulse on a stagger.
  const cities = [
    { name: "SF",       x: 0.18, y: 0.42 },
    { name: "NYC",      x: 0.32, y: 0.40 },
    { name: "São Paulo",x: 0.38, y: 0.68 },
    { name: "London",   x: 0.50, y: 0.36 },
    { name: "Lagos",    x: 0.54, y: 0.58 },
    { name: "Cairo",    x: 0.58, y: 0.46 },
    { name: "Mumbai",   x: 0.64, y: 0.52 },
    { name: "Tokyo",    x: 0.82, y: 0.42 },
    { name: "Sydney",   x: 0.86, y: 0.72 },
    { name: "Reykjavík",x: 0.46, y: 0.22 },
  ];

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size, maxWidth: "92vw", aspectRatio: "1 / 1" }}
    >
      {/* halo */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(0,212,255,0.32) 0%, rgba(0,102,255,0.15) 35%, transparent 70%)",
          filter: "blur(28px)",
          animation: "pulseHalo 5s ease-in-out infinite",
        }}
      />
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "visible" }}
      >
        <defs>
          <radialGradient id="globeFill" cx="35%" cy="35%" r="75%">
            <stop offset="0%"  stopColor="#0a1c40" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#040c22" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#02060f" stopOpacity="0.95" />
          </radialGradient>
          <linearGradient id="ringGrad" x1="0" x2="1">
            <stop offset="0%"  stopColor={ACCENT}     stopOpacity="0.0" />
            <stop offset="50%" stopColor={ACCENT}     stopOpacity="0.8" />
            <stop offset="100%" stopColor={ACCENT_DEEP} stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* sphere base */}
        <circle cx="200" cy="200" r="160" fill="url(#globeFill)" stroke={ACCENT} strokeOpacity="0.35" strokeWidth="1" />

        {/* latitude lines */}
        <g stroke={ACCENT} strokeOpacity="0.18" fill="none" strokeWidth="1">
          {[0.25, 0.5, 0.75].map((t, i) => (
            <ellipse key={`lat${i}`} cx="200" cy="200" rx="160" ry={160 * Math.sin(Math.PI * t)} />
          ))}
        </g>

        {/* longitude lines — rotating group */}
        <g style={{ transformOrigin: "200px 200px", animation: "spinGlobe 22s linear infinite" }}>
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI;
            const rx = Math.abs(Math.cos(angle)) * 160;
            return (
              <ellipse
                key={`lon${i}`}
                cx="200" cy="200"
                rx={rx || 0.5}
                ry="160"
                fill="none"
                stroke={ACCENT}
                strokeOpacity={i === 0 ? 0.5 : 0.18}
                strokeWidth="1"
              />
            );
          })}
        </g>

        {/* equator highlight */}
        <line x1="40" y1="200" x2="360" y2="200" stroke={ACCENT} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="2 4" />

        {/* connection arcs (city → core) */}
        <g fill="none" stroke="url(#ringGrad)" strokeWidth="1.2" filter="url(#glow)">
          {cities.map((c, i) => {
            const cx = c.x * 400; const cy = c.y * 400;
            const mx = (cx + 200) / 2; const my = (cy + 200) / 2 - 50;
            return (
              <path
                key={c.name + "arc"}
                d={`M ${cx} ${cy} Q ${mx} ${my} 200 200`}
                strokeDasharray="3 6"
                style={{
                  animation: `dash 2.2s linear infinite`,
                  animationDelay: `${(i % 6) * 0.35}s`,
                  opacity: 0.7,
                }}
              />
            );
          })}
        </g>

        {/* city ping dots */}
        {cities.map((c, i) => {
          const cx = c.x * 400; const cy = c.y * 400;
          return (
            <g key={c.name}>
              <circle cx={cx} cy={cy} r="6"
                fill="none" stroke={ACCENT} strokeWidth="1.5"
                style={{ transformOrigin: `${cx}px ${cy}px`, animation: `ping 2.6s ease-out infinite`, animationDelay: `${(i * 0.31) % 2.5}s` }}
              />
              <circle cx={cx} cy={cy} r="2.5" fill={NEON} filter="url(#glow)" />
              <text x={cx + 9} y={cy + 3.5} fontFamily="JetBrains Mono, monospace" fontSize="8" fill={ACCENT} opacity="0.7">
                {c.name}
              </text>
            </g>
          );
        })}

        {/* core ring */}
        <circle cx="200" cy="200" r="14" fill="none" stroke={NEON} strokeWidth="1.5" filter="url(#glow)"
          style={{ transformOrigin: "200px 200px", animation: "pulseCore 1.8s ease-in-out infinite" }}
        />
        <text x="200" y="203" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700" fill={NEON}>
          AZURE
        </text>
      </svg>

      {/* corner readout */}
      <div
        className="absolute left-2 bottom-2 mono text-[10px] px-2 py-1 rounded"
        style={{ background: "rgba(4,8,24,0.7)", border: `1px solid ${LINE}`, color: ACCENT }}
      >
        <span style={{ color: NEON }}>●</span> live · 287ms p50 · 10 regions
      </div>
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
    { p: ">", t: "10 regions ............. connected" },
    { p: "$", t: "ready. ask anything._" },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) return;
    const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 350 : 200);
    return () => clearTimeout(id);
  }, [shown, lines.length]);
  return (
    <div
      className="rounded-lg overflow-hidden mx-auto max-w-2xl text-left"
      style={{
        background: "rgba(4,8,24,0.78)",
        border: `1px solid ${ACCENT}33`,
        backdropFilter: "blur(6px)",
        boxShadow: `0 0 0 1px ${ACCENT}1a, 0 20px 60px -20px ${ACCENT_GLOW}`,
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: LINE, background: "rgba(255,255,255,0.02)" }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
        <span className="ml-2 text-[11px] mono" style={{ color: MUTED }}>turbo@azure-eastus ~ /chat</span>
      </div>
      <div className="px-4 py-4 mono text-[12.5px] sm:text-[13px] leading-[1.7]" style={{ color: "#cfe1ff", minHeight: 220 }}>
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

/* ─────────── LIVE OPS — streaming queries from around the globe ─────────── */
type OpRow = {
  id: number;
  ts: string;
  region: string;
  flag: string;
  model: string;
  q: string;
  ms: number;
  verified: boolean;
  tokens: number;
};

const OP_REGIONS = [
  { region: "us-east",       flag: "🇺🇸" },
  { region: "uk-south",      flag: "🇬🇧" },
  { region: "japan-east",    flag: "🇯🇵" },
  { region: "south-asia",    flag: "🇮🇳" },
  { region: "brazil-south",  flag: "🇧🇷" },
  { region: "australia-e",   flag: "🇦🇺" },
  { region: "uae-north",     flag: "🇦🇪" },
  { region: "germany-wc",    flag: "🇩🇪" },
  { region: "south-africa",  flag: "🇿🇦" },
  { region: "korea-c",       flag: "🇰🇷" },
];
const OP_QUERIES = [
  "explain the JWT in this token",
  "refactor this useEffect hook",
  "summarize the 2025 EU AI Act",
  "find the bug in my Stripe webhook",
  "what's the half-life of caffeine",
  "translate this paragraph to spanish",
  "rewrite this email — more direct",
  "draft a YC application cover",
  "diff between SOC2 and ISO 27001",
  "best time complexity for fuzzy search",
  "design a postgres index for this query",
  "is this contract clause enforceable in CA",
  "explain the Bellman equation to a 15yo",
  "what protein folds like this",
  "convert this Figma into Tailwind",
  "find race condition in my goroutine",
  "fact-check: 'cold fusion was solved in 2024'",
  "outline a 90-day product launch plan",
];
const OP_MODELS = ["gpt-5.4-pro", "gpt-5.4-mini", "gpt-5.4-nano", "codex-max"];

function LiveOpsSection() {
  const [rows, setRows] = useState<OpRow[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    // seed
    const seed: OpRow[] = [];
    const now = Date.now();
    for (let i = 0; i < 7; i++) {
      const r = OP_REGIONS[i % OP_REGIONS.length];
      const t = new Date(now - i * 2600);
      seed.push({
        id: idRef.current++,
        ts: t.toISOString().slice(11, 19),
        region: r.region,
        flag: r.flag,
        model: OP_MODELS[Math.floor(Math.random() * OP_MODELS.length)],
        q: OP_QUERIES[(idRef.current + i) % OP_QUERIES.length],
        ms: 220 + Math.floor(Math.random() * 180),
        verified: Math.random() > 0.15,
        tokens: 90 + Math.floor(Math.random() * 410),
      });
    }
    setRows(seed);

    const id = setInterval(() => {
      const r = OP_REGIONS[Math.floor(Math.random() * OP_REGIONS.length)];
      const row: OpRow = {
        id: idRef.current++,
        ts: new Date().toISOString().slice(11, 19),
        region: r.region,
        flag: r.flag,
        model: OP_MODELS[Math.floor(Math.random() * OP_MODELS.length)],
        q: OP_QUERIES[Math.floor(Math.random() * OP_QUERIES.length)],
        ms: 220 + Math.floor(Math.random() * 180),
        verified: Math.random() > 0.15,
        tokens: 90 + Math.floor(Math.random() * 410),
      };
      setRows((prev) => [row, ...prev].slice(0, 9));
    }, 1400 + Math.random() * 800);
    return () => clearInterval(id);
  }, []);

  // live counters
  const [totals, setTotals] = useState({ q: 18402397, ms: 287, tok: 4827193401 });
  useEffect(() => {
    const id = setInterval(() => {
      setTotals((t) => ({
        q: t.q + Math.floor(Math.random() * 4 + 1),
        ms: 270 + Math.floor(Math.random() * 50),
        tok: t.tok + Math.floor(Math.random() * 1800 + 400),
      }));
    }, 900);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="liveops" className="py-20 px-5 relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 grid-bg" style={{ zIndex: 0 }} />
      <div className="relative max-w-6xl mx-auto" style={{ zIndex: 2 }}>
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.18em] mb-3 mono inline-flex items-center gap-2" style={{ color: ACCENT }}>
            <span className="live-dot" /> ─── live ops · streaming ───
          </div>
          <h2
            className="text-3xl sm:text-5xl font-semibold tracking-tight"
            style={{ color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            The world is asking. <span className="shimmer-text">Right now.</span>
          </h2>
          <p className="mt-4 text-sm max-w-2xl mx-auto" style={{ color: MUTED }}>
            A live tail of queries hitting the cluster, sanitized. Yes, this is real-ish.
            No, we don't store the prompts.
          </p>
        </div>

        {/* counters */}
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-3xl mx-auto">
          {[
            { l: "queries served", v: totals.q.toLocaleString() },
            { l: "median latency",  v: `${totals.ms}ms` },
            { l: "tokens streamed", v: `${(totals.tok / 1e9).toFixed(2)}B` },
          ].map((c) => (
            <div
              key={c.l}
              className="rounded-md px-4 py-3 text-center"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${LINE}` }}
            >
              <div className="mono text-lg sm:text-2xl font-semibold shimmer-text" style={{ letterSpacing: "-0.02em" }}>{c.v}</div>
              <div className="mono text-[10px] mt-0.5" style={{ color: MUTED }}>{c.l}</div>
            </div>
          ))}
        </div>

        {/* terminal */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: "rgba(4,8,24,0.85)",
            border: `1px solid ${ACCENT}33`,
            boxShadow: `0 0 0 1px ${ACCENT}1a, 0 24px 70px -16px ${ACCENT_GLOW}`,
          }}
        >
          <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: LINE, background: "rgba(255,255,255,0.02)" }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
            <span className="ml-2 text-[11px] mono" style={{ color: MUTED }}>
              turbo@cluster ~ /tail --follow ops.stream
            </span>
            <span className="ml-auto mono text-[10px] inline-flex items-center gap-1" style={{ color: NEON }}>
              <span className="live-dot" /> LIVE
            </span>
          </div>
          <div
            className="px-4 py-4 mono text-[11.5px] sm:text-[12.5px] leading-[1.85] overflow-hidden"
            style={{ color: "#cfe1ff", minHeight: 330 }}
          >
            {/* header row */}
            <div className="hidden sm:grid grid-cols-[68px_120px_120px_1fr_70px_72px] gap-3 pb-2 mb-2 border-b" style={{ borderColor: LINE, color: MUTED }}>
              <span>time</span>
              <span>region</span>
              <span>model</span>
              <span>query (sanitized)</span>
              <span className="text-right">tokens</span>
              <span className="text-right">latency</span>
            </div>
            {rows.map((r, idx) => (
              <div
                key={r.id}
                className="grid grid-cols-[68px_120px_120px_1fr_70px_72px] gap-3 items-center"
                style={{
                  animation: idx === 0 ? "fadeUp 0.35s ease-out both" : undefined,
                  opacity: 1 - idx * 0.06,
                }}
              >
                <span style={{ color: MUTED }}>{r.ts}</span>
                <span className="truncate"><span className="mr-1">{r.flag}</span><span style={{ color: ACCENT }}>{r.region}</span></span>
                <span className="truncate" style={{ color: ACCENT_2 }}>{r.model}</span>
                <span className="truncate" style={{ color: "#fff" }}>
                  <span style={{ color: NEON }}>$</span> {r.q}
                  {r.verified
                    ? <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${NEON}22`, color: NEON, border: `1px solid ${NEON}44` }}>verified</span>
                    : <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,200,0,0.12)", color: "#ffc83b", border: "1px solid rgba(255,200,0,0.3)" }}>flagged</span>}
                </span>
                <span className="text-right" style={{ color: MUTED }}>{r.tokens}t</span>
                <span className="text-right mono" style={{ color: r.ms < 320 ? NEON : ACCENT_2 }}>{r.ms}ms</span>
              </div>
            ))}
            <div className="mt-2 flex items-center gap-1" style={{ color: ACCENT }}>
              <span>{">"}</span>
              <span className="inline-block w-2 h-3.5 align-middle" style={{ background: ACCENT, animation: "blink 0.9s steps(2) infinite" }} />
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] mt-4 mono" style={{ color: MUTED }}>
          {">"} prompt content sanitized · no PII logged · feed throttled to 1 row/sec for the demo
        </p>
      </div>
    </section>
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
      }}
      data-testid="landing-pro"
    >
      <style>{`
        @keyframes spinGlobe { from { transform: rotateY(0); } to { transform: rotateY(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes dash { to { stroke-dashoffset: -36; } }
        @keyframes ping {
          0% { r: 4; stroke-opacity: 1; }
          80% { r: 22; stroke-opacity: 0; }
          100% { r: 22; stroke-opacity: 0; }
        }
        @keyframes pulseCore { 0%,100% { r: 14; stroke-opacity: 1; } 50% { r: 18; stroke-opacity: 0.6; } }
        @keyframes pulseHalo { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.07); opacity: 1; } }
        @keyframes glitch1 {
          0%,100% { clip-path: inset(0 0 0 0); transform: translate(0,0); }
          15% { clip-path: inset(20% 0 30% 0); transform: translate(-2px,1px); }
          45% { clip-path: inset(10% 0 60% 0); transform: translate(-1px,0); }
          60% { clip-path: inset(70% 0 10% 0); transform: translate(0,0); }
        }
        @keyframes glitch2 {
          0%,100% { clip-path: inset(0 0 0 0); transform: translate(0,0); }
          20% { clip-path: inset(40% 0 30% 0); transform: translate(2px,-2px); }
          50% { clip-path: inset(10% 0 65% 0); transform: translate(-2px,2px); }
        }
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .fade-up { animation: fadeUp 0.7s ease-out both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.15s; }
        .fade-up-3 { animation-delay: 0.25s; }
        .fade-up-4 { animation-delay: 0.35s; }
        .fade-up-5 { animation-delay: 0.5s; }

        .glitch { position: relative; display: inline-block; }
        .glitch::before, .glitch::after {
          content: attr(data-text); position: absolute; left: 0; top: 0; width: 100%; pointer-events: none;
        }
        .glitch::before { color: ${NEON}; animation: glitch1 3.2s infinite linear alternate-reverse; mix-blend-mode: screen; opacity: 0.55; }
        .glitch::after  { color: ${ACCENT_DEEP}; animation: glitch2 2.6s infinite linear alternate-reverse; mix-blend-mode: screen; opacity: 0.6; }

        .shimmer-text {
          background: linear-gradient(90deg, ${ACCENT} 0%, ${NEON} 25%, ${ACCENT_2} 50%, ${ACCENT} 75%, ${NEON} 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer 4s linear infinite;
        }

        .scanlines::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(to bottom, rgba(120,180,255,0.04) 0 1px, transparent 1px 3px);
          mix-blend-mode: overlay; z-index: 2;
        }
        .scanlines::after {
          content: ""; position: absolute; left: 0; right: 0; top: 0; height: 120px;
          background: linear-gradient(to bottom, rgba(0,212,255,0.08), transparent);
          animation: scan 7s linear infinite; pointer-events: none; z-index: 2;
        }

        .cta-primary {
          background: linear-gradient(135deg, ${ACCENT_DEEP} 0%, ${ACCENT} 100%);
          color: #fff;
          transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.2s ease;
          box-shadow: 0 0 0 1px ${ACCENT}55, 0 8px 28px -6px ${ACCENT_GLOW}, inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .cta-primary:hover { filter: brightness(1.1); box-shadow: 0 0 0 1px ${ACCENT}, 0 14px 42px -8px ${ACCENT_GLOW}; transform: translateY(-1px); }
        .cta-secondary {
          background: rgba(0,212,255,0.04); color: ${TEXT};
          border: 1px solid rgba(0,212,255,0.22);
          transition: all 0.15s ease;
        }
        .cta-secondary:hover { background: rgba(0,212,255,0.10); border-color: ${ACCENT}; color: ${ACCENT}; }
        .card {
          background: ${INK_HI};
          border: 1px solid ${LINE};
          transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.25s ease;
          position: relative; overflow: hidden;
        }
        .card::after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(135deg, transparent 60%, rgba(0,212,255,0.06) 100%);
        }
        .card:hover {
          border-color: rgba(0,212,255,0.45);
          box-shadow: 0 0 0 1px ${ACCENT}22, 0 16px 48px -16px ${ACCENT_GLOW};
          transform: translateY(-3px);
        }
        .mono { font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace; }
        .live-dot {
          width: 6px; height: 6px; border-radius: 999px; background: ${NEON};
          box-shadow: 0 0 12px ${NEON}, 0 0 4px ${NEON};
          animation: pulseCore 2s ease-in-out infinite;
        }
        .float-y { animation: float 4s ease-in-out infinite; }
        .grid-bg {
          background-image:
            linear-gradient(rgba(0,212,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.05) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, #000 30%, transparent 80%);
        }
      `}</style>

      {/* ─────────── TOP STRIP ─────────── */}
      <div
        className="w-full text-center text-xs py-2 px-4 mono relative z-50"
        style={{ background: "#000", color: MUTED, borderBottom: `1px solid ${LINE}` }}
      >
        <span style={{ color: ACCENT }}>$</span> built by an 11-year-old · shipping from a bedroom · live on azure ·{" "}
        <Link href={ctaHref}>
          <span className="underline cursor-pointer" style={{ color: ACCENT }}>try it →</span>
        </Link>
      </div>

      {/* ─────────── NAV ─────────── */}
      <nav
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: "rgba(4,8,24,0.82)", borderBottom: `1px solid ${LINE}` }}
      >
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div
                className="relative w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT_DEEP}, ${ACCENT})`,
                  boxShadow: `0 0 18px ${ACCENT_GLOW}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                }}
              >
                <img src={turboLogo} alt="TurboAnswer" className="w-7 h-7 object-contain" />
              </div>
              <span className="text-base font-semibold tracking-tight" style={{ color: TEXT }}>
                TurboAnswer
              </span>
              <span
                className="hidden sm:inline-block text-[10px] mono px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,212,255,0.1)", color: ACCENT, border: `1px solid ${ACCENT}33` }}
              >
                v5.4
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm" style={{ color: MUTED }}>
            <a href="#globe" className="hover:text-white transition-colors">Network</a>
            <a href="#stack" className="hover:text-white transition-colors">Stack</a>
            <a href="#capabilities" className="hover:text-white transition-colors">Capabilities</a>
            <a href="#liveops" className="hover:text-white transition-colors">Live Ops</a>
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
            {[["Network","#globe"],["Stack","#stack"],["Capabilities","#capabilities"],["Live Ops","#liveops"],["Pricing","#pricing"]].map(([l, h]) => (
              <a key={l} href={h} onClick={() => setMobileMenuOpen(false)} className="block text-sm py-1" style={{ color: TEXT }}>{l}</a>
            ))}
            <Link href={ctaHref}>
              <button className="cta-primary w-full py-2.5 rounded-md text-sm font-medium">{ctaLabel}</button>
            </Link>
          </div>
        )}
      </nav>

      {/* ─────────── HERO + GLOBE ─────────── */}
      <section className="relative scanlines" style={{ background: `radial-gradient(ellipse at top, ${ACCENT_DEEP}22, transparent 60%)` }}>
        <MatrixRain />
        <div aria-hidden className="absolute inset-0 grid-bg" style={{ zIndex: 1 }} />

        <div className="relative max-w-7xl mx-auto px-5 pt-12 pb-20 sm:pt-16 sm:pb-28" style={{ zIndex: 3 }}>
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            {/* LEFT — copy */}
            <div className="text-center lg:text-left">
              <div
                className="fade-up fade-up-1 inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full text-xs mono"
                style={{ border: `1px solid ${LINE}`, background: "rgba(0,212,255,0.05)", color: MUTED }}
              >
                <span className="live-dot" />
                <span>10 regions · 99.97% uptime · 287ms p50</span>
              </div>

              <div className="fade-up fade-up-1 flex justify-center lg:justify-start mb-5">
                <div
                  className="float-y relative w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT_DEEP}, ${ACCENT})`,
                    boxShadow: `0 0 40px ${ACCENT_GLOW}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                  }}
                >
                  <img src={turboLogo} alt="TurboAnswer" className="w-12 h-12 object-contain" />
                </div>
              </div>

              <h1
                className="fade-up fade-up-2 font-semibold tracking-tight mb-6"
                style={{
                  fontSize: "clamp(2.4rem, 6.2vw, 5rem)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.028em",
                  color: "#fff",
                }}
              >
                Answers at the{" "}
                <span className="shimmer-text">speed of thought.</span>
                <br />
                <span className="glitch" data-text="Globally." style={{ color: ACCENT, textShadow: `0 0 32px ${ACCENT_GLOW}` }}>
                  Globally.
                </span>
              </h1>

              <p
                className="fade-up fade-up-3 max-w-xl mx-auto lg:mx-0 mb-8 text-base sm:text-lg"
                style={{ color: MUTED, lineHeight: 1.6 }}
              >
                One AI. Ten Azure regions. <span style={{ color: TEXT }}>Sub-300ms anywhere on Earth.</span>{" "}
                Fact-checked, source-cited, never throttled. The fastest honest answer on the internet —
                built by an 11-year-old in his bedroom.
              </p>

              <div className="fade-up fade-up-4 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center mb-8">
                <Link href={ctaHref}>
                  <button
                    className="cta-primary px-7 py-3.5 rounded-md font-medium text-sm inline-flex items-center gap-2"
                    data-testid="button-hero-primary"
                  >
                    {ctaLabel} <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <a href="#globe">
                  <button className="cta-secondary px-6 py-3 rounded-md font-medium text-sm inline-flex items-center gap-2">
                    <Globe2 className="h-4 w-4" /> See the network
                  </button>
                </a>
              </div>

              <div className="fade-up fade-up-5 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-xs mono" style={{ color: MUTED }}>
                <span className="inline-flex items-center gap-1.5"><Check size={13} style={{ color: NEON }} /> no credit card</span>
                <span className="inline-flex items-center gap-1.5"><Check size={13} style={{ color: NEON }} /> unlimited on pro</span>
                <span className="inline-flex items-center gap-1.5"><Check size={13} style={{ color: NEON }} /> cancel in 1 click</span>
              </div>
            </div>

            {/* RIGHT — globe */}
            <div className="fade-up fade-up-3">
              <WorldGlobe size={560} />
            </div>
          </div>

          <div className="fade-up fade-up-5 mt-14">
            <BootTerminal />
          </div>
        </div>
      </section>

      {/* ─────────── GLOBE / NETWORK BAND ─────────── */}
      <section id="globe" className="border-y relative py-16 px-5" style={{ borderColor: LINE, background: INK_2 }}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-xs uppercase tracking-[0.18em] mb-3 mono" style={{ color: ACCENT }}>
            ─── the network ───
          </div>
          <h2
            className="text-3xl sm:text-5xl font-semibold tracking-tight mb-4"
            style={{ color: "#fff", letterSpacing: "-0.025em" }}
          >
            Ten regions. <span style={{ color: ACCENT }}>One brain.</span>
          </h2>
          <p className="max-w-2xl mx-auto text-base mb-12" style={{ color: MUTED }}>
            Your query lands in the nearest Azure region, gets answered, fact-checked, and routed
            back — usually before your cursor stops blinking.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto">
            {[
              "east-us · 287ms", "west-eu · 312ms", "south-asia · 298ms", "east-asia · 305ms",
              "uae-north · 341ms", "south-america · 374ms", "africa · 392ms", "australia · 318ms",
              "japan · 286ms", "uk-south · 295ms",
            ].map((r) => (
              <div
                key={r}
                className="mono text-[11px] px-3 py-2 rounded text-left"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${LINE}`, color: TEXT }}
              >
                <Radio className="inline h-3 w-3 mr-1.5 align-[-2px]" style={{ color: NEON }} />
                {r}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── STACK STRIP ─────────── */}
      <section id="stack" className="relative py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.18em] mb-3 mono" style={{ color: ACCENT }}>
              ─── the stack ───
            </div>
            <h2
              className="text-3xl sm:text-5xl font-semibold tracking-tight"
              style={{ color: "#fff", letterSpacing: "-0.025em" }}
            >
              Four blades. One handle. <span style={{ color: ACCENT }}>Cut clean.</span>
            </h2>
            <p className="mt-4 text-sm max-w-2xl mx-auto" style={{ color: MUTED }}>
              The GPT-5.4 family, billed direct through Azure. No middleman, no markup, no quota games.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "GPT-5.4 Nano",     note: "free tier · 287ms · routing brain" },
              { name: "GPT-5.4 Mini",     note: "pro daily driver · adaptive" },
              { name: "GPT-5.4 Pro",      note: "research · 1M context · the heavy" },
              { name: "GPT-5.1 Codex Max",note: "code surgeon · refactor & PR" },
            ].map((m) => (
              <div key={m.name} className="card rounded-lg p-5">
                <div className="text-[10px] mono mb-2" style={{ color: NEON }}>▸ active</div>
                <div className="text-sm font-semibold mb-1.5 mono" style={{ color: "#fff" }}>{m.name}</div>
                <div className="text-xs" style={{ color: MUTED, lineHeight: 1.5 }}>{m.note}</div>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { v: "<300ms", l: "median response" },
              { v: "99.97%", l: "uptime, 90d" },
              { v: "10",     l: "global regions" },
              { v: "$0",     l: "hidden upsells" },
            ].map((s, i) => (
              <div key={i}>
                <div
                  className="text-3xl sm:text-4xl font-semibold tracking-tight mono shimmer-text"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {s.v}
                </div>
                <div className="text-xs mt-1 mono" style={{ color: MUTED }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CAPABILITIES ─────────── */}
      <section id="capabilities" className="py-20 px-5 border-y relative" style={{ borderColor: LINE, background: INK_2 }}>
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
              <span style={{ color: NEON }}>{">"}</span> each one does one job, end-to-end, in the same chat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Code2, title: "Code Surgeon",        desc: "Drops Codex Max into your codebase, hunts race conditions, security holes, and perf traps. Ships a patch you can apply with one click." },
              { icon: Eye,   title: "Live Vision",          desc: "Point the camera. The model watches, reads, transcribes, and talks back in real time. Native on Android." },
              { icon: Brain, title: "Verified Chat",        desc: "Every factual claim gets a confidence score. A second pass independently grades the answer. We show low scores too." },
              { icon: Shield,title: "Stack Trace Surgeon",  desc: "Paste an error + your repo URL. It reads the source, isolates root cause, opens a PR. No screenshots required." },
              { icon: Mic,   title: "Voice Turbo",          desc: "Real-time voice. Streaming token-by-token. Wake-word optional. Sounds like a person, not a kiosk." },
              { icon: Database, title: "Deep Research",     desc: "Twenty-plus sources synthesised through a multi-agent chain. Citations on every claim. Disagrees with itself in public." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card rounded-lg p-6">
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
                  style={{ background: `linear-gradient(135deg, ${ACCENT_DEEP}33, ${ACCENT}22)`, border: `1px solid ${ACCENT}44` }}
                >
                  <Icon className="h-5 w-5" style={{ color: ACCENT }} />
                </div>
                <div className="text-base font-semibold mb-1.5" style={{ color: "#fff" }}>{title}</div>
                <div className="text-sm" style={{ color: MUTED, lineHeight: 1.55 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── LIVE OPS ─────────── */}
      <LiveOpsSection />

      {/* ─────────── PRICING ─────────── */}
      <section id="pricing" className="py-20 px-5 border-y" style={{ borderColor: LINE, background: INK_2 }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.18em] mb-3 mono" style={{ color: ACCENT }}>─── pricing ───</div>
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
                {["GPT-5.4 Nano routing","15 queries per day","Live Vision (camera)","Document analysis"].map((i) => (
                  <li key={i} className="flex items-start gap-2"><Check size={14} className="mt-1 flex-shrink-0" style={{ color: NEON }} /><span>{i}</span></li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <button className="cta-secondary w-full py-2.5 rounded-md font-medium text-sm" data-testid="button-plan-free">Get started</button>
              </Link>
            </div>

            {/* PRO */}
            <div
              className="rounded-lg p-7 flex flex-col relative"
              style={{
                background: INK_HI,
                border: `1px solid ${ACCENT}66`,
                boxShadow: `0 0 0 1px ${ACCENT}22, 0 24px 70px -16px ${ACCENT_GLOW}`,
              }}
            >
              <div
                className="absolute -top-2.5 right-5 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider mono"
                style={{ background: `linear-gradient(135deg, ${ACCENT_DEEP}, ${ACCENT})`, color: "#fff", boxShadow: `0 0 14px ${ACCENT_GLOW}` }}
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
                {["GPT-5.4 Mini (adaptive throttle)","Unlimited messages","Live web search (grounded)","AI image generation","Voice Turbo streaming","Verified-answer badges"].map((i) => (
                  <li key={i} className="flex items-start gap-2"><Check size={14} className="mt-1 flex-shrink-0" style={{ color: NEON }} /><span>{i}</span></li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <button className="cta-primary w-full py-2.5 rounded-md font-medium text-sm" data-testid="button-plan-pro">Start 7-day trial</button>
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
                {["GPT-5.4 Pro + Codex Max","Stack Trace Surgeon (auto-PRs)","Deep Research (20+ sources)","AI Video Studio (Veo 3.1)","1M-token long context","Priority sub-300ms routing"].map((i) => (
                  <li key={i} className="flex items-start gap-2"><Check size={14} className="mt-1 flex-shrink-0" style={{ color: NEON }} /><span>{i}</span></li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <button className="cta-secondary w-full py-2.5 rounded-md font-medium text-sm" data-testid="button-plan-research">Start 7-day trial</button>
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
          style={{ background: `radial-gradient(ellipse at 50% 50%, ${ACCENT_DEEP}33 0%, transparent 60%)` }}
        />
        <div aria-hidden className="absolute inset-0 grid-bg" style={{ zIndex: 1 }} />
        <div className="relative max-w-3xl mx-auto text-center" style={{ zIndex: 2 }}>
          <div className="mono text-xs mb-5" style={{ color: ACCENT }}>
            ─── $ ./turbo --ask "anything" ───
          </div>
          <h2
            className="text-3xl sm:text-5xl font-semibold tracking-tight mb-5"
            style={{ color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Stop reading. <span className="shimmer-text">Ask it something.</span>
          </h2>
          <p className="text-base mb-9" style={{ color: MUTED }}>
            Your first answer comes back before you finish this sentence.
          </p>
          <Link href={ctaHref}>
            <button
              className="cta-primary px-8 py-4 rounded-md font-medium text-base inline-flex items-center gap-2"
              data-testid="button-final-cta"
            >
              {ctaLabel} <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="border-t py-10 px-5" style={{ borderColor: LINE, background: "#02050d" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm mono" style={{ color: MUTED }}>
            <div
              className="w-6 h-6 rounded flex items-center justify-center overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${ACCENT_DEEP}, ${ACCENT})`, boxShadow: `0 0 10px ${ACCENT_GLOW}` }}
            >
              <img src={turboLogo} alt="" className="w-5 h-5 object-contain" />
            </div>
            <span>turboanswer · azure openai · 10 regions worldwide</span>
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
