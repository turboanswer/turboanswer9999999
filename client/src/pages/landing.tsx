import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Brain, Sparkles, ArrowRight, Check, Menu, X,
  Stethoscope, GitPullRequest, CheckCircle, Crown,
  Microscope, Shield, MessageSquare, ChevronRight, Star,
} from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import TurboLogo from "@/components/TurboLogo";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const D = theme === "dark";
  const { isAuthenticated, user } = useAuth();
  const ctaHref = isAuthenticated ? "/chat" : "/login";
  const ctaLabel = isAuthenticated ? "Go to Chat" : "Login / Sign Up";

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Matrix AI Chat",
      desc: "Cited, verified answers with confidence ratings. Not guesses.",
      color: "#10b981",
    },
    {
      icon: <Stethoscope className="h-6 w-6" />,
      title: "Stack Trace Surgeon",
      desc: "Paste an error and a repo. Sonnet 4.5 finds the cause and opens a real PR with the fix.",
      color: "#a855f7",
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Self-Verification",
      desc: "Every answer rates its own confidence and flags anything it cannot fully back up.",
      color: "#3b82f6",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: D ? "#000" : "#fff", color: D ? "#fff" : "#111" }}>

      {/* ===== NAV ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: D ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TurboLogo size={28} animated={false} />
            <span className="text-base font-bold tracking-tight">TurboAnswer</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className={`text-sm transition-colors ${D ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>Features</a>
            <a href="#pricing" className={`text-sm transition-colors ${D ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>Pricing</a>
            <button onClick={toggleTheme} aria-label="Toggle theme" className={`p-2 rounded-lg transition-colors ${D ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
              {D ? <span className="text-sm">☀</span> : <span className="text-sm">☾</span>}
            </button>
            <Link href={ctaHref}>
              <Button size="sm" className={`font-semibold px-5 rounded-lg ${D ? "bg-white hover:bg-gray-100 text-black" : "bg-gray-900 hover:bg-gray-800 text-white"}`} data-testid="button-nav-cta">
                {ctaLabel}
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={toggleTheme} aria-label="Toggle theme" className={`p-2 rounded-lg ${D ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
              {D ? <span>☀</span> : <span>☾</span>}
            </button>
            <button aria-label="Toggle menu" className={`p-2 ${D ? "text-gray-300" : "text-gray-600"}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t px-4 py-4 space-y-2" style={{ borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", background: D ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.98)" }}>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}><Button variant="ghost" className={`w-full justify-start ${D ? "text-gray-300" : "text-gray-600"}`}>Features</Button></a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}><Button variant="ghost" className={`w-full justify-start ${D ? "text-gray-300" : "text-gray-600"}`}>Pricing</Button></a>
            <Link href={ctaHref}><Button className={`w-full font-semibold rounded-lg ${D ? "bg-white hover:bg-gray-100 text-black" : "bg-gray-900 hover:bg-gray-800 text-white"}`}>{ctaLabel}</Button></Link>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden" style={{ minHeight: "100vh", background: D ? "#05060a" : "#fafbfc" }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: D
            ? "linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)"
            : "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, #000 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, #000 30%, transparent 80%)",
        }} />
        <div className="absolute pointer-events-none" style={{
          top: "10%", left: "50%", transform: "translateX(-50%)",
          width: 900, height: 600,
          background: "radial-gradient(ellipse, rgba(16,185,129,0.18), rgba(16,185,129,0.04) 40%, transparent 70%)",
          filter: "blur(40px)",
        }} />

        <style>{`
          @keyframes shieldPulse { 0%,100% { transform: scale(1); opacity: 0.95; } 50% { transform: scale(1.03); opacity: 1; } }
          @keyframes verifyPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes checkDraw { from { stroke-dashoffset: 30; } to { stroke-dashoffset: 0; } }
          @keyframes typing { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
          @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
          .ta-verify-badge { animation: verifyPop 0.6s 1.4s cubic-bezier(0.34,1.56,0.64,1) both; }
          .ta-check-path { stroke-dasharray: 30; stroke-dashoffset: 30; animation: checkDraw 0.5s 1.7s ease-out forwards; }
          .ta-shield { animation: shieldPulse 4s ease-in-out infinite; }
          .ta-typing-dot { animation: typing 1.4s ease-in-out infinite; }
          .ta-shimmer-text { background: linear-gradient(90deg, ${D ? '#fff' : '#0a0a0a'} 30%, #10b981 50%, ${D ? '#fff' : '#0a0a0a'} 70%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 6s linear infinite; }
        `}</style>

        <div className="relative z-10 max-w-7xl mx-auto px-5 pt-28 sm:pt-32 pb-20">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">

            {/* LEFT — headline */}
            <div className="text-left">
              <h1 className={`font-black tracking-tight leading-[0.92] mb-6 ${D ? "text-white" : "text-gray-900"}`}
                style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
                AI you can <br />
                <span className="ta-shimmer-text">actually trust.</span>
              </h1>

              <p className={`text-lg sm:text-xl max-w-xl mb-10 leading-relaxed ${D ? "text-gray-400" : "text-gray-600"}`}>
                Verified answers, not confident guesses. <strong className={D ? "text-white" : "text-gray-900"}>Matrix AI</strong> cites every source and rates its own confidence — so you always know when to trust it.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                <Link href={ctaHref}>
                  <button data-testid="button-hero-start" className="group flex items-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold transition-all text-white hover:scale-[1.02] active:scale-[0.98]" style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    boxShadow: "0 10px 40px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}>
                    Start free
                    <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </Link>
              </div>

              <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-sm ${D ? "text-gray-500" : "text-gray-500"}`}>
                <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Free forever</span>
                <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Cited sources</span>
              </div>
            </div>

            {/* RIGHT — chat demo */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-3xl pointer-events-none" style={{
                background: "radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)",
                filter: "blur(40px)",
              }} />

              <div className="relative rounded-2xl border overflow-hidden shadow-2xl" style={{
                background: D ? "rgba(10,12,18,0.85)" : "rgba(255,255,255,0.95)",
                borderColor: D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                backdropFilter: "blur(20px)",
                boxShadow: D ? "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1)" : "0 30px 80px rgba(0,0,0,0.12)",
              }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f56" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#27c93f" }} />
                  </div>
                  <div className={`text-xs ml-2 font-mono ${D ? "text-gray-500" : "text-gray-400"}`}>turboanswer.it.com</div>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-medium" style={{
                      background: D ? "#1f2937" : "#f3f4f6",
                      color: D ? "#fff" : "#111827",
                    }}>
                      Is the Great Wall of China visible from space?
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="ta-shield w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      boxShadow: "0 4px 16px rgba(16,185,129,0.4)",
                    }}>
                      <Shield size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm leading-relaxed mb-2 ${D ? "text-gray-200" : "text-gray-800"}`}>
                        <strong>No.</strong> Despite the popular myth, the Great Wall is not visible to the naked eye from low Earth orbit. NASA astronauts have confirmed this — the wall is too narrow (~30 ft wide) at that distance.
                      </div>

                      <div className="ta-verify-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{
                        background: "rgba(16,185,129,0.12)",
                        border: "1px solid rgba(16,185,129,0.35)",
                        color: D ? "#34d399" : "#059669",
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="currentColor" opacity="0.18" />
                          <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                          <path className="ta-check-path" d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Verified by Matrix AI
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <div className="flex gap-1">
                      <div className="ta-typing-dot w-1.5 h-1.5 rounded-full" style={{ background: D ? "#6b7280" : "#9ca3af" }} />
                      <div className="ta-typing-dot w-1.5 h-1.5 rounded-full" style={{ background: D ? "#6b7280" : "#9ca3af", animationDelay: "0.2s" }} />
                      <div className="ta-typing-dot w-1.5 h-1.5 rounded-full" style={{ background: D ? "#6b7280" : "#9ca3af", animationDelay: "0.4s" }} />
                    </div>
                    <span className={`text-xs ${D ? "text-gray-500" : "text-gray-400"}`}>Matrix AI verifying…</span>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-8 -left-4 sm:-left-10 rounded-2xl px-4 py-3 border shadow-xl z-20" style={{
                background: D ? "rgba(15,17,25,0.95)" : "#fff",
                borderColor: D ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                backdropFilter: "blur(20px)",
              }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                    <Check size={20} className="text-emerald-500" strokeWidth={3} />
                  </div>
                  <div>
                    <div className={`text-xl font-black ${D ? "text-white" : "text-gray-900"}`}>99.2%</div>
                    <div className={`text-[10px] uppercase tracking-wider font-bold ${D ? "text-gray-500" : "text-gray-500"}`}>Accuracy verified</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES — three things that matter ===== */}
      <section id="features" className="py-24 sm:py-32 px-5 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className={`text-4xl sm:text-5xl font-black tracking-tight mb-4 ${D ? "text-white" : "text-gray-900"}`}>
              Three things others can't do.
            </h2>
            <p className={`text-lg max-w-xl mx-auto ${D ? "text-gray-500" : "text-gray-500"}`}>
              No feature dump. Just what makes TurboAnswer different.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map(({ icon, title, desc, color }) => (
              <div key={title} className={`rounded-2xl p-7 border h-full transition-all ${D ? "hover:border-white/[0.12]" : "hover:border-gray-200 hover:shadow-lg"}`} style={{ background: D ? `linear-gradient(145deg, ${color}10, #0a0a0a)` : "#fff", borderColor: D ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${color}15`, color }}>
                  {icon}
                </div>
                <h3 className={`text-lg font-bold mb-2 ${D ? "text-white" : "text-gray-900"}`}>{title}</h3>
                <p className={`text-sm leading-relaxed ${D ? "text-gray-400" : "text-gray-500"}`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STACK TRACE SURGEON — slimmed ===== */}
      <section className="py-20 px-5 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden border" style={{ borderColor: D ? "rgba(168,85,247,0.25)" : "rgba(168,85,247,0.3)", background: D ? "linear-gradient(135deg, #150a1e, #1a0d2e)" : "linear-gradient(135deg, #faf5ff, #f3e8ff)" }}>
            <div className="p-8 sm:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-5" style={{ background: D ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.1)", border: `1px solid ${D ? "rgba(168,85,247,0.3)" : "rgba(168,85,247,0.25)"}`, color: D ? "#c084fc" : "#9333ea" }}>
                    <Sparkles className="h-3.5 w-3.5" /> The new thing
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
                    <span style={{ color: D ? "#c084fc" : "#9333ea" }}>Stack Trace</span><br />
                    <span className={D ? "text-white" : "text-gray-900"}>Surgeon.</span>
                  </h2>
                  <p className={`text-base sm:text-lg mb-6 leading-relaxed ${D ? "text-gray-300" : "text-gray-700"}`}>
                    Paste a stack trace. Drop in your repo URL. Sonnet 4.5 reads the actual files, finds the root cause, and ships the fix as a real GitHub PR — ready for you to review.
                  </p>
                  <Link href="/stack-trace-surgeon">
                    <Button data-testid="button-try-surgeon" className="rounded-xl h-12 px-7 font-bold text-base text-white shadow-xl" style={{ background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)", boxShadow: "0 10px 30px rgba(168,85,247,0.35)" }}>
                      <Stethoscope className="h-4 w-4 mr-2" />
                      Try it now
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>

                {/* Mock surgeon UI */}
                <div className="rounded-2xl border overflow-hidden shadow-2xl" style={{ background: D ? "#0a0a14" : "#ffffff", borderColor: D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" /><span className="w-2.5 h-2.5 rounded-full bg-green-500/70" /></div>
                      <span className={`text-[11px] ml-2 font-mono ${D ? "text-gray-500" : "text-gray-400"}`}>surgeon.turboanswer.it</span>
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc" }}>
                      <Sparkles className="h-2.5 w-2.5" /> SONNET 4.5
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="rounded-lg p-3 font-mono text-[11px] leading-relaxed" style={{ background: D ? "#000" : "#f8fafc", border: `1px solid ${D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, color: D ? "#fca5a5" : "#dc2626" }}>
                      <div>TypeError: Cannot read properties of undefined</div>
                      <div className={D ? "text-gray-500" : "text-gray-500"}>  at UserList (src/UserList.tsx:24:18)</div>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: D ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)", border: `1px solid ${D ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.2)"}` }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        <span className={`text-xs font-bold ${D ? "text-emerald-300" : "text-emerald-700"}`}>Root cause found</span>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${D ? "text-gray-300" : "text-gray-700"}`}>
                        <code className="font-mono">users</code> prop is undefined on first render. Add default <code className="font-mono">users = []</code>.
                      </p>
                    </div>
                    <div className="rounded-lg p-2.5 flex items-center justify-between" style={{ background: "linear-gradient(90deg, rgba(168,85,247,0.12), rgba(99,102,241,0.12))", border: "1px solid rgba(168,85,247,0.25)" }}>
                      <div className="flex items-center gap-2">
                        <GitPullRequest className="h-4 w-4" style={{ color: "#10b981" }} />
                        <span className={`text-xs font-semibold ${D ? "text-white" : "text-gray-900"}`}>Pull request opened</span>
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: "#10b981" }}>PR #247</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING — 3 cards, slim ===== */}
      <section id="pricing" className={`py-24 sm:py-32 px-5 relative z-10 ${D ? "" : "bg-gray-50/50"}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className={`text-4xl sm:text-5xl font-black tracking-tight mb-4 ${D ? "text-white" : "text-gray-900"}`}>
              Pick your plan.
            </h2>
            <p className={`text-lg ${D ? "text-gray-500" : "text-gray-500"}`}>Start free. Upgrade when you need more.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {/* FREE */}
            <div className="rounded-2xl p-7 border flex flex-col" style={{ background: D ? "rgba(255,255,255,0.02)" : "#fff", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
              <h3 className={`text-xl font-bold mb-2 ${D ? "text-white" : "text-gray-900"}`}>Free</h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className={`text-4xl font-black ${D ? "text-white" : "text-gray-900"}`}>$0</span>
                <span className={`text-sm ${D ? "text-gray-500" : "text-gray-400"}`}>/month</span>
              </div>
              <ul className="space-y-3 mb-7 flex-1">
                {["Matrix AI Lite", "15 questions per day", "Document & camera analysis", "100+ languages"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2.5 text-sm ${D ? "text-gray-300" : "text-gray-600"}`}>
                    <Check size={14} className="text-emerald-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <Button variant="outline" className={`w-full rounded-xl h-12 font-semibold ${D ? "border-white/10 hover:bg-white/5 text-gray-300" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`} data-testid="button-plan-free">
                  {isAuthenticated ? "Go to Chat" : "Get Started"}
                </Button>
              </Link>
            </div>

            {/* PRO */}
            <div className="rounded-2xl p-7 border flex flex-col" style={{ background: D ? "rgba(139,92,246,0.04)" : "rgba(245,240,255,0.4)", borderColor: D ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.25)" }}>
              <h3 className={`text-xl font-bold flex items-center gap-2 mb-2 ${D ? "text-white" : "text-gray-900"}`}>
                <Crown className="h-5 w-5 text-purple-500" /> Pro
              </h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className={`text-4xl font-black ${D ? "text-white" : "text-gray-900"}`}>$6.99</span>
                <span className={`text-sm ${D ? "text-gray-500" : "text-gray-400"}`}>/month</span>
              </div>
              <ul className="space-y-3 mb-7 flex-1">
                {["Matrix AI Pro (Gemini Flash)", "Unlimited questions", "Live web search", "Verified answer badges", "AI image generation"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2.5 text-sm ${D ? "text-gray-300" : "text-gray-600"}`}>
                    <Check size={14} className="text-purple-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <Button className="w-full rounded-xl h-12 font-bold text-white" style={{ background: "linear-gradient(90deg, #7c3aed, #ec4899)" }} data-testid="button-plan-pro">
                  Start 7-Day Trial
                </Button>
              </Link>
            </div>

            {/* RESEARCH — featured */}
            <div className="rounded-2xl p-7 border-2 flex flex-col relative overflow-hidden" style={{ borderColor: D ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)", background: D ? "linear-gradient(180deg, rgba(99,102,241,0.08), rgba(0,0,0,0.3))" : "linear-gradient(180deg, rgba(238,242,255,0.8), #fff)" }}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
              <div className="inline-flex items-center gap-1 self-start mb-3 text-[10px] font-black tracking-wide px-2.5 py-1 rounded-full text-white" style={{ background: "#3b82f6" }}>
                <Star className="h-3 w-3 fill-white" /> MOST POWERFUL
              </div>
              <h3 className={`text-xl font-bold flex items-center gap-2 mb-2 ${D ? "text-white" : "text-gray-900"}`}>
                <Microscope className="h-5 w-5 text-indigo-500" /> Research
              </h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-4xl font-black text-blue-500">$30</span>
                <span className={`text-sm ${D ? "text-gray-500" : "text-gray-400"}`}>/month</span>
              </div>
              <ul className="space-y-3 mb-7 flex-1">
                {[
                  "Everything in Pro",
                  "Matrix AI Deep Research (20+ sources)",
                  "Stack Trace Surgeon (auto PRs)",
                  "AI Video Studio (Veo 3.1)",
                  "Self-Verification on every answer",
                  "1M-token long context",
                  "Priority response times",
                ].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2.5 text-sm ${D ? "text-gray-300" : "text-gray-600"}`}>
                    <Check size={14} className="text-indigo-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <Button className="w-full rounded-xl h-12 font-black text-base bg-blue-600 hover:bg-blue-500 text-white" data-testid="button-plan-research">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start 7-Day Trial
                </Button>
              </Link>
            </div>
          </div>

          <p className={`text-center text-xs mt-6 ${D ? "text-gray-500" : "text-gray-400"}`}>
            All paid plans: 7-day free trial · No credit card charged during trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-24 px-5 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl p-10 sm:p-14 border" style={{ background: D ? "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))" : "linear-gradient(135deg, rgba(238,242,255,0.8), rgba(245,240,255,0.6))", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.15)" }}>
            <div className="mb-6 flex justify-center"><TurboLogo size={56} animated={false} /></div>
            <h2 className={`text-3xl sm:text-5xl font-black mb-5 ${D ? "text-white" : "text-gray-900"}`}>
              Ready when you are.
            </h2>
            <p className={`text-lg mb-10 max-w-md mx-auto ${D ? "text-gray-400" : "text-gray-500"}`}>
              Free to start. Cited answers from your first question.
            </p>
            <Link href={ctaHref}>
              <Button size="lg" className={`text-base px-10 py-6 font-bold rounded-2xl ${D ? "bg-white hover:bg-gray-100 text-black" : "bg-gray-900 hover:bg-gray-800 text-white"}`} data-testid="button-final-cta">
                {ctaLabel} <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Floating "Open Chat" pill for authenticated users */}
      {isAuthenticated && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          <div className={`text-xs font-medium px-3 py-1 rounded-full shadow ${D ? "" : "bg-gray-100 text-gray-500"}`} style={D ? { background: "rgba(255,255,255,0.06)", color: "#9ca3af" } : {}}>
            Signed in as {user?.firstName || user?.email?.split("@")[0] || "you"}
          </div>
          <Link href="/chat">
            <button className="flex items-center gap-2.5 text-white font-bold px-6 py-3.5 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 text-sm bg-blue-600 hover:bg-blue-500" style={{ boxShadow: "0 8px 30px rgba(59,130,246,0.35)" }}>
              <MessageSquare className="h-4 w-4" /> Open Chat <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="border-t py-8 px-5 relative z-10" style={{ borderColor: D ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)", background: D ? "rgba(0,0,0,0.5)" : "#fafafa" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TurboLogo size={24} animated={false} />
            <span className={`font-semibold ${D ? "text-white" : "text-gray-900"}`}>TurboAnswer</span>
          </div>
          <div className={`flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm ${D ? "text-gray-500" : "text-gray-400"}`}>
            <Link href="/privacy-policy" className={D ? "hover:text-gray-300" : "hover:text-gray-600"}>Privacy</Link>
            <Link href="/support" className={D ? "hover:text-gray-300" : "hover:text-gray-600"}>Support</Link>
            <Link href="/business" className={D ? "hover:text-gray-300" : "hover:text-gray-600"}>Business</Link>
            <Link href="/beta" className={D ? "hover:text-gray-300" : "hover:text-gray-600"}>Beta program</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
