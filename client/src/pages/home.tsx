import { useState } from "react";
import { Link } from "wouter";
import {
  MessageSquare, Brain, LogOut, Code2, Sparkles, ArrowRight, X,
  Film, Camera, Scissors, HandHeart, Users, Crown, Zap, CheckCircle,
  Globe, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/hooks/use-lang";

const G = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

function GoogleG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

function AIModelBadge({ name, color, icon }: { name: string; color: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border font-semibold text-xs"
      style={{ borderColor: `${color}40`, background: `${color}12`, color }}>
      <span className="text-sm">{icon}</span>{name}
    </div>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const { lang, setLang, tr, langMeta, LANGUAGES } = useLang();
  const [showLang, setShowLang] = useState(false);

  const displayName = user?.firstName || user?.email?.split("@")[0] || "User";
  const isEnterprise = user?.subscriptionTier === "enterprise" && user?.subscriptionStatus === "active";
  const isResearch = user?.subscriptionTier === "research" && user?.subscriptionStatus === "active";

  return (
    <div className="min-h-screen bg-[#060610] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Top Nav ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] sticky top-0 z-20" style={{ background: "rgba(6,6,16,0.92)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2.5">
          <Zap className="h-6 w-6 text-blue-400" />
          <span className="text-lg font-black bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">TurboAnswer</span>
          {isEnterprise && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(251,188,5,0.15)", color: "#FBBC05", border: "1px solid rgba(251,188,5,0.3)" }}>
              ENTERPRISE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="relative">
            <button onClick={() => setShowLang(v => !v)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm px-2.5 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/20">
              <Globe size={13} />{langMeta.flag} {lang.toUpperCase()}<ChevronDown size={11} />
            </button>
            {showLang && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                style={{ background: "#0f0f1e" }}>
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setShowLang(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors text-left"
                    style={{ color: lang === l.code ? "#4285F4" : "#cbd5e1", fontWeight: lang === l.code ? 700 : 400 }}>
                    <span className="text-base">{l.flag}</span>{l.label}
                    {lang === l.code && <CheckCircle size={12} className="ml-auto text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-500 hidden sm:block">Hi, {displayName}</span>
          <a href="/api/logout">
            <button className="p-1.5 bg-red-600/15 hover:bg-red-600/30 border border-red-500/20 rounded-lg transition-colors" title={tr.nav.logout}>
              <LogOut size={14} className="text-red-400" />
            </button>
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-7 space-y-6">

        {/* ── ENTERPRISE HERO BANNER ── */}
        <div className="relative rounded-3xl overflow-hidden" style={{ border: "1.5px solid rgba(251,188,5,0.35)" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #12100a 0%, #1a1200 40%, #0d0e00 100%)" }} />
          <div className="absolute top-0 left-0 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: "#FBBC05" }} />
          <div className="absolute bottom-0 right-0 w-60 h-60 rounded-full opacity-15 blur-3xl" style={{ background: "#f59e0b" }} />
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(251,188,5,0.15)", color: "#FBBC05", border: "1px solid rgba(251,188,5,0.4)" }}>
              <Crown size={12} /> BEST VALUE — SAVE 44%
            </div>
          </div>

          <div className="relative z-10 p-8 md:p-10">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(251,188,5,0.15)", border: "1px solid rgba(251,188,5,0.3)" }}>
                    <Crown className="w-5 h-5" style={{ color: "#FBBC05" }} />
                  </div>
                  <div>
                    <div className="text-xs font-bold tracking-widest" style={{ color: "#FBBC05" }}>ENTERPRISE PLAN</div>
                    <div className="text-xl font-black text-white">The Ultimate AI Team Stack</div>
                  </div>
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed max-w-xl">
                  One subscription. Up to <strong className="text-white">5 team members</strong>. Every AI model — <strong className="text-white">Gemini 3.1 Pro</strong>, <strong style={{ color: "#EA4335" }}>Claude Opus</strong>, and <strong style={{ color: "#10b981" }}>ChatGPT-4o</strong> — all working together. Plus <strong style={{ color: "#FBBC05" }}>Code Studio FREE</strong>, AI Video Studio, and everything in Research.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-7">
                  {[
                    { icon: "⚡", text: "All AI Models (Gemini + Claude + GPT-4o)", color: "#4285F4" },
                    { icon: "👥", text: "Up to 5 team members", color: "#FBBC05" },
                    { icon: "💻", text: "Code Studio FREE ($15/mo value)", color: "#34A853" },
                    { icon: "🎬", text: "AI Video Studio (Veo 3.1)", color: "#8b5cf6" },
                    { icon: "🔑", text: "Shareable 6-digit team code", color: "#22d3ee" },
                    { icon: "💰", text: "Save 44% vs 5 individual plans", color: "#EA4335" },
                  ].map(({ icon, text, color }) => (
                    <div key={text} className="flex items-start gap-2 text-xs text-gray-300">
                      <span className="text-sm shrink-0">{icon}</span>
                      <span style={{ color: "#d1d5db" }}>{text}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  {isEnterprise ? (
                    <div className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm" style={{ background: "rgba(251,188,5,0.15)", border: "1px solid rgba(251,188,5,0.4)", color: "#FBBC05" }}>
                      <CheckCircle size={16} /> You're on Enterprise — Full Access Active
                    </div>
                  ) : (
                    <>
                      <Link href="/pricing">
                        <button className="px-6 py-3 rounded-xl font-bold text-sm text-black shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-all"
                          style={{ background: "linear-gradient(135deg, #FBBC05, #f59e0b)" }}>
                          Get Enterprise — $100/mo
                        </button>
                      </Link>
                      <Link href="/support">
                        <button className="px-5 py-3 rounded-xl font-semibold text-sm border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 transition-all">
                          Custom Team Plans →
                        </button>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Price block */}
              <div className="shrink-0 text-center p-6 rounded-2xl" style={{ background: "rgba(251,188,5,0.06)", border: "1px solid rgba(251,188,5,0.2)", minWidth: 170 }}>
                <div className="text-5xl font-black text-white mb-1">$100</div>
                <div className="text-sm text-gray-400 mb-4">/month</div>
                <div className="text-xs text-gray-300 space-y-1">
                  <div style={{ color: "#6ee7b7" }}>✓ 5 members × $20 each</div>
                  <div style={{ color: "#6ee7b7" }}>✓ vs $150 individual</div>
                  <div style={{ color: "#FBBC05", fontWeight: 700 }}>✓ Code Studio FREE</div>
                  <div style={{ color: "#FBBC05", fontWeight: 700 }}>✓ 7-day free trial</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CODE STUDIO MEGA HERO ── */}
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.08]">
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #080820 0%, #0d0a2e 40%, #0a0d2e 100%)" }} />
          <div className="absolute top-0 left-0 w-72 h-72 rounded-full opacity-25 blur-3xl" style={{ background: "#8b5cf6" }} />
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-15 blur-3xl" style={{ background: "#22d3ee" }} />
          <div className="absolute bottom-0 left-1/2 w-56 h-56 rounded-full opacity-15 blur-3xl" style={{ background: "#a78bfa" }} />

          <div className="relative z-10 p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs px-3 py-1.5 rounded-full font-bold" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.35)" }}>
                    ⚡ ANTIGRAVITY ENGINE
                  </span>
                  {isEnterprise && (
                    <span className="text-xs px-3 py-1.5 rounded-full font-bold" style={{ background: "rgba(251,188,5,0.12)", color: "#FBBC05", border: "1px solid rgba(251,188,5,0.3)" }}>
                      🏆 FREE with Enterprise
                    </span>
                  )}
                  {!isEnterprise && (
                    <span className="text-xs px-3 py-1.5 rounded-full font-bold" style={{ background: "rgba(52,168,83,0.12)", color: "#34A853", border: "1px solid rgba(52,168,83,0.3)" }}>
                      7-day free trial
                    </span>
                  )}
                </div>

                <h1 className="text-4xl md:text-5xl font-black mb-3 leading-tight" style={{ background: "linear-gradient(135deg, #a78bfa, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Code Studio
                </h1>
                <p className="text-xl font-semibold text-white/90 mb-2">Build Full Apps from One Sentence</p>
                <p className="text-gray-400 mb-1 max-w-lg leading-relaxed">
                  Type your idea in plain English. Gemini 3.1 Pro + Claude design, write, and ship your entire app — HTML, CSS, JS — in under 30 seconds.
                </p>
                <p className="text-sm mb-5" style={{ color: "#a78bfa" }}>
                  Priced at $0.02/line · 10 lines = $0.20 · {isEnterprise ? "$15/mo FREE with Enterprise" : "$15/mo after trial"}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {[
                    { label: "Full Apps — HTML/CSS/JS", color: "#8b5cf6" },
                    { label: "Live Preview + Deploy URL", color: "#22d3ee" },
                    { label: "Monaco Editor (VS Code)", color: "#a78bfa" },
                    { label: "Piston Code Execution", color: "#06b6d4" },
                    { label: "$0.02/line Pricing", color: "#34A853" },
                    { label: isEnterprise ? "FREE for You" : "7-Day Trial", color: "#FBBC05" },
                  ].map(({ label, color }) => (
                    <span key={label} className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: `${color}15`, border: `1px solid ${color}35`, color }}>
                      {label}
                    </span>
                  ))}
                </div>

                <Link href="/code-studio">
                  <Button className="gap-2 px-7 py-3 text-base font-bold rounded-xl text-white shadow-2xl shadow-purple-500/20"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #22d3ee)" }}>
                    <Code2 className="h-5 w-5" />
                    {isEnterprise ? "Open Code Studio (Free)" : "Start Building Free"}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>

              {/* Visual icon */}
              <div className="shrink-0 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 blur-2xl opacity-40 rounded-full" style={{ background: "conic-gradient(from 0deg, #8b5cf6, #22d3ee, #a78bfa, #06b6d4, #8b5cf6)" }} />
                  <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-3xl flex items-center justify-center shadow-2xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <Code2 className="w-20 h-20 md:w-28 md:h-28" style={{ color: "#a78bfa" }} />
                  </div>
                  {G.map((color, i) => {
                    const positions = [{ top: "-8px", right: "20px" }, { top: "20px", right: "-8px" }, { bottom: "-8px", left: "20px" }, { bottom: "20px", left: "-8px" }];
                    return <div key={i} className="absolute w-4 h-4 rounded-full shadow-lg" style={{ background: color, boxShadow: `0 0 12px ${color}`, ...positions[i] }} />;
                  })}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="mt-8 pt-6 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { step: "1", icon: "💬", title: "Describe It", desc: "Plain English prompt", color: "#8b5cf6" },
                { step: "2", icon: "🧠", title: "AI Builds It", desc: "Gemini 3.1 Pro + Claude architect your app", color: "#4285F4" },
                { step: "3", icon: "⚡", title: "Code Appears", desc: "Watch it build live", color: "#a78bfa" },
                { step: "4", icon: "🚀", title: "Go Live", desc: "Instant public URL", color: "#22d3ee" },
              ].map(({ step, icon, title, desc, color }) => (
                <div key={step} className="text-center">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl mx-auto mb-2" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>{icon}</div>
                  <div className="text-[10px] font-bold mb-0.5" style={{ color }}>STEP {step}</div>
                  <div className="text-sm font-semibold text-white mb-0.5">{title}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── AI MODELS SHOWCASE ── */}
        <div className="rounded-2xl border border-white/[0.06] p-6" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-white">Powered by the World's Best AI Models</span>
          </div>
          <p className="text-sm text-gray-400 mb-5">TurboAnswer routes your questions to the right model automatically — the fastest, smartest answer every time.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                name: "Gemini 3.1 Pro", company: "Google", color: "#4285F4",
                tag: "Speed + Research", icon: <GoogleG className="w-6 h-6" />,
                desc: "Ultra-fast responses, real-time search, and deep research. Powers Free, Pro, and all tiers.",
                plans: ["Free", "Pro", "Research", "Enterprise"],
              },
              {
                name: "Claude Opus", company: "Anthropic", color: "#EA4335",
                tag: "Deep Reasoning", icon: <span className="text-xl">🧠</span>,
                desc: "The best model for complex reasoning, long-form writing, and code architecture. Research & Enterprise.",
                plans: ["Research", "Enterprise"],
              },
              {
                name: "ChatGPT-4o", company: "OpenAI", color: "#34A853",
                tag: "Versatility + Vision", icon: <span className="text-xl">🤖</span>,
                desc: "Multimodal intelligence — text, code, images. Exceptional general-purpose performance. Research & Enterprise.",
                plans: ["Research", "Enterprise"],
              },
            ].map(({ name, company, color, tag, icon, desc, plans }) => (
              <div key={name} className="rounded-2xl p-5 border" style={{ background: `${color}08`, borderColor: `${color}25` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                    {icon}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{name}</div>
                    <div className="text-xs text-gray-500">{company}</div>
                  </div>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>{tag}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">{desc}</p>
                <div className="flex flex-wrap gap-1">
                  {plans.map(p => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick Actions Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/chat">
            <div className="group relative rounded-2xl border border-white/[0.08] p-5 cursor-pointer overflow-hidden transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10" style={{ background: "linear-gradient(135deg, #0d1b3e 0%, #060610 100%)" }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: "#4285F4" }} />
              <MessageSquare className="h-8 w-8 mb-3" style={{ color: "#4285F4" }} />
              <h3 className="text-lg font-bold text-white mb-1">{tr.nav.chat}</h3>
              <p className="text-sm text-gray-400">{tr.chat.greeting}</p>
              <ArrowRight className="h-4 w-4 mt-3 text-gray-600 group-hover:text-blue-400 transition-colors" />
            </div>
          </Link>

          <Link href="/video-studio">
            <div className="group relative rounded-2xl border border-white/[0.08] p-5 cursor-pointer overflow-hidden transition-all hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10" style={{ background: "linear-gradient(135deg, #1a0d3e 0%, #060610 100%)" }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: "#8b5cf6" }} />
              <div className="flex items-center gap-2 mb-3">
                <Film className="h-8 w-8 text-violet-400" />
                {(isEnterprise || isResearch) && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}>Included</span>}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{tr.nav.videoStudio}</h3>
              <p className="text-sm text-gray-400">AI video generation — Google Veo 3.1</p>
              <ArrowRight className="h-4 w-4 mt-3 text-gray-600 group-hover:text-violet-400 transition-colors" />
            </div>
          </Link>

          <Link href="/media-editor">
            <div className="group relative rounded-2xl border border-white/[0.08] p-5 cursor-pointer overflow-hidden transition-all hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-500/10" style={{ background: "linear-gradient(135deg, #2e0d1a 0%, #060610 100%)" }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: "#EC4899" }} />
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="h-8 w-8 text-rose-400" />
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(236,72,153,0.15)", color: "#F472B6", border: "1px solid rgba(236,72,153,0.3)" }}>CapCut Style</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{tr.nav.mediaEditor}</h3>
              <p className="text-sm text-gray-400">Edit photos & videos with AI filters</p>
              <ArrowRight className="h-4 w-4 mt-3 text-gray-600 group-hover:text-rose-400 transition-colors" />
            </div>
          </Link>

          <Link href="/photo-editor">
            <div className="group relative rounded-2xl border border-white/[0.08] p-5 cursor-pointer overflow-hidden transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10" style={{ background: "linear-gradient(135deg, #0d1b3e 0%, #060610 100%)" }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: "#4285F4" }} />
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-8 w-8 text-blue-400" />
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(66,133,244,0.15)", color: "#4285F4", border: "1px solid rgba(66,133,244,0.3)" }}>Free · Gemini Vision</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{tr.nav.aiScanner}</h3>
              <p className="text-sm text-gray-400">Scan docs, receipts & images — AI reads them</p>
              <ArrowRight className="h-4 w-4 mt-3 text-gray-600 group-hover:text-blue-400 transition-colors" />
            </div>
          </Link>

          <Link href="/crisis-info">
            <div className="group relative rounded-2xl border border-white/[0.08] p-5 cursor-pointer overflow-hidden transition-all hover:border-pink-500/40" style={{ background: "linear-gradient(135deg, #2d0d1e 0%, #060610 100%)" }}>
              <HandHeart className="h-8 w-8 mb-3 text-pink-400" />
              <h3 className="text-lg font-bold text-white mb-1">Crisis Support</h3>
              <p className="text-sm text-gray-400">24/7 private, encrypted mental health support</p>
              <ArrowRight className="h-4 w-4 mt-3 text-gray-600 group-hover:text-pink-400 transition-colors" />
            </div>
          </Link>

          <Link href="/ai-settings">
            <div className="group relative rounded-2xl border border-white/[0.08] p-5 cursor-pointer overflow-hidden transition-all hover:border-gray-600" style={{ background: "linear-gradient(135deg, #111118 0%, #060610 100%)" }}>
              <Brain className="h-8 w-8 mb-3 text-gray-400" />
              <h3 className="text-lg font-bold text-white mb-1">{tr.settings.title}</h3>
              <p className="text-sm text-gray-400">Switch models, manage subscription, {tr.settings.language.toLowerCase()}</p>
              <ArrowRight className="h-4 w-4 mt-3 text-gray-600 group-hover:text-gray-300 transition-colors" />
            </div>
          </Link>
        </div>

        {/* ── Enterprise mini CTA strip ── */}
        {!isEnterprise && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl px-6 py-4 border" style={{ background: "rgba(251,188,5,0.05)", borderColor: "rgba(251,188,5,0.2)" }}>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 shrink-0" style={{ color: "#FBBC05" }} />
              <div>
                <div className="text-sm font-bold text-white">Running a team? Enterprise saves you 44%</div>
                <div className="text-xs text-gray-400">5 members · All models · Code Studio free · $100/mo</div>
              </div>
            </div>
            <Link href="/pricing">
              <button className="px-5 py-2.5 rounded-xl font-bold text-sm text-black whitespace-nowrap" style={{ background: "linear-gradient(135deg, #FBBC05, #f59e0b)" }}>
                See Enterprise →
              </button>
            </Link>
          </div>
        )}

        {/* ── Bottom links ── */}
        <div className="flex flex-wrap justify-center gap-3 pb-4">
          <Link href="/pricing"><Button variant="outline" className="border-white/10 text-gray-400 hover:bg-white/5 hover:text-white">{tr.nav.pricing}</Button></Link>
          <Link href="/support"><Button variant="outline" className="border-white/10 text-gray-400 hover:bg-white/5 hover:text-white">{tr.nav.support}</Button></Link>
          {user?.isAdmin && <Link href="/admin"><Button variant="outline" className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10">Admin Panel</Button></Link>}
        </div>
      </div>
    </div>
  );
}
