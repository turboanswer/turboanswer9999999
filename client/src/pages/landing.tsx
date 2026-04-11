import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Brain, FileText, Globe, Shield, MessageSquare, Menu, X, QrCode, ImageIcon, Camera, Sparkles, ArrowRight, Check, Lock, Palette, Search, Code, Code2, BookOpen, Lightbulb, HeartPulse, Scale, TrendingUp, Wrench, Crown, Star, ChevronRight, Microscope, Cpu, Layers, BarChart3, Film } from "lucide-react";
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
    { icon: <Brain className="h-7 w-7" />, title: "Multi-Model AI Chat", desc: "Powered by 10 different AI models working together — GPT-4o, Claude, Mistral, Llama, DeepSeek, and more.", color: "#3b82f6", badge: "Research+" },
    { icon: <Code2 className="h-7 w-7" />, title: "Code Studio", desc: "Build full web apps from one sentence. 10 AI agents collaborate with Claude Opus 4.", color: "#8b5cf6", badge: "Research+" },
    { icon: <Film className="h-7 w-7" />, title: "AI Video Studio", desc: "Create stunning videos from text descriptions using Google Veo 3.1.", color: "#a855f7", badge: "Research+" },
    { icon: <FileText className="h-7 w-7" />, title: "Document Analysis", desc: "Upload any document and get instant summaries, key insights, and detailed answers.", color: "#10b981", badge: "Free" },
    { icon: <ImageIcon className="h-7 w-7" />, title: "AI Image Generation", desc: "Create images from text descriptions using DALL-E 3. Generate art and designs instantly.", color: "#ec4899", badge: "Pro+" },
    { icon: <Camera className="h-7 w-7" />, title: "Camera Vision", desc: "Point your camera at anything and get instant AI analysis. Scan docs, receipts, and images.", color: "#06b6d4", badge: "Free" },
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

      <section className="relative overflow-hidden" style={{ minHeight: "100vh", background: D ? "linear-gradient(135deg, #0a1628 0%, #0f2044 25%, #1a3a6e 50%, #0f2044 75%, #0a1628 100%)" : "linear-gradient(135deg, #1e40af 0%, #2563eb 30%, #3b82f6 50%, #2563eb 70%, #1e40af 100%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: D ? 0.15 : 0.12 }}>
            <g transform="translate(120, 80)">
              <ellipse cx="20" cy="12" rx="16" ry="16" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="10" y="28" width="20" height="45" rx="8" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="0" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-15, 6, 32)" />
              <rect x="28" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(15, 34, 32)" />
              <rect x="8" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-5, 14, 73)" />
              <rect x="21" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(5, 26, 73)" />
            </g>
            <g transform="translate(280, 120) scale(0.85)">
              <ellipse cx="20" cy="12" rx="16" ry="16" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="10" y="28" width="20" height="45" rx="8" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="0" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-10, 6, 32)" />
              <rect x="28" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(10, 34, 32)" />
              <rect x="8" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="21" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} />
            </g>
            <g transform="translate(450, 60) scale(1.1)">
              <ellipse cx="20" cy="12" rx="16" ry="16" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="10" y="28" width="20" height="45" rx="8" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="0" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-20, 6, 32)" />
              <rect x="28" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(20, 34, 32)" />
              <rect x="8" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-8, 14, 73)" />
              <rect x="21" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(8, 26, 73)" />
            </g>
            <g transform="translate(650, 130) scale(0.75)">
              <ellipse cx="20" cy="12" rx="16" ry="16" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="10" y="28" width="20" height="45" rx="8" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="0" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-12, 6, 32)" />
              <rect x="28" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(12, 34, 32)" />
              <rect x="8" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="21" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} />
            </g>
            <g transform="translate(840, 90) scale(0.95)">
              <ellipse cx="20" cy="12" rx="16" ry="16" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="10" y="28" width="20" height="45" rx="8" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="0" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-8, 6, 32)" />
              <rect x="28" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(8, 34, 32)" />
              <rect x="8" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-3, 14, 73)" />
              <rect x="21" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(3, 26, 73)" />
            </g>
            <g transform="translate(1020, 140) scale(0.8)">
              <ellipse cx="20" cy="12" rx="16" ry="16" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="10" y="28" width="20" height="45" rx="8" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="0" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-15, 6, 32)" />
              <rect x="28" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(15, 34, 32)" />
              <rect x="8" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="21" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} />
            </g>
            <g transform="translate(1200, 70)">
              <ellipse cx="20" cy="12" rx="16" ry="16" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="10" y="28" width="20" height="45" rx="8" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="0" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-5, 6, 32)" />
              <rect x="28" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(5, 34, 32)" />
              <rect x="8" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-6, 14, 73)" />
              <rect x="21" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(6, 26, 73)" />
            </g>
            <g transform="translate(1350, 110) scale(0.7)">
              <ellipse cx="20" cy="12" rx="16" ry="16" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="10" y="28" width="20" height="45" rx="8" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="0" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(-18, 6, 32)" />
              <rect x="28" y="32" width="12" height="35" rx="4" fill={D ? "#0a1628" : "#1e3a8a"} transform="rotate(18, 34, 32)" />
              <rect x="8" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} />
              <rect x="21" y="73" width="11" height="50" rx="5" fill={D ? "#0a1628" : "#1e3a8a"} />
            </g>
          </svg>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15), transparent 60%)" }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-5 pt-32 sm:pt-40 pb-24 text-center">
          <div className="flex justify-center mb-8">
            <TurboLogo size={80} animated={false} />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }}>
            <Sparkles size={14} className="text-blue-200" />
            <span className="text-sm font-medium text-blue-100">Next-Gen AI Intelligence</span>
            <Sparkles size={14} className="text-blue-200" />
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-8 text-white">
            Your AI That<br />
            <span className="text-blue-200">Thinks, Creates</span><br />
            <span className="text-blue-300">& Analyzes</span>
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed text-blue-100/70">
            Chat naturally. Analyze documents. Generate images. 100+ languages.
            All in one powerful AI assistant that works on any device.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href={ctaHref}>
              <button className="flex items-center gap-2.5 px-9 py-4 rounded-xl text-base font-bold transition-all shadow-lg bg-white text-blue-900 hover:bg-blue-50 shadow-white/20">
                {ctaLabel} <ArrowRight size={18} />
              </button>
            </Link>
            <button onClick={() => setShowQR(true)} className="flex items-center gap-2.5 px-9 py-4 rounded-xl text-base font-bold border text-white hover:bg-white/10 transition-all border-white/20">
              <QrCode size={18} /> Open on Phone
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-blue-200/60">
            <span className="flex items-center gap-2"><Check size={15} className="text-emerald-400" /> Free forever</span>
            <span className="flex items-center gap-2"><Check size={15} className="text-emerald-400" /> No credit card</span>
            <span className="flex items-center gap-2"><Check size={15} className="text-emerald-400" /> Works on all devices</span>
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
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-16">
            <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight ${D ? "text-white" : "text-gray-900"}`}>
              Take total<br />control
            </h2>
            <p className={`text-lg max-w-md lg:pt-3 ${D ? "text-gray-400" : "text-gray-500"}`}>
              Just some of the advanced features you can deploy with TurboAnswer.
            </p>
          </div>

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
                    <Cpu className="h-3.5 w-3.5" /> 10 AI Models · 10 Expert Perspectives
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black mb-5 leading-tight">
                    <span className={D ? "text-blue-400" : "text-blue-600"}>10 AI Brains.</span><br />
                    <span className={D ? "text-white" : "text-gray-900"}>One answer.</span>
                  </h2>
                  <p className={`text-lg mb-8 leading-relaxed ${D ? "text-gray-300" : "text-gray-600"}`}>
                    The Research plan uses ten AI models simultaneously. GPT-4o, Claude, Mistral, Llama, DeepSeek, Qwen, and more. Each analyzes from a different expert angle, then synthesizes into one comprehensive answer.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {[
                      { icon: <Microscope className="h-4 w-4 text-indigo-400" />, label: "10 Expert Agents", desc: "Technical, business, security, UX & more" },
                      { icon: <Brain className="h-4 w-4 text-violet-400" />, label: "10 Different Models", desc: "GPT-4o, Claude, Mistral, Llama..." },
                      { icon: <Layers className="h-4 w-4 text-cyan-400" />, label: "Parallel Analysis", desc: "All 10 run simultaneously" },
                      { icon: <BarChart3 className="h-4 w-4 text-indigo-400" />, label: "Unified Synthesis", desc: "One answer, every perspective" },
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
                    { title: "10 Models, 10 Perspectives", body: "Every complex question is analyzed by GPT-4o, Claude, Mistral, Llama, DeepSeek, Qwen, and more — all working in parallel.", badge: "Unique", bColor: "#6366f1" },
                    { title: "Expert Depth on Every Response", body: "Technical architect, business strategist, security analyst, UX researcher — each powered by a different AI brain.", badge: "Always On", bColor: "#8b5cf6" },
                    { title: "Superior Coding & Math", body: "Tackles complex algorithms, debugging, architecture design, and advanced mathematics with near-human accuracy.", badge: "Pro-Level", bColor: "#06b6d4" },
                    { title: "Creative & Strategic Thinking", body: "From business strategy to creative writing, 10 different AI perspectives produce nuanced, comprehensive work.", badge: "All Domains", bColor: "#3b82f6" },
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
              { label: "AI Model", free: "Basic Lite", paid: "Advanced Flash / 10 Models", icon: <Brain className="h-5 w-5" /> },
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
                    <span className="text-xs font-bold text-indigo-500 tracking-wide">10 AI MODELS — MULTI-AGENT RESEARCH</span>
                  </div>
                  <ul className="space-y-3 mb-7">
                    <li className="flex items-start gap-2.5 rounded-xl p-2.5 -mx-1" style={{ background: D ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.04)", border: `1px solid ${D ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)"}` }}>
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5"><Code2 className="h-3 w-3 text-white" /></div>
                      <div>
                        <span className={`text-sm font-bold ${D ? "text-blue-300" : "text-blue-700"}`}>Code Studio</span>
                        <div className={`text-xs mt-0.5 ${D ? "text-blue-400/70" : "text-blue-500"}`}>Build full apps with one prompt · Claude Opus 4</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5 rounded-xl p-2.5 -mx-1" style={{ background: D ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.04)", border: `1px solid ${D ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)"}` }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}><Film className="h-3 w-3 text-white" /></div>
                      <div>
                        <span className={`text-sm font-bold ${D ? "text-violet-300" : "text-violet-700"}`}>AI Video Studio</span>
                        <div className={`text-xs mt-0.5 ${D ? "text-violet-400/70" : "text-violet-500"}`}>Generate AI videos with Google Veo</div>
                      </div>
                    </li>
                    {["Everything in Pro", "10 AI models analyze in parallel", "GPT-4o + Claude + Mistral + more", "Synthesized expert answers", "Advanced reasoning & math", "Workgroups & team collaboration", "Priority queue access"].map((item, i) => (
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
              <p>We built multi-model AI intelligence. We added voice commands, document analysis, image generation, crisis support, enterprise-grade security, and a system fast enough to feel like a real conversation.</p>
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
