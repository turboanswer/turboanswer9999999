import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Brain, FileText, Globe, Shield, MessageSquare, Menu, X, QrCode, ImageIcon, Camera, Sparkles, ArrowRight, Check, Lock, Palette, Search, Code, Code2, BookOpen, Lightbulb, HeartPulse, Scale, TrendingUp, Wrench, Crown, Star, ChevronRight, Microscope, Cpu, Layers, BarChart3, Film, Swords, Users, CheckCircle } from "lucide-react";
import { SiCloudflare } from "react-icons/si";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import TurboLogo from "@/components/TurboLogo";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const { isAuthenticated, user } = useAuth();
  const ctaHref = isAuthenticated ? "/chat" : "/login";
  const ctaLabel = isAuthenticated ? "Go to Chat" : "Login / Sign Up";
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const features = [
    { icon: <Brain className="h-7 w-7" />, title: "Matrix AI Chat", desc: "A new era of intelligence — answers cited, verified, and graded by confidence in real time.", color: "#3b82f6", badge: "Research+" },
    { icon: <Code2 className="h-7 w-7" />, title: "Code Studio", desc: "Build full web apps from one sentence. Matrix AI handles architecture, code, and review end-to-end.", color: "#8b5cf6", badge: "Research+" },
    { icon: <Film className="h-7 w-7" />, title: "AI Video Studio", desc: "Cinematic videos generated from a single line of text.", color: "#a855f7", badge: "Research+" },
    { icon: <FileText className="h-7 w-7" />, title: "Document Analysis", desc: "Upload any document and get instant summaries, key insights, and detailed answers.", color: "#10b981", badge: "Free" },
    { icon: <ImageIcon className="h-7 w-7" />, title: "AI Image Generation", desc: "Generate art and designs from a single prompt.", color: "#ec4899", badge: "Pro+" },
    { icon: <Camera className="h-7 w-7" />, title: "Camera Vision", desc: "Point your camera at anything and get instant Matrix AI analysis.", color: "#06b6d4", badge: "Free" },
    { icon: <Users className="h-7 w-7" />, title: "Collab AI Rooms", desc: "Real-time multiplayer rooms. Chat with friends and Matrix AI together in one space.", color: "#a855f7", badge: "New" },
    { icon: <CheckCircle className="h-7 w-7" />, title: "Self-Verification", desc: "Every Matrix AI answer rates its own confidence and flags anything it can't fully back up.", color: "#14b8a6", badge: "New" },
  ];

  const D = isDark;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: D ? "#000" : "#fff", color: D ? "#fff" : "#111" }}>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: D ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TurboLogo size={28} animated={false} />
            <span className="text-base font-bold tracking-tight">{D ? "TurboAnswer" : <span className="text-gray-900">TurboAnswer</span>}</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className={`text-sm transition-colors ${D ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>Features</a>
            <a href="#pricing" className={`text-sm transition-colors ${D ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>Pricing</a>
            <a href="#mobile" className={`text-sm transition-colors ${D ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>Mobile</a>
            <a
              href="https://www.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              title="This site is protected by Cloudflare — DDoS, WAF & Bot Mitigation Active"
              data-testid="badge-cloudflare-header"
              className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
                D
                  ? "bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.06]"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <SiCloudflare className="text-[#F38020] w-3 h-3" />
              <span>Protected by Cloudflare</span>
            </a>
            <button onClick={toggleTheme} aria-label="Toggle theme" className={`p-2 rounded-lg transition-colors ${D ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
              {D ? <span className="text-sm">☀</span> : <span className="text-sm">☾</span>}
            </button>
            <Link href={ctaHref}>
              <Button size="sm" className={`font-semibold px-5 rounded-lg ${D ? "bg-white hover:bg-gray-100 text-black" : "bg-gray-900 hover:bg-gray-800 text-white"}`}>
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
            <a href="#mobile" onClick={() => setMobileMenuOpen(false)}><Button variant="ghost" className={`w-full justify-start ${D ? "text-gray-300" : "text-gray-600"}`}>Mobile</Button></a>
            <Link href={ctaHref}><Button className={`w-full font-semibold rounded-lg ${D ? "bg-white hover:bg-gray-100 text-black" : "bg-gray-900 hover:bg-gray-800 text-white"}`}>{ctaLabel}</Button></Link>
          </div>
        )}
      </nav>

      <section className="relative overflow-hidden" style={{ minHeight: "100vh", background: D ? "#05060a" : "#fafbfc" }}>
        {/* Distinctive grid + emerald glow background — breaks away from generic dark-blue */}
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
        <div className="absolute pointer-events-none" style={{
          top: "30%", right: "5%", width: 400, height: 400,
          background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent 60%)",
          filter: "blur(30px)",
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

            {/* LEFT — distinctive headline */}
            <div className="text-left">
              <h1 className={`font-black tracking-tight leading-[0.92] mb-6 ${D ? "text-white" : "text-gray-900"}`}
                style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
                The AI you<br />
                can <span className="ta-shimmer-text">actually trust.</span>
              </h1>

              <p className={`text-lg sm:text-xl max-w-xl mb-6 leading-relaxed ${D ? "text-gray-400" : "text-gray-600"}`}>
                Meet <strong className={D ? "text-white" : "text-gray-900"}>Matrix AI</strong> — a new kind of intelligence built for the questions that matter. Cited. Verified. Yours in seconds.
              </p>

              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 border ${D ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                <Brain className="h-3.5 w-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider">Matrix AI · A new era of intelligence</span>
                <span className="text-xs opacity-80">— self-verifying, source-cited, confidence-rated</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                <Link href={ctaHref}>
                  <button className="group flex items-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold transition-all text-white hover:scale-[1.02] active:scale-[0.98]" style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    boxShadow: "0 10px 40px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}>
                    Start free — get verified answers
                    <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </Link>
                <button onClick={() => setShowQR(true)} className={`flex items-center gap-2.5 px-6 py-4 rounded-xl text-base font-semibold border transition-all active:scale-[0.98] ${
                  D ? "text-white border-white/15 hover:bg-white/5" : "text-gray-900 border-gray-200 hover:bg-gray-50"
                }`}>
                  <QrCode size={18} /> Open on Phone
                </button>
              </div>

              <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-sm ${D ? "text-gray-500" : "text-gray-500"}`}>
                <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Free forever</span>
                <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Matrix AI</span>
              </div>
            </div>

            {/* RIGHT — animated chat showing the verified badge in action */}
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
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f56" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#27c93f" }} />
                  </div>
                  <div className={`text-xs ml-2 font-mono ${D ? "text-gray-500" : "text-gray-400"}`}>turboanswer.it.com</div>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-medium" style={{
                      background: D ? "#1f2937" : "#f3f4f6",
                      color: D ? "#fff" : "#111827",
                    }}>
                      Is the Great Wall of China visible from space?
                    </div>
                  </div>

                  {/* AI response */}
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

                      {/* The killer feature: verified badge */}
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

                  {/* Live typing indicator */}
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

              {/* Floating stat card */}
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

      <div className="relative z-10 w-full py-4 px-4 text-center" style={{ background: "linear-gradient(90deg, #059669, #0d9488)" }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-white animate-pulse" />
            <span className="text-white text-base font-bold">Need Support? Call Now!</span>
          </div>
          <a href="tel:+18664677269" className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold text-base px-5 py-1.5 rounded-full hover:bg-emerald-50 transition-colors shadow">
            (866) 467-7269
          </a>
          <span className="text-white/80 text-sm font-medium">M-F 9:30 AM - 6 PM EST</span>
        </div>
      </div>

      <section id="features" className={`py-24 sm:py-32 px-5 relative z-10 ${D ? "" : "bg-gray-50/50"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-10">
            <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight ${D ? "text-white" : "text-gray-900"}`}>
              Take total<br />control
            </h2>
            <p className={`text-lg max-w-md lg:pt-3 ${D ? "text-gray-400" : "text-gray-500"}`}>
              Just some of the advanced features you can deploy with TurboAnswer.
            </p>
          </div>

          <a
            href="https://www.cloudflare.com/"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="card-cloudflare-protection"
            className={`block mb-10 rounded-2xl border p-5 sm:p-6 transition-all hover:scale-[1.005] ${
              D
                ? "bg-gradient-to-r from-[#F38020]/10 via-emerald-500/5 to-transparent border-[#F38020]/30 hover:border-[#F38020]/50"
                : "bg-gradient-to-r from-orange-50 via-emerald-50 to-white border-orange-200 hover:border-orange-300"
            }`}
          >
            <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
              <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${D ? "bg-[#F38020]/15" : "bg-orange-100"}`}>
                <SiCloudflare className="text-[#F38020] w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className={`text-lg sm:text-xl font-bold ${D ? "text-white" : "text-gray-900"}`}>
                    Protected by Cloudflare
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide border ${D ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                    ACTIVE
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${D ? "text-gray-400" : "text-gray-600"}`}>
                  Enterprise-grade <span className={D ? "text-white font-semibold" : "text-gray-900 font-semibold"}>DDoS mitigation</span>, <span className={D ? "text-white font-semibold" : "text-gray-900 font-semibold"}>Web Application Firewall</span>, and <span className={D ? "text-white font-semibold" : "text-gray-900 font-semibold"}>bot detection</span> guard every request. Malicious traffic is blocked at the edge — before it ever reaches our servers.
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-center gap-1 shrink-0 px-3">
                <Shield className={`w-7 h-7 ${D ? "text-emerald-400" : "text-emerald-500"}`} />
                <span className={`text-[10px] font-bold tracking-wider ${D ? "text-emerald-400" : "text-emerald-600"}`}>SECURE</span>
              </div>
            </div>
          </a>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon, title, desc, color, badge }) => (
              <div key={title} className={`group rounded-2xl p-7 cursor-pointer transition-all duration-300 border h-full ${D ? "hover:border-white/[0.12]" : "hover:border-gray-200 hover:shadow-lg"}`} style={{ background: D ? `linear-gradient(145deg, ${color}12, #0a0a0a)` : "#fff", borderColor: D ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)" }}>
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
                    {icon}
                  </div>
                  {badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${badge === "Free" ? "bg-green-500/10 text-green-500 border border-green-500/20" : badge === "Pro+" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>
                      {badge}
                    </span>
                  )}
                </div>
                <h3 className={`text-lg font-bold mb-2 ${D ? "text-white" : "text-gray-900"}`}>{title}</h3>
                <p className={`text-sm leading-relaxed ${D ? "text-gray-500" : "text-gray-500"}`}>{desc}</p>
                <ArrowRight size={16} className={`mt-4 group-hover:translate-x-1 transition-all ${D ? "text-gray-700 group-hover:text-gray-400" : "text-gray-300 group-hover:text-gray-500"}`} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { icon: <Globe className="h-6 w-6" />, title: "100+ Languages", desc: "Chat in any language with automatic detection.", color: "#a855f7" },
              { icon: <Zap className="h-6 w-6" />, title: "Ultra-Fast", desc: "Answers in under a second. No waiting.", color: "#eab308" },
              { icon: <Shield className="h-6 w-6" />, title: "Privacy First", desc: "Encrypted data. No data selling. Ever.", color: "#10b981" },
              { icon: <QrCode className="h-6 w-6" />, title: "Mobile Ready", desc: "Works perfectly on any device.", color: "#6366f1" },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} className={`rounded-xl p-5 border transition-all ${D ? "hover:border-white/[0.1]" : "hover:border-gray-200 hover:shadow-md"}`} style={{ background: D ? "rgba(255,255,255,0.02)" : "#fff", borderColor: D ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}12`, color }}>{icon}</div>
                <div className={`text-sm font-bold mb-1 ${D ? "text-white" : "text-gray-900"}`}>{title}</div>
                <div className={`text-xs ${D ? "text-gray-500" : "text-gray-500"}`}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 px-5 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl overflow-hidden border relative" style={{ borderColor: D ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.25)", background: D ? "linear-gradient(135deg, #0a0a1e, #0d1030)" : "linear-gradient(135deg, #eef2ff, #e0e7ff)" }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)" }} />
            <div className="p-8 sm:p-12 lg:p-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6" style={{ background: D ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.1)", border: `1px solid ${D ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.2)"}`, color: D ? "#818cf8" : "#4f46e5" }}>
                    <Cpu className="h-3.5 w-3.5" /> Matrix AI · Research Tier
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black mb-5 leading-tight">
                    <span className={D ? "text-blue-400" : "text-blue-600"}>A new era</span><br />
                    <span className={D ? "text-white" : "text-gray-900"}>of intelligence.</span>
                  </h2>
                  <p className={`text-lg mb-8 leading-relaxed ${D ? "text-gray-300" : "text-gray-600"}`}>
                    Matrix AI Research is built for the questions other assistants get wrong. It searches live sources, weighs the evidence, and tells you exactly how confident it is — claim by claim.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {[
                      { icon: <Microscope className="h-4 w-4 text-indigo-400" />, label: "Live Citations", desc: "Every fact tied to a source you can open" },
                      { icon: <Brain className="h-4 w-4 text-violet-400" />, label: "Self-Verification", desc: "Confidence score on every answer" },
                      { icon: <Layers className="h-4 w-4 text-cyan-400" />, label: "Real-Time Reasoning", desc: "Watch Matrix AI think, step by step" },
                      { icon: <BarChart3 className="h-4 w-4 text-indigo-400" />, label: "Honest Disagreements", desc: "Contested claims flagged, never hidden" },
                    ].map((f, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl p-3.5 border" style={{ background: D ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.1)" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)" }}>{f.icon}</div>
                        <div>
                          <div className={`text-sm font-semibold ${D ? "text-white" : "text-gray-900"}`}>{f.label}</div>
                          <div className={`text-xs mt-0.5 ${D ? "text-gray-400" : "text-gray-500"}`}>{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href={ctaHref}>
                    <Button className="rounded-xl h-12 px-8 font-bold text-base bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Try Research Free for 7 Days
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                  <p className={`text-xs mt-3 ${D ? "text-gray-500" : "text-gray-400"}`}>No credit card charged during trial · Cancel anytime</p>
                </div>
                <div className="space-y-3">
                  {[
                    { title: "Cited, Not Guessed", body: "Every claim points to a source you can open. No more wondering where an answer came from.", badge: "Unique", bColor: "#6366f1" },
                    { title: "Self-Aware Confidence", body: "Matrix AI tells you how sure it is — and quietly flags anything it can't fully back up.", badge: "Always On", bColor: "#8b5cf6" },
                    { title: "Built for Hard Problems", body: "Tackles complex algorithms, debugging, architecture, and advanced mathematics with near-human accuracy.", badge: "Pro-Level", bColor: "#06b6d4" },
                    { title: "Creative & Strategic", body: "From business strategy to creative writing, Matrix AI produces nuanced, comprehensive work across every domain.", badge: "All Domains", bColor: "#3b82f6" },
                  ].map((c, i) => (
                    <div key={i} className={`rounded-2xl p-5 border transition-all ${D ? "hover:border-indigo-500/30" : "hover:border-indigo-300 hover:shadow-md"}`} style={{ background: D ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.8)", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <span className={`font-semibold text-sm ${D ? "text-white" : "text-gray-900"}`}>{c.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: `${c.bColor}18`, color: c.bColor }}>{c.badge}</span>
                      </div>
                      <p className={`text-xs leading-relaxed ${D ? "text-gray-400" : "text-gray-500"}`}>{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`py-16 sm:py-20 px-5 relative z-10 ${D ? "" : ""}`}>
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-2xl sm:text-4xl font-black text-center mb-10 ${D ? "text-white" : "text-gray-900"}`}>
            Free vs <span className="text-blue-500">Paid</span> — What You Get
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "AI Model", free: "Matrix AI Lite", paid: "Matrix AI · Pro / Research", icon: <Brain className="h-5 w-5" /> },
              { label: "Answer Length", free: "Short (2-4 sentences)", paid: "Detailed (full explanations)", icon: <FileText className="h-5 w-5" /> },
              { label: "Live Web Search", free: "Not included", paid: "Real-time current events", icon: <Search className="h-5 w-5" /> },
              { label: "Verified Answers", free: "Not included", paid: "Green verified badge", icon: <Check className="h-5 w-5" /> },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl p-5 border" style={{ background: D ? "rgba(255,255,255,0.02)" : "#fff", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
                  {item.icon}
                </div>
                <p className={`text-sm font-bold mb-3 ${D ? "text-white" : "text-gray-900"}`}>{item.label}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${D ? "bg-zinc-800 text-zinc-400" : "bg-gray-100 text-gray-500"}`}>FREE</span>
                    <span className={`text-xs ${D ? "text-gray-500" : "text-gray-400"}`}>{item.free}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">PRO+</span>
                    <span className={`text-xs font-medium ${D ? "text-gray-300" : "text-gray-700"}`}>{item.paid}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className={`py-20 sm:py-32 px-5 relative z-10 ${D ? "" : "bg-gray-50/50"}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-5xl font-black mb-4 ${D ? "text-white" : "text-gray-900"}`}>
              Simple <span className="text-blue-500">Pricing</span>
            </h2>
            <p className={`text-lg max-w-xl mx-auto ${D ? "text-gray-500" : "text-gray-500"}`}>Start free, upgrade when you need more power</p>
            <div className="inline-flex items-center gap-2 mt-4 text-sm font-semibold px-4 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", color: "#16a34a" }}>
              <Check className="h-4 w-4" /> All paid plans include a 7-day free trial
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            <div className="rounded-2xl p-7 border" style={{ background: D ? "rgba(255,255,255,0.02)" : "#fff", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
              <h3 className={`text-xl font-bold mb-2 ${D ? "text-white" : "text-gray-900"}`}>Free</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-4xl font-black ${D ? "text-white" : "text-gray-900"}`}>$0</span>
                <span className={`text-sm ${D ? "text-gray-500" : "text-gray-400"}`}>/month</span>
              </div>
              <p className={`text-xs mb-5 ${D ? "text-gray-500" : "text-gray-400"}`}>Basic AI · Short answers · Limited features</p>
              <ul className="space-y-3 mb-3">
                {["Basic AI model (Gemini Lite)", "Short, concise answers", "15 questions per day", "Document analysis", "Camera & image scanning", "100+ languages", "Dark & light themes"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2.5 text-sm ${D ? "text-gray-300" : "text-gray-600"}`}>
                    <Check size={14} className="text-green-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <div className="space-y-2 mb-7">
                {["Live web search", "Verified answers", "AI image generation", "Code Studio", "AI Video Studio"].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2.5 text-sm ${D ? "text-gray-600" : "text-gray-400"}`}>
                    <X size={14} className="flex-shrink-0 opacity-50" /> {item}
                  </div>
                ))}
              </div>
              <Link href={ctaHref}>
                <Button variant="outline" className={`w-full rounded-xl h-12 font-semibold ${D ? "border-white/10 hover:bg-white/5 text-gray-300" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}>
                  {isAuthenticated ? "Go to Chat" : "Get Started Free"}
                </Button>
              </Link>
            </div>

            <div className="relative pt-5 md:-mt-4 md:-mb-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-black text-white tracking-wide shadow-lg flex items-center gap-1.5" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}>
                <Star className="h-3 w-3 fill-white" /> MOST POWERFUL
              </div>
              <div className="rounded-2xl border-2 relative overflow-hidden" style={{ borderColor: D ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)", background: D ? "linear-gradient(180deg, rgba(99,102,241,0.08), rgba(0,0,0,0.3))" : "linear-gradient(180deg, rgba(238,242,255,0.8), #fff)" }}>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                <div className="p-8 pt-10">
                  <h3 className={`text-xl font-bold flex items-center gap-2 ${D ? "text-white" : "text-gray-900"}`}>
                    <Microscope className="h-5 w-5 text-indigo-500" /> Research
                  </h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-5xl font-black text-blue-500">$30</span>
                    <span className={`text-sm ${D ? "text-gray-500" : "text-gray-400"}`}>/month</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
                    <Check className="h-3 w-3" /> 7-day free trial
                  </div>
                  <div className="mt-4 mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: D ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)", border: `1px solid ${D ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.2)"}` }}>
                    <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-500 tracking-wide">MATRIX AI · RESEARCH ENGINE</span>
                  </div>
                  <ul className="space-y-3 mb-7">
                    <li className="flex items-start gap-2.5 rounded-xl p-2.5 -mx-1" style={{ background: D ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.04)", border: `1px solid ${D ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)"}` }}>
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5"><Code2 className="h-3 w-3 text-white" /></div>
                      <div>
                        <span className={`text-sm font-bold ${D ? "text-blue-300" : "text-blue-700"}`}>Code Studio</span>
                        <div className={`text-xs mt-0.5 ${D ? "text-blue-400/70" : "text-blue-500"}`}>Build full apps with one prompt · Powered by Matrix AI</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 rounded-xl p-2.5 -mx-1" style={{ background: D ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.04)", border: `1px solid ${D ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)"}` }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}><Film className="h-3 w-3 text-white" /></div>
                      <div>
                        <span className={`text-sm font-bold ${D ? "text-violet-300" : "text-violet-700"}`}>AI Video Studio</span>
                        <div className={`text-xs mt-0.5 ${D ? "text-violet-400/70" : "text-violet-500"}`}>Generate AI videos with Google Veo</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 rounded-xl p-2.5 -mx-1" style={{ background: D ? "rgba(20,184,166,0.08)" : "rgba(20,184,166,0.04)", border: `1px solid ${D ? "rgba(20,184,166,0.15)" : "rgba(20,184,166,0.1)"}` }}>
                      <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5"><CheckCircle className="h-3 w-3 text-white" /></div>
                      <div>
                        <span className={`text-sm font-bold ${D ? "text-teal-300" : "text-teal-700"}`}>AI Fact-Check Chain</span>
                        <div className={`text-xs mt-0.5 ${D ? "text-teal-400/70" : "text-teal-500"}`}>Confidence scores on every claim</div>
                      </div>
                    </li>
                    {["Everything in Pro", "Matrix AI Research engine", "Live citations & confidence scores", "Collab AI Rooms", "Advanced reasoning & math", "Workgroups & team collaboration", "Priority queue access"].map((item, i) => (
                      <li key={i} className={`flex items-center gap-2.5 text-sm ${D ? "text-gray-300" : "text-gray-600"}`}>
                        <Check size={14} className="text-indigo-500 flex-shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                  <Link href={ctaHref}>
                    <Button className="w-full rounded-xl h-12 font-black text-base bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/25">
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isAuthenticated ? "Unlock Research" : "Start Free Trial"}
                    </Button>
                  </Link>
                  <p className={`text-center text-xs mt-3 ${D ? "text-gray-500" : "text-gray-400"}`}>Cancel anytime · No charge for 7 days</p>
                </div>
              </div>
            </div>

            <div className="relative pt-5">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-4 py-1 rounded-full text-xs font-bold text-white tracking-wide shadow-lg" style={{ background: "linear-gradient(90deg, #7c3aed, #ec4899)" }}>
                POPULAR
              </div>
              <div className="rounded-2xl p-7 border-2 relative overflow-hidden" style={{ borderColor: D ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.3)", background: D ? "rgba(139,92,246,0.03)" : "rgba(245,240,255,0.5)" }}>
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, #7c3aed, #ec4899)" }} />
                <div className="mb-5 mt-2">
                  <h3 className={`text-xl font-bold flex items-center gap-2 ${D ? "text-white" : "text-gray-900"}`}><Crown className="h-5 w-5 text-purple-500" /> Pro</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={`text-4xl font-black ${D ? "text-white" : "text-gray-900"}`}>$6.99</span>
                    <span className={`text-sm ${D ? "text-gray-500" : "text-gray-400"}`}>/month</span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
                    <Check className="h-3 w-3" /> 7-day free trial
                  </div>
                </div>
                <ul className="space-y-3 mb-7">
                  {["Advanced AI model (Gemini Flash)", "Longer, detailed answers", "Unlimited questions", "Live web search for current events", "Verified answer badges", "AI image generation (DALL-E 3)", "Priority response speed", "Everything in Free included"].map((item, i) => (
                    <li key={i} className={`flex items-center gap-2.5 text-sm ${D ? "text-gray-300" : "text-gray-600"}`}>
                      <Check size={14} className="text-purple-500 flex-shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <Link href={ctaHref}>
                  <Button className="w-full rounded-xl h-12 font-bold text-white" style={{ background: "linear-gradient(90deg, #7c3aed, #ec4899)" }}>
                    {isAuthenticated ? "Go to Chat" : "Upgrade to Pro"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 px-5 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-5xl font-black mb-4 ${D ? "text-white" : "text-gray-900"}`}>How It <span className="text-blue-500">Works</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Sign Up Free", desc: "Create your account in seconds. No credit card required.", icon: <Lock className="h-7 w-7" /> },
              { step: "2", title: "Ask Anything", desc: "Type your question, upload documents, or generate images.", icon: <MessageSquare className="h-7 w-7" /> },
              { step: "3", title: "Get Smart Answers", desc: "Instant, accurate responses powered by the best AI models.", icon: <Sparkles className="h-7 w-7" /> },
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center border transition-all group-hover:scale-110 ${D ? "text-blue-400" : "text-blue-600"}`} style={{ background: D ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.06)", borderColor: D ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.15)" }}>
                  {item.icon}
                </div>
                <div className="text-xs font-black tracking-[0.2em] mb-3 text-blue-500">STEP {item.step}</div>
                <h3 className={`text-xl font-bold mb-3 ${D ? "text-white" : "text-gray-900"}`}>{item.title}</h3>
                <p className={`text-sm leading-relaxed ${D ? "text-gray-400" : "text-gray-500"}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`py-20 sm:py-28 px-5 relative z-10 ${D ? "" : "bg-gray-50/50"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className={`text-3xl sm:text-5xl font-black mb-4 ${D ? "text-white" : "text-gray-900"}`}>Expert Knowledge in <span className="text-blue-500">Every Field</span></h2>
            <p className={`text-lg max-w-xl mx-auto ${D ? "text-gray-500" : "text-gray-500"}`}>Professional-level answers across all major domains</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { icon: <Code className="h-5 w-5" />, label: "Programming & Code" },
              { icon: <HeartPulse className="h-5 w-5" />, label: "Health & Medicine" },
              { icon: <Scale className="h-5 w-5" />, label: "Legal & Law" },
              { icon: <TrendingUp className="h-5 w-5" />, label: "Finance & Business" },
              { icon: <BookOpen className="h-5 w-5" />, label: "Education & Learning" },
              { icon: <Lightbulb className="h-5 w-5" />, label: "Science & Research" },
              { icon: <Wrench className="h-5 w-5" />, label: "Engineering" },
              { icon: <Palette className="h-5 w-5" />, label: "Creative & Writing" },
            ].map((d, i) => (
              <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:scale-105 ${D ? "hover:border-blue-500/20" : "hover:border-blue-200 hover:shadow-md"}`} style={{ background: D ? "rgba(255,255,255,0.02)" : "#fff", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                <span className={D ? "text-blue-400" : "text-blue-600"}>{d.icon}</span>
                <span className={`text-sm font-medium ${D ? "text-gray-300" : "text-gray-700"}`}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="mobile" className="py-20 sm:py-32 px-5 relative z-10">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <h2 className={`text-3xl sm:text-5xl font-black ${D ? "text-white" : "text-gray-900"}`}>Take It <span className="text-blue-500">Everywhere</span></h2>
          <p className={`text-lg ${D ? "text-gray-400" : "text-gray-500"}`}>Scan the QR code with your phone camera to instantly access TurboAnswer.</p>
          {!showQR ? (
            <Button onClick={() => setShowQR(true)} size="lg" variant="outline" className={`gap-2 px-8 rounded-xl ${D ? "border-white/10 text-gray-300 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <QrCode className="h-5 w-5" /> Show QR Code
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="p-6 rounded-3xl border" style={{ background: D ? "rgba(255,255,255,0.03)" : "#fff", borderColor: D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
                <div className="bg-white p-4 rounded-2xl">
                  <QRCodeSVG value={appUrl} size={220} bgColor="#ffffff" fgColor="#000000" level="H" includeMargin={false} />
                </div>
              </div>
              <p className={`text-xs break-all max-w-xs ${D ? "text-gray-500" : "text-gray-400"}`}>{appUrl}</p>
              <Button onClick={() => setShowQR(false)} variant="ghost" size="sm" className={D ? "text-gray-400" : "text-gray-500"}>Hide QR Code</Button>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 sm:py-28 px-5 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl p-10 sm:p-14 border relative overflow-hidden" style={{ background: D ? "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06), rgba(236,72,153,0.04))" : "linear-gradient(135deg, rgba(238,242,255,0.8), rgba(245,240,255,0.8), rgba(253,242,248,0.5))", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.15)" }}>
            <div className="relative z-10">
              <div className="mb-6"><TurboLogo size={70} animated={false} /></div>
              <h2 className={`text-3xl sm:text-5xl font-black mb-5 ${D ? "text-white" : "text-gray-900"}`}>
                Ready to Get <span className="text-blue-500">Started?</span>
              </h2>
              <p className={`text-lg mb-10 max-w-xl mx-auto ${D ? "text-gray-400" : "text-gray-500"}`}>
                Join thousands using TurboAnswer to work smarter, learn faster, and create more. It's completely free to start.
              </p>
              <Link href={ctaHref}>
                <Button size="lg" className={`text-lg px-12 py-7 font-bold shadow-2xl rounded-2xl ${D ? "bg-white hover:bg-gray-100 text-black" : "bg-gray-900 hover:bg-gray-800 text-white shadow-gray-900/20"}`}>
                  {ctaLabel} <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 px-5 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl p-8 sm:p-12 border" style={{ background: D ? "rgba(255,255,255,0.02)" : "#fff", borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
            <div className="text-center mb-8">
              <span className="inline-block text-xs font-black tracking-[0.2em] uppercase mb-3 text-purple-500">Our Story</span>
              <h2 className={`text-3xl sm:text-4xl font-black mb-2 ${D ? "text-white" : "text-gray-900"}`}>Built Through the Hate</h2>
              <div className="w-16 h-1 mx-auto mt-4 rounded-full" style={{ background: "linear-gradient(90deg, #6366f1, #ec4899)" }} />
            </div>
            <div className={`space-y-6 text-lg leading-relaxed ${D ? "text-gray-300" : "text-gray-600"}`}>
              <p>When we first launched TurboAnswer, the response wasn't applause — it was ridicule. People laughed at the idea. They said we were wasting our time.</p>
              <p><strong className={D ? "text-white" : "text-gray-900"}>"It'll never work."</strong> <strong className={D ? "text-white" : "text-gray-900"}>"Who's going to use this?"</strong> <strong className={D ? "text-white" : "text-gray-900"}>"Just give up."</strong> We heard it all. Every single day.</p>
              <p>But we didn't quit. We took every piece of criticism, every hateful comment — and we turned it into fuel. Late nights turned into breakthroughs. Setbacks turned into comebacks.</p>
              <p>We built Matrix AI — a new kind of intelligence. We added voice commands, document analysis, image generation, crisis support, enterprise-grade security, and a system fast enough to feel like a real conversation.</p>
              <p className={`font-bold text-xl ${D ? "text-white" : "text-gray-900"}`}>The same people who doubted us? Some of them are our users now.</p>
              <p>TurboAnswer exists because we refused to let the noise stop us. And we're just getting started.</p>
            </div>
            <div className="mt-10 pt-8 border-t flex items-center justify-center gap-3" style={{ borderColor: D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
              <TurboLogo size={32} animated={false} />
              <span className={`font-bold text-lg ${D ? "text-white" : "text-gray-900"}`}>TurboAnswer</span>
              <span className={`mx-2 ${D ? "text-gray-700" : "text-gray-300"}`}>|</span>
              <span className="italic text-purple-500">Built through adversity. Powered by innovation.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-5 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border-2 p-8 md:p-12 text-center relative overflow-hidden" style={{ borderColor: D ? "rgba(124,58,237,0.3)" : "rgba(124,58,237,0.2)", background: D ? "rgba(124,58,237,0.04)" : "rgba(245,240,255,0.5)" }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ background: "rgba(234,179,8,0.1)", color: "#ca8a04", border: "1px solid rgba(234,179,8,0.2)" }}>
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /> BETA PROGRAM
            </div>
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${D ? "text-white" : "text-gray-900"}`}>Help Shape the Future</h2>
            <p className={`text-lg mb-8 max-w-xl mx-auto ${D ? "text-gray-300" : "text-gray-600"}`}>Get early access, try new features before anyone else, and help us build something extraordinary.</p>
            <Link href="/beta">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-base font-semibold rounded-xl shadow-lg">
                Apply to Be a Beta Tester
              </Button>
            </Link>
          </div>
        </div>
      </section>

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

      <footer className="border-t py-8 px-5 relative z-10" style={{ borderColor: D ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)", background: D ? "rgba(0,0,0,0.5)" : "#fafafa" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TurboLogo size={24} animated={false} />
            <span className={`font-semibold ${D ? "text-white" : "text-gray-900"}`}>TurboAnswer</span>
            <span className={`text-xs ml-2 ${D ? "text-gray-600" : "text-gray-400"}`}>The AI that gets it done</span>
          </div>
          <div className={`flex gap-6 text-sm ${D ? "text-gray-500" : "text-gray-400"}`}>
            <Link href="/privacy-policy" className={D ? "hover:text-gray-300" : "hover:text-gray-600"}>Privacy</Link>
            <Link href="/support" className={D ? "hover:text-gray-300" : "hover:text-gray-600"}>Support</Link>
            <Link href="/business" className={D ? "hover:text-gray-300" : "hover:text-gray-600"}>Business</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
