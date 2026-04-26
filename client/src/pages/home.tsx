import { useState } from "react";
import { Link } from "wouter";
import {
  MessageSquare, Brain, LogOut, Code2, Sparkles, ArrowRight, X,
  Film, Camera, Scissors, HandHeart, Users, Crown, Zap, CheckCircle,
  Globe, ChevronDown, Shield, Cpu, Database, LayoutGrid, Rocket,
  Settings, Star, Stethoscope, GitPullRequest, FlaskConical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/hooks/use-lang";

export default function Home() {
  const { user, logout } = useAuth();
  const { lang, setLang, tr, langMeta, LANGUAGES } = useLang();
  const [showLang, setShowLang] = useState(false);

  const displayName = user?.firstName || user?.email?.split("@")[0] || "User";
  const isEnterprise = user?.subscriptionTier === "enterprise" && user?.subscriptionStatus === "active";
  const isResearch = user?.subscriptionTier === "research" && user?.subscriptionStatus === "active";

  return (
    <div className="min-h-screen text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#000" }}>

      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 z-50" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            <span className="text-base font-bold text-white tracking-tight">TurboAnswer</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/pricing"><span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Pricing</span></Link>
            <Link href="/chat"><span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Features</span></Link>
            <Link href="/support"><span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Support</span></Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowLang(v => !v)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm px-2.5 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/20">
              <Globe size={13} />{langMeta.flag}<ChevronDown size={11} />
            </button>
            {showLang && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                style={{ background: "#111" }}>
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setShowLang(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors text-left"
                    style={{ color: lang === l.code ? "#3b82f6" : "#9ca3af", fontWeight: lang === l.code ? 700 : 400 }}>
                    <span className="text-base">{l.flag}</span>{l.label}
                    {lang === l.code && <CheckCircle size={12} className="ml-auto text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {user?.isAdmin && <Link href="/admin"><button className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600/30 transition-colors">Admin</button></Link>}
          <Link href="/chat">
            <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
              Go to Chat
            </button>
          </Link>
          <a href="/api/logout">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors" title={tr.nav.logout}>
              <LogOut size={16} className="text-gray-500" />
            </button>
          </a>
        </div>
      </nav>

      <section className="relative overflow-hidden" style={{ minHeight: "80vh" }}>
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(37,99,235,0.25) 0%, rgba(37,99,235,0.08) 40%, transparent 70%)"
        }} />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 40% 50% at 30% 50%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 70% 50%, rgba(59,130,246,0.1) 0%, transparent 60%)"
        }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 mb-8" style={{ background: "rgba(59,130,246,0.08)" }}>
            <Sparkles size={14} className="text-blue-400" />
            <span className="text-sm text-blue-300 font-medium">Next-Gen AI Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-6">
            <span className="text-white">Your AI That</span><br />
            <span style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Thinks, Creates
            </span><br />
            <span style={{ background: "linear-gradient(135deg, #6366f1, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              & Analyzes
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Chat naturally. Analyze documents. Generate images. 100+ languages.<br />
            All in one powerful AI assistant that works on any device.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link href="/chat">
              <button className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-white text-black hover:bg-gray-100 transition-all shadow-lg shadow-white/10">
                Go to Chat <ArrowRight size={18} />
              </button>
            </Link>
            <Link href="/video-studio">
              <button className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold border border-white/15 text-white hover:bg-white/5 transition-all">
                <Film size={18} /> Open Video Studio
              </button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" /> Free forever</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" /> No credit card</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" /> Works on all devices</span>
          </div>
        </div>
      </section>

      {user && (
        <div className="flex items-center justify-between px-6 py-3 border-y border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
          <span className="text-sm text-gray-500">Signed in as <strong className="text-gray-300">{displayName}</strong></span>
          {isEnterprise && (
            <span className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: "rgba(251,188,5,0.12)", color: "#FBBC05", border: "1px solid rgba(251,188,5,0.3)" }}>
              ENTERPRISE
            </span>
          )}
        </div>
      )}

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-14">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight">
            Take total<br />control
          </h2>
          <p className="text-gray-400 text-lg max-w-md lg:pt-3">
            Just some of the advanced features you can deploy with TurboAnswer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <MessageSquare className="w-8 h-8" />,
              title: "AI Chat",
              desc: "Conversations powered by Matrix AI — cited, verified, and graded by confidence in real time.",
              href: "/chat",
              gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
              iconBg: "rgba(59,130,246,0.12)",
              iconColor: "#60a5fa",
            },
            {
              icon: <Stethoscope className="w-8 h-8" />,
              title: "Stack Trace Surgeon",
              desc: "Paste an error + your GitHub repo. Claude Sonnet 4.5 finds the bug and opens a real PR with the fix.",
              href: "/stack-trace-surgeon",
              gradient: "linear-gradient(135deg, #1a0a2e, #2a0d3e)",
              iconBg: "rgba(168,85,247,0.15)",
              iconColor: "#c084fc",
              badge: isResearch || isEnterprise ? "Included" : "Research",
            },
            {
              icon: <Film className="w-8 h-8" />,
              title: "Video Studio",
              desc: "AI video generation powered by Google Veo 3.1. Create stunning videos from text.",
              href: "/video-studio",
              gradient: "linear-gradient(135deg, #1a1a2e, #261a3e)",
              iconBg: "rgba(168,85,247,0.12)",
              iconColor: "#c084fc",
              badge: isResearch || isEnterprise ? "Included" : "Research+",
            },
            {
              icon: <Camera className="w-8 h-8" />,
              title: "AI Scanner",
              desc: "Scan documents, receipts, and images. AI reads, transcribes, and summarizes them.",
              href: "/photo-editor",
              gradient: "linear-gradient(135deg, #1a1a2e, #162e2a)",
              iconBg: "rgba(16,185,129,0.12)",
              iconColor: "#34d399",
              badge: "Free",
            },
            {
              icon: <Scissors className="w-8 h-8" />,
              title: "Media Editor",
              desc: "Edit photos and videos with AI-powered filters, text overlays, and effects.",
              href: "/media-editor",
              gradient: "linear-gradient(135deg, #1a1a2e, #2e1a2a)",
              iconBg: "rgba(236,72,153,0.12)",
              iconColor: "#f472b6",
              badge: "Enterprise",
            },
            {
              icon: <HandHeart className="w-8 h-8" />,
              title: "Crisis Support",
              desc: "24/7 private, encrypted mental health support. Fully confidential and safe.",
              href: "/crisis-info",
              gradient: "linear-gradient(135deg, #1a1a2e, #2e1a22)",
              iconBg: "rgba(244,114,182,0.12)",
              iconColor: "#f9a8d4",
            },
          ].map(({ icon, title, desc, href, gradient, iconBg, iconColor, badge }) => (
            <Link key={title} href={href}>
              <div className="group rounded-2xl p-6 cursor-pointer transition-all duration-300 border border-white/[0.04] hover:border-white/[0.12] h-full"
                style={{ background: gradient }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: iconBg, color: iconColor }}>
                  {icon}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                  {badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                <ArrowRight size={16} className="mt-4 text-gray-700 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-3xl overflow-hidden border border-white/[0.06]" style={{ background: "linear-gradient(135deg, #0a0a1a, #0d1025)" }}>
          <div className="p-8 md:p-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles size={16} className="text-blue-400" />
              <span className="text-sm font-semibold text-blue-400 tracking-wide uppercase">A new era of intelligence</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Meet Matrix AI</h2>
            <p className="text-gray-400 mb-8 max-w-xl">One intelligence built for the questions that matter — cited, verified, and graded by confidence in real time.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Cited", desc: "Every claim points to a live source you can open.", color: "#3b82f6" },
                { title: "Verified", desc: "Self-checks every answer and flags anything it can't fully back up.", color: "#10b981" },
                { title: "Confident", desc: "A real confidence score — not blind certainty.", color: "#a855f7" },
              ].map(({ title, desc, color }) => (
                <div key={title} className="rounded-xl p-5 border border-white/[0.06]" style={{ background: `${color}08` }}>
                  <div className="text-base font-bold text-white mb-1">{title}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {!isEnterprise && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="rounded-3xl overflow-hidden relative" style={{ border: "1px solid rgba(251,188,5,0.2)" }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(251,188,5,0.06) 0%, transparent 70%)" }} />
            <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5" style={{ color: "#FBBC05" }} />
                  <span className="text-xs font-bold tracking-widest" style={{ color: "#FBBC05" }}>ENTERPRISE</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">The Ultimate AI Team Stack</h2>
                <p className="text-gray-400 mb-6 max-w-lg">
                  5 team members. Matrix AI Research. Video Studio. Deep research reports. Everything your team needs — one subscription.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/pricing">
                    <button className="px-6 py-3 rounded-xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg, #FBBC05, #f59e0b)" }}>
                      Get Enterprise — $100/mo
                    </button>
                  </Link>
                  <Link href="/support">
                    <button className="px-6 py-3 rounded-xl font-semibold text-sm border text-yellow-300 hover:bg-yellow-500/10 transition-all" style={{ borderColor: "rgba(251,188,5,0.3)" }}>
                      Custom Plans
                    </button>
                  </Link>
                </div>
              </div>
              <div className="shrink-0 text-center p-6 rounded-2xl" style={{ background: "rgba(251,188,5,0.04)", border: "1px solid rgba(251,188,5,0.15)", minWidth: 160 }}>
                <div className="text-5xl font-black text-white">$100</div>
                <div className="text-sm text-gray-500 mb-3">/month</div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div style={{ color: "#6ee7b7" }}>5 team members</div>
                  <div style={{ color: "#FBBC05" }}>Deep Research</div>
                  <div style={{ color: "#FBBC05" }}>Save 44%</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex flex-wrap justify-center gap-3 pt-8 border-t border-white/[0.06]">
          <Link href="/pricing"><Button variant="outline" className="border-white/10 text-gray-400 hover:bg-white/5 hover:text-white">{tr.nav.pricing}</Button></Link>
          <Link href="/support"><Button variant="outline" className="border-white/10 text-gray-400 hover:bg-white/5 hover:text-white">{tr.nav.support}</Button></Link>
          <Link href="/ai-settings"><Button variant="outline" className="border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"><Settings size={14} className="mr-1" />{tr.settings.title}</Button></Link>
        </div>
      </section>
    </div>
  );
}
