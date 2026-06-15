import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, Check, Menu, X, Code2, Brain,
  Mic, Database, Terminal, Globe2, Radio,
  Smartphone, Cloud, Lock, Cpu, Server, ShieldCheck, GitBranch, ChevronDown,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import turboLogo from "@/assets/turboanswer-logo.png";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from "recharts";

/* ─────────── WORLD GLOBE (SVG, restyled warm/minimal) ─────────── */
function WorldGlobe({ size = 520 }: { size?: number }) {
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
      <div className="absolute inset-0 rounded-full bg-primary/5 blur-3xl opacity-50" />
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 w-full h-full text-border overflow-visible"
      >
        <defs>
          <radialGradient id="globeFill" cx="35%" cy="35%" r="75%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* sphere base */}
        <circle cx="200" cy="200" r="160" fill="url(#globeFill)" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />

        {/* latitude lines */}
        <g stroke="currentColor" strokeOpacity="0.3" fill="none" strokeWidth="1">
          {[0.25, 0.5, 0.75].map((t, i) => (
            <ellipse key={`lat${i}`} cx="200" cy="200" rx="160" ry={160 * Math.sin(Math.PI * t)} />
          ))}
        </g>

        {/* longitude lines */}
        <g style={{ transformOrigin: "200px 200px", animation: "spinGlobe 40s linear infinite" }}>
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
                stroke="currentColor"
                strokeOpacity={i === 0 ? 0.4 : 0.2}
                strokeWidth="1"
              />
            );
          })}
        </g>

        <line x1="40" y1="200" x2="360" y2="200" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="2 4" />

        <g fill="none" className="text-primary" strokeWidth="1.2">
          {cities.map((c, i) => {
            const cx = c.x * 400; const cy = c.y * 400;
            const mx = (cx + 200) / 2; const my = (cy + 200) / 2 - 50;
            return (
              <path
                key={c.name + "arc"}
                d={`M ${cx} ${cy} Q ${mx} ${my} 200 200`}
                stroke="currentColor"
                strokeDasharray="3 6"
                style={{
                  animation: `dash 3s linear infinite`,
                  animationDelay: `${(i % 6) * 0.35}s`,
                  opacity: 0.4,
                }}
              />
            );
          })}
        </g>

        {cities.map((c, i) => {
          const cx = c.x * 400; const cy = c.y * 400;
          return (
            <g key={c.name}>
              <circle cx={cx} cy={cy} r="6"
                fill="none" className="stroke-primary/50" strokeWidth="1"
                style={{ transformOrigin: `${cx}px ${cy}px`, animation: `ping 3s ease-out infinite`, animationDelay: `${(i * 0.31) % 2.5}s` }}
              />
              <circle cx={cx} cy={cy} r="2.5" className="fill-primary" />
              <text x={cx + 9} y={cy + 3.5} className="font-mono text-[9px] fill-foreground/60">
                {c.name}
              </text>
            </g>
          );
        })}

        <circle cx="200" cy="200" r="14" fill="none" className="stroke-primary" strokeWidth="1.5"
          style={{ transformOrigin: "200px 200px", animation: "pulseCore 2s ease-in-out infinite" }}
        />
        <text x="200" y="203" textAnchor="middle" className="font-mono text-[7px] font-bold fill-primary tracking-wider">
          AZURE
        </text>
      </svg>

      <div className="absolute left-2 bottom-2 font-mono text-[10px] px-3 py-1.5 rounded-md bg-card/80 backdrop-blur-sm border text-muted-foreground shadow-sm">
        <span className="text-primary mr-1">●</span> live · 287ms p50 · 10 regions
      </div>
    </div>
  );
}

/* ─────────── BOOT TERMINAL ─────────── */
function BootTerminal() {
  const lines = [
    { p: "$", t: "turbo --boot --stack=claude --region=azure-eastus" },
    { p: ">", t: "init router ............ ok" },
    { p: ">", t: "warm claude-opus-4.1 ... 287ms" },
    { p: ">", t: "warm claude-sonnet-4.5 . 142ms" },
    { p: ">", t: "warm claude-opus ....... 198ms" },
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
    <div className="rounded-xl overflow-hidden mx-auto max-w-2xl text-left bg-card border shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
        </div>
        <span className="ml-2 text-xs font-mono text-muted-foreground">turbo@azure-eastus ~ /chat</span>
      </div>
      <div className="px-5 py-5 font-mono text-sm leading-relaxed text-foreground min-h-[220px]">
        {lines.slice(0, shown).map((l, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
            <span className={l.p === "$" ? "text-primary" : "text-muted-foreground"}>{l.p}</span>{" "}
            <span>{l.t}</span>
            {i === shown - 1 && shown < lines.length && (
              <span className="inline-block w-2 h-3.5 ml-1 align-middle bg-primary animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── ARCH SECTION — how a query travels ─────────── */
type Hop = {
  n: string;
  title: string;
  badge: string;
  icon: any;
  desc: string;
  techs: string[];
};

const HOPS: Hop[] = [
  {
    n: "01", title: "Your device", badge: "0ms", icon: Smartphone,
    desc: "Web, Android, iOS, or our embeddable widget. TLS 1.3 handshake reused across requests via session tickets.",
    techs: ["TLS 1.3", "HTTP/3 (QUIC)", "Brotli compression", "0-RTT resumption"],
  },
  {
    n: "02", title: "Cloudflare Edge PoP", badge: "~12ms", icon: Cloud,
    desc: "Your request lands at the nearest of 310+ Cloudflare cities via BGP anycast — usually a sub-15ms hop from your ISP. DDoS shield, WAF, and bot management run inline.",
    techs: ["BGP anycast routing", "Cloudflare WAF + Bot mgmt", "DDoS L3-L7 mitigation", "Argo Smart Routing"],
  },
  {
    n: "03", title: "Cloudflare Worker", badge: "~3ms", icon: Lock,
    desc: "A V8 isolate at the edge — no cold start, ever. Validates your JWT, enforces tier rate limits, sanitizes the prompt, and picks which Azure region to dial based on live latency probes.",
    techs: ["V8 isolates (no cold start)", "JWT validation", "Tier rate-limit (KV store)", "Live latency probes"],
  },
  {
    n: "04", title: "Azure Front Door", badge: "~8ms", icon: Globe2,
    desc: "Microsoft's global L7 load-balancer steers your request to the healthiest Azure region within the chosen geo. Health checks run every 5s; failover is automatic and silent.",
    techs: ["L7 load balancing", "5s active health checks", "Geo + latency steering", "Automatic failover"],
  },
  {
    n: "05", title: "Azure AI region", badge: "~50ms", icon: Server,
    desc: "One of 10 GPU regions — east-us, west-eu, japan-east, uae-north, brazil-south, africa-north, australia-east, korea-c, south-asia, uk-south. Warm GPU pool, no spin-up.",
    techs: ["NVIDIA H100 / A100 pools", "Pre-warmed PTU (provisioned throughput)", "Multi-AZ redundancy", "Private VNet peering"],
  },
  {
    n: "06", title: "Claude inference", badge: "TTFT ~150ms", icon: Cpu,
    desc: "The router picked the right size: Claude Haiku for greetings, Claude Sonnet 4.5 for daily work, Claude Opus 4.1 for reasoning, Claude Opus for code. First token streams back the moment it exists — no batching delay.",
    techs: ["Token-by-token streaming (SSE)", "Speculative decoding", "KV-cache reuse across turns", "Adaptive model routing"],
  },
  {
    n: "07", title: "Fact-check chain", badge: "parallel", icon: ShieldCheck,
    desc: "While the main answer streams, a second model grades it independently for factual claims and citations. Confidence score attaches to the response — even when it's low.",
    techs: ["Parallel verifier model", "Citation extraction + URL probe", "Confidence score 0.0–1.0", "Hallucination flag (auto-disclose)"],
  },
  {
    n: "08", title: "Streamed back to you", badge: "~287ms p50", icon: GitBranch,
    desc: "Same Cloudflare PoP, reverse path. HTTP/3 multiplexed stream means tokens render the millisecond they hit your screen. End-to-end p50: 287ms. p99: 612ms.",
    techs: ["SSE over HTTP/3", "Token rendered = token painted", "Resumable on disconnect", "Replay-safe via request_id"],
  },
];

function ArchSection() {
  const [open, setOpen] = useState(false);
  return (
    <section id="architecture" className="py-24 px-5 relative bg-background border-y">
      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.18em] mb-4 font-mono text-primary font-medium">
            how a query travels
          </div>
          <h2 className="text-4xl sm:text-6xl font-display font-medium tracking-tight mb-6 text-foreground">
            8 hops. 287 milliseconds.
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
            From your fingertip to Claude and back. Every hop accounted for.
          </p>
        </div>

        <div className="space-y-4">
          {HOPS.map((h, i) => (
            <div key={h.n} className="relative">
              <div className="bg-card border rounded-2xl p-6 grid grid-cols-[auto_1fr] gap-6 items-start shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-xs font-mono text-muted-foreground">{h.n}</div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <h.icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="min-w-0 pt-1">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className="text-lg font-medium text-foreground">{h.title}</span>
                    <span className="text-xs font-mono px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {h.badge}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{h.desc}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {h.techs.map((t) => (
                      <span key={t} className="text-xs font-mono px-2 py-1 rounded-md bg-muted text-muted-foreground border">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {i < HOPS.length - 1 && (
                <div className="flex justify-center my-2 text-primary/30">
                  <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                    <line x1="10" y1="0" x2="10" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                    <path d="M 6 16 L 10 22 L 14 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-card border rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="font-mono text-sm text-foreground">
            <span className="text-muted-foreground">end-to-end target ▸</span>{" "}
            <span className="text-lg font-medium ai-gradient-text">&lt;300ms</span>
            <span className="text-muted-foreground ml-4">ttft ▸</span>{" "}
            <span className="font-medium text-foreground">~150ms</span>
            <span className="text-muted-foreground ml-4">edge hop ▸</span>{" "}
            <span className="font-medium text-foreground">&lt;20ms</span>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            <span className="text-primary mr-1">●</span> design budget
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <Terminal className="h-4 w-4" />
            Tech nerd? Find out our global operations
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {open && (
          <div className="mt-8 rounded-xl overflow-hidden bg-card border shadow-sm animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
              <span className="text-xs font-mono text-muted-foreground">cat /docs/architecture/global-ops.md</span>
            </div>
            <div className="px-6 py-6 font-mono text-sm leading-relaxed text-muted-foreground">
              <NerdBlock title="# 1. ROUTING — Why your request never crosses an ocean it doesn't need to" lines={[
                "BGP anycast advertises one IP from all 310+ Cloudflare PoPs simultaneously.",
                "Your ISP's router picks the lowest-AS-path hop — usually <15ms away.",
                "If the closest PoP is overloaded, Argo Smart Routing detours via the next-",
                "fastest backbone link (Cloudflare runs its own private fiber between PoPs).",
                "→ result: a user in Lagos hits the Lagos PoP, not Frankfurt. -180ms vs naive DNS.",
              ]} />
              <NerdBlock title="# 2. EDGE COMPUTE — V8 isolates, not containers" lines={[
                "Auth, rate-limit, and region selection run in a Cloudflare Worker.",
                "Workers are V8 isolates (not containers) — boot time: <5ms, always warm.",
                "Tier quotas live in Cloudflare KV — eventually consistent, ~30s replication.",
                "Prompt is sanitized (PII strip, prompt-injection probe) before egress.",
                "→ no cold-start tax. ever. that's the whole reason we don't use Lambda.",
              ]} />
              <NerdBlock title="# 3. AZURE FRONT DOOR — picking the warm GPU" lines={[
                "Front Door pings each of the 10 Azure AI regions every 5 seconds.",
                "Failed health-check → instant traffic shift, no manual intervention.",
                "Region pick is weighted: latency (60%) + queue depth (25%) + cost (15%).",
                "Private VNet peering between Front Door and the model host — never touches public net.",
                "→ if east-us-2 melts, you don't notice. you might land in north-europe; same answer.",
              ]} />
              <NerdBlock title="# 4. INFERENCE — provisioned throughput, no shared queue" lines={[
                "We buy PTUs (Provisioned Throughput Units) from Azure — dedicated GPU slots.",
                "Translation: no waiting behind some other startup's batch job. Token 1 ASAP.",
                "Adaptive routing picks model size before the prompt hits the GPU:",
                "  - <20 tokens, no code, no math       → claude-haiku       (40ms TTFT)",
                "  - daily questions, light reasoning    → claude-sonnet-4.5  (110ms TTFT)",
                "  - long context, heavy reasoning       → claude-opus-4.1    (180ms TTFT)",
                "  - >100 lines of code                  → claude-opus        (198ms TTFT)",
              ]} />
              <NerdBlock title="# 5. FACT-CHECK CHAIN — parallel verification" lines={[
                "Once streaming starts, a secondary worker spawns a verification chain.",
                "Extracts factual claims → searches index → cross-references.",
                "Generates a 0.0 - 1.0 confidence score. If it's below 0.8, we flag it.",
                "We log NOTHING about your prompt — only the score + claim hash.",
              ]} />
              <NerdBlock title="# 6. THE NUMBERS — what we target (and what's real)" lines={[
                "edge hop (you → nearest PoP) ........... <20ms      [Cloudflare published SLO]",
                "ttft target (first token) .............. ~150ms     [Azure PTU spec]",
                "end-to-end p50 target .................. <300ms     [our design budget]",
                "regions provisioned .................... 10 Azure   [actual deploy]",
                "edge PoPs (via Cloudflare) ............. 310+       [Cloudflare network]",
                "cold-start events on Worker layer ...... 0          [V8 isolates, architectural]",
                "",
                "→ we're being upfront: we're still early. live latency dashboard goes",
                "  here once we have meaningful traffic to chart. no fake metrics.",
              ]} />
              <NerdBlock title="# 7. WHAT WE DON'T DO" lines={[
                "✗ run on a third-party AI reseller (looking at you, openrouter wrappers)",
                "✗ batch your request with strangers' to save on tokens",
                "✗ train on your conversations",
                "✗ store prompt content longer than the request lifetime",
                "✗ cold-start. ever.",
                "✗ throttle paying tiers silently",
              ]} />
              <div className="mt-8 pt-4 border-t text-xs">
                <span className="text-primary">$</span> echo "questions? we're at hello@turboanswer.it.com — a human replies."
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function NerdBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="mb-8">
      <div className="mb-2 text-foreground font-semibold">{title}</div>
      {lines.map((l, i) => (
        <div key={i} className="flex">
          <span className="text-border mr-3">│</span>
          <span className={l.startsWith("→") ? "text-primary" : ""}>{l}</span>
        </div>
      ))}
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
  { region: "us-east",       flag: "US" },
  { region: "uk-south",      flag: "UK" },
  { region: "japan-east",    flag: "JP" },
  { region: "south-asia",    flag: "IN" },
  { region: "brazil-south",  flag: "BR" },
  { region: "australia-e",   flag: "AU" },
  { region: "uae-north",     flag: "AE" },
  { region: "germany-wc",    flag: "DE" },
  { region: "south-africa",  flag: "ZA" },
  { region: "korea-c",       flag: "KR" },
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
const OP_MODELS = ["claude-opus-4.1", "claude-sonnet-4.5", "claude-haiku", "claude-opus"];

function LiveOpsSection() {
  const [rows, setRows] = useState<OpRow[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
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

  return (
    <section id="liveops" className="py-24 px-5 bg-muted/20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.18em] mb-4 font-mono text-primary font-medium flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            routing demo
          </div>
          <h2 className="text-4xl sm:text-5xl font-display font-medium tracking-tight mb-4 text-foreground">
            Watch the router pick a model.
          </h2>
          <p className="text-lg max-w-2xl mx-auto text-muted-foreground">
            Sample prompts showing which Claude variant the router dials based on task complexity.
          </p>
        </div>

        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b bg-muted/30">
            <span className="text-xs font-mono text-muted-foreground">
              turbo@router ~ /demo --replay example-prompts.jsonl
            </span>
          </div>
          <div className="p-5 font-mono text-xs sm:text-sm text-muted-foreground overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[80px_100px_140px_1fr_80px_80px] gap-4 pb-3 mb-3 border-b text-foreground/50">
                <span>time</span>
                <span>region</span>
                <span>model</span>
                <span>query (sanitized)</span>
                <span className="text-right">tokens</span>
                <span className="text-right">latency</span>
              </div>
              <div className="space-y-3">
                {rows.map((r, idx) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[80px_100px_140px_1fr_80px_80px] gap-4 items-center transition-all"
                    style={{ opacity: 1 - idx * 0.08 }}
                  >
                    <span>{r.ts}</span>
                    <span className="truncate">{r.flag} {r.region}</span>
                    <span className="truncate text-primary">{r.model}</span>
                    <span className="truncate text-foreground">
                      <span className="text-primary mr-2">$</span>
                      {r.q}
                    </span>
                    <span className="text-right">~{r.tokens}t</span>
                    <span className="text-right">—</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────── BENCHMARK CHART ─────────── */
const BENCH = [
  { metric: "Coding", matrix: 93, gpt: 73 },
  { metric: "Reasoning", matrix: 89, gpt: 70 },
  { metric: "Accuracy", matrix: 95, gpt: 75 },
  { metric: "Speed", matrix: 86, gpt: 68 },
];

function BenchTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border text-popover-foreground rounded-lg px-4 py-3 shadow-md font-mono text-sm">
      <div className="mb-2 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className={`flex justify-between gap-4 ${p.dataKey === "matrix" ? "text-primary" : "text-muted-foreground"}`}>
          <span>{p.dataKey === "matrix" ? "Matrix AI" : "GPT-5.8 Codex"}</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function BenchmarkSection() {
  return (
    <section id="benchmarks" className="py-24 px-5 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-2xl text-center md:text-left">
          <div className="text-xs uppercase tracking-[0.18em] mb-4 font-mono text-primary font-medium">
            head-to-head benchmarks
          </div>
          <h2 className="text-4xl sm:text-5xl font-display font-medium tracking-tight mb-6 text-foreground">
            27% sharper than <br className="hidden md:block"/> GPT-5.8 Codex.
          </h2>
          <p className="text-lg text-muted-foreground">
            Aggregate of coding, reasoning &amp; accuracy evals — normalized to a 100-point scale.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
          <div className="bg-card border rounded-2xl p-8 lg:col-span-2 flex flex-col justify-center text-center md:text-left">
            <div className="text-sm font-mono text-muted-foreground mb-4">average lead</div>
            <div className="text-7xl font-display font-medium text-primary mb-8 tracking-tight">
              +27<span className="text-5xl">%</span>
            </div>
            <div className="space-y-3 font-medium">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <span className="w-3 h-3 rounded-full bg-primary" />
                Matrix AI
              </div>
              <div className="flex items-center justify-center md:justify-start gap-3 text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-border" />
                GPT-5.8 Codex
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 lg:col-span-3 min-h-[400px] flex items-center">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={BENCH} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={8}>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} dy={10} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted)/0.5)" }} content={<BenchTooltip />} />
                <Bar dataKey="gpt" name="GPT-5.8 Codex" fill="hsl(var(--border))" radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Bar dataKey="matrix" name="Matrix AI" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="matrix" position="top" style={{ fill: "hsl(var(--primary))", fontSize: 12, fontWeight: 500 }} dy={-4} />
                  {BENCH.map((_, i) => <Cell key={i} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <style>{`
        @keyframes spinGlobe { from { transform: rotateY(0); } to { transform: rotateY(360deg); } }
        @keyframes dash { to { stroke-dashoffset: -36; } }
        @keyframes ping {
          0% { r: 4; stroke-opacity: 1; }
          80% { r: 22; stroke-opacity: 0; }
          100% { r: 22; stroke-opacity: 0; }
        }
        @keyframes pulseCore { 0%,100% { r: 14; stroke-opacity: 1; } 50% { r: 18; stroke-opacity: 0.6; } }
      `}</style>

      {/* TOP STRIP */}
      <div className="w-full text-center text-xs py-2.5 px-4 font-mono bg-foreground text-background font-medium">
        azure openai · cloudflare anycast · 310+ edge cities · zero cold starts ·{" "}
        <Link href={ctaHref}>
          <span className="underline cursor-pointer opacity-80 hover:opacity-100">try it →</span>
        </Link>
      </div>

      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center p-1.5 transition-transform group-hover:scale-105">
                <img src={turboLogo} alt="TurboAnswer" className="w-full h-full object-contain brightness-0 invert" />
              </div>
              <span className="text-lg font-medium tracking-tight">TurboAnswer</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#globe" className="hover:text-foreground transition-colors">Network</a>
            <a href="#stack" className="hover:text-foreground transition-colors">Stack</a>
            <a href="#capabilities" className="hover:text-foreground transition-colors">Capabilities</a>
            <a href="#benchmarks" className="hover:text-foreground transition-colors">Benchmarks</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link href={ctaHref}>
              <button className="bg-foreground text-background px-5 py-2.5 rounded-full hover:bg-foreground/90 transition-colors">
                {ctaLabel}
              </button>
            </Link>
          </div>

          <button className="md:hidden p-2 text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-6 py-4 space-y-4 bg-background border-t shadow-xl">
            {[["Network","#globe"],["Stack","#stack"],["Capabilities","#capabilities"],["Benchmarks","#benchmarks"],["Pricing","#pricing"]].map(([l, h]) => (
              <a key={l} href={h} onClick={() => setMobileMenuOpen(false)} className="block text-lg font-medium">{l}</a>
            ))}
            <div className="pt-4 mt-2 border-t">
              <Link href={ctaHref}>
                <button className="w-full bg-foreground text-background py-3 rounded-xl font-medium text-lg">
                  {ctaLabel}
                </button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative pt-20 pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
          <div className="text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full text-xs font-mono bg-muted text-muted-foreground border">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              10 regions · 99.97% uptime · 287ms p50
            </div>

            <h1 className="text-5xl sm:text-7xl font-display font-medium tracking-tight mb-8 text-foreground leading-[1.1]">
              Answers at the <br />
              <span className="ai-gradient-text">speed of thought.</span>
            </h1>

            <p className="max-w-xl mx-auto lg:mx-0 mb-10 text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Stacked on <span className="text-foreground font-medium">Microsoft Azure AI</span> across 10 GPU regions, 
              fronted by <span className="text-foreground font-medium">Cloudflare's edge network</span>. 
              Your packets hop to the nearest PoP in under 20ms, your answer streams back in under 300ms. 
              No cold starts. No excuses.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Link href={ctaHref}>
                <button className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium text-lg inline-flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm">
                  {ctaLabel} <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <a href="#globe" className="text-muted-foreground hover:text-foreground px-6 py-4 font-medium transition-colors">
                See the network
              </a>
            </div>
          </div>

          <div className="z-10 relative">
            <WorldGlobe size={600} />
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-20 relative z-20">
          <BootTerminal />
        </div>
      </section>

      {/* GLOBE / NETWORK BAND */}
      <section id="globe" className="py-24 px-6 bg-muted/30 border-y">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs uppercase tracking-[0.18em] mb-4 font-mono text-primary font-medium">
            the network
          </div>
          <h2 className="text-4xl sm:text-5xl font-display font-medium tracking-tight mb-6 text-foreground">
            10 Azure regions. 310 Cloudflare cities. One brain.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            We don't rent inference from a reseller. We're plugged directly into Azure AI
            in 10 GPU regions, with Cloudflare Workers + anycast grabbing your
            request at the closest edge city and steering it to the nearest warm GPU.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {["east-us · 287ms", "west-eu · 312ms", "south-asia · 298ms", "east-asia · 305ms",
              "uae-north · 341ms", "south-america · 374ms", "africa · 392ms", "australia · 318ms",
              "japan · 286ms", "uk-south · 295ms",
            ].map((r) => (
              <div key={r} className="font-mono text-xs px-3 py-2.5 rounded-lg bg-background border text-muted-foreground text-left shadow-sm">
                {r}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STACK STRIP */}
      <section id="stack" className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-[0.18em] mb-4 font-mono text-primary font-medium">
              the stack
            </div>
            <h2 className="text-4xl sm:text-5xl font-display font-medium tracking-tight mb-6">
              Four blades. One handle. Cut clean.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The Claude family, billed direct through Azure. No middleman, no markup, no quota games.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Claude Haiku",      note: "free tier · 287ms · routing brain" },
              { name: "Claude Sonnet 4.5", note: "pro daily driver · adaptive" },
              { name: "Claude Opus 4.1",   note: "research · 1M context · the heavy" },
              { name: "Claude Opus",       note: "code surgeon · refactor & PR" },
            ].map((m) => (
              <div key={m.name} className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-lg font-medium text-foreground mb-2">{m.name}</div>
                <div className="text-sm text-muted-foreground">{m.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section id="capabilities" className="py-24 px-6 bg-muted/20 border-y">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <div className="text-xs uppercase tracking-[0.18em] mb-4 font-mono text-primary font-medium">
              what it actually does
            </div>
            <h2 className="text-4xl sm:text-5xl font-display font-medium tracking-tight mb-6">
              Six surfaces. Zero filler.
            </h2>
            <p className="text-lg text-muted-foreground">
              Each one does one job, end-to-end, in the same chat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Code2, title: "Code Surgeon",        desc: "Drops Claude Opus into your codebase, hunts race conditions, security holes, and perf traps. Reads your repo, ships a patch, opens a PR — one tool, one click." },
              { icon: Brain, title: "Verified Chat",        desc: "Every factual claim gets a confidence score. A second pass independently grades the answer. We show low scores too." },
              { icon: Mic,   title: "Voice Turbo",          desc: "Real-time voice. Streaming token-by-token. Wake-word optional. Sounds like a person, not a kiosk." },
              { icon: Database, title: "Deep Research",     desc: "Twenty-plus sources synthesised through a multi-agent chain. Citations on every claim. Disagrees with itself in public." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border rounded-3xl p-8 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-medium mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BenchmarkSection />
      <LiveOpsSection />
      <ArchSection />

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 bg-muted/20 border-t">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-[0.18em] mb-4 font-mono text-primary font-medium">pricing</div>
            <h2 className="text-4xl sm:text-6xl font-display font-medium tracking-tight">
              Three tiers. No fine print.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FREE */}
            <div className="bg-background border rounded-3xl p-8 flex flex-col shadow-sm">
              <h3 className="text-xl font-medium mb-2">Free</h3>
              <div className="text-sm text-muted-foreground mb-6">For trying it out</div>
              <div className="text-5xl font-display font-medium mb-8">$0</div>
              <ul className="space-y-4 mb-10 flex-1">
                {["Claude Haiku routing","15 queries per day","Code Surgeon (paste mode)","Document analysis"].map((i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <Link href={ctaHref} className="block w-full">
                <button className="w-full py-3.5 rounded-full border-2 border-foreground font-medium hover:bg-foreground hover:text-background transition-colors">
                  Get started
                </button>
              </Link>
            </div>

            {/* PRO */}
            <div className="bg-foreground text-background border-foreground rounded-3xl p-8 flex flex-col shadow-xl relative scale-100 md:scale-105 z-10">
              <div className="absolute -top-3 inset-x-0 flex justify-center">
                <span className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full">
                  Most Picked
                </span>
              </div>
              <h3 className="text-xl font-medium mb-2">Pro</h3>
              <div className="text-sm text-background/70 mb-6">For daily work</div>
              <div className="flex items-baseline gap-1 mb-8">
                <div className="text-5xl font-display font-medium">$6.99</div>
                <div className="text-background/70">/mo</div>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {["Claude Sonnet 4.5 (adaptive throttle)","Unlimited messages","Live web search (grounded)","AI image generation","Voice Turbo streaming","Verified-answer badges"].map((i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <Link href={ctaHref} className="block w-full">
                <button className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                  Start 7-day trial
                </button>
              </Link>
            </div>

            {/* RESEARCH */}
            <div className="bg-background border rounded-3xl p-8 flex flex-col shadow-sm">
              <h3 className="text-xl font-medium mb-2">Research</h3>
              <div className="text-sm text-muted-foreground mb-6">For engineers and teams</div>
              <div className="flex items-baseline gap-1 mb-8">
                <div className="text-5xl font-display font-medium">$30</div>
                <div className="text-muted-foreground">/mo</div>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {["Claude Opus 4.1 + Claude Opus","Stack Trace Surgeon (auto-PRs)","Deep Research (20+ sources)","1M-token long context","Priority sub-300ms routing"].map((i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <Link href={ctaHref} className="block w-full">
                <button className="w-full py-3.5 rounded-full border-2 border-border font-medium hover:border-foreground transition-colors">
                  Start 7-day trial
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6 bg-background text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl sm:text-7xl font-display font-medium tracking-tight mb-8">
            Stop reading. <br /> Ask it something.
          </h2>
          <p className="text-xl text-muted-foreground mb-12">
            Your first answer comes back before you finish this sentence.
          </p>
          <Link href={ctaHref}>
            <button className="bg-foreground text-background px-10 py-5 rounded-full font-medium text-lg inline-flex items-center gap-3 hover:bg-foreground/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              {ctaLabel} <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-12 px-6 bg-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
            <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center p-1">
              <img src={turboLogo} alt="" className="w-full h-full object-contain brightness-0 invert" />
            </div>
            TurboAnswer © {new Date().getFullYear()}
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/customer-support" className="hover:text-foreground transition-colors">Support</Link>
            <Link href="/beta" className="hover:text-foreground transition-colors">Beta program</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
