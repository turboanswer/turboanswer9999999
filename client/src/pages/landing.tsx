import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Brain, FileText, Globe, Shield, MessageSquare, Menu, X, QrCode, ImageIcon, Camera, Sparkles, ArrowRight, Check, Lock, Palette, Search, Code, BookOpen, Lightbulb, HeartPulse, Scale, TrendingUp, Wrench, Crown, Rocket, Star, ChevronRight, FlaskConical, Microscope, Cpu, Layers, BarChart3, Film } from "lucide-react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import TurboLogo from "@/components/TurboLogo";


function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const stars: { x: number; y: number; size: number; speed: number; opacity: number; twinkleSpeed: number; twinkleOffset: number }[] = [];
    const shootingStars: { x: number; y: number; length: number; speed: number; opacity: number; angle: number; active: boolean }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.05,
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        const twinkle = Math.sin(frame * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${star.opacity * twinkle})`;
        ctx.fill();

        if (star.size > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(150, 180, 255, ${star.opacity * twinkle * 0.15})`;
          ctx.fill();
        }

        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      if (frame % 300 === 0 && shootingStars.length < 3) {
        shootingStars.push({
          x: Math.random() * canvas.width,
          y: 0,
          length: Math.random() * 80 + 40,
          speed: Math.random() * 8 + 6,
          opacity: 1,
          angle: Math.PI / 4 + (Math.random() * 0.3 - 0.15),
          active: true,
        });
      }

      shootingStars.forEach((ss) => {
        if (!ss.active) return;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        const tailX = ss.x - Math.cos(ss.angle) * ss.length;
        const tailY = ss.y - Math.sin(ss.angle) * ss.length;
        const gradient = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${ss.opacity})`);
        gradient.addColorStop(1, `rgba(100, 150, 255, 0)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.opacity -= 0.008;
        if (ss.opacity <= 0 || ss.y > canvas.height || ss.x > canvas.width) {
          ss.active = false;
        }
      });

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

function OrbitalRing({ size, duration, delay, color }: { size: number; duration: number; delay: number; color: string }) {
  return (
    <div
      className="absolute rounded-full border opacity-20"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderColor: color,
        animation: `spin ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
}

function GlowOrb({ className, color, size }: { className?: string; color: string; size: number }) {
  return (
    <div
      className={`absolute rounded-full blur-[100px] animate-pulse ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
    />
  );
}


export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  // Auth-aware CTA
  const { isAuthenticated, user } = useAuth();
  const ctaHref = isAuthenticated ? "/chat" : "/login";
  const ctaLabel = isAuthenticated ? "Go to Chat" : "Login / Sign Up";
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const features = [
    { icon: <Brain className="h-6 w-6" />, title: "Multi-Model AI Chat", desc: "Powered by Gemini 3.1 Flash Lite, Gemini 3.1 Flash, and Gemini 3.1 Pro for intelligent conversations on any topic.", color: "blue", glow: "rgba(59,130,246,0.3)" },
    { icon: <FileText className="h-6 w-6" />, title: "Document Analysis", desc: "Upload any document and get instant summaries, key insights, and detailed answers. Supports TXT, CSV, JSON, and more.", color: "green", glow: "rgba(34,197,94,0.3)" },
    { icon: <ImageIcon className="h-6 w-6" />, title: "AI Image Generation", desc: "Create stunning images from text descriptions using DALL-E 3. Generate art, designs, and visuals instantly.", color: "pink", glow: "rgba(236,72,153,0.3)" },
    { icon: <Globe className="h-6 w-6" />, title: "100+ Languages", desc: "Chat in any language with automatic detection and native-quality responses. Supports over 100 languages worldwide.", color: "purple", glow: "rgba(168,85,247,0.3)" },
    { icon: <Camera className="h-6 w-6" />, title: "Camera Vision", desc: "Point your camera at anything and get instant AI analysis. Identify objects, read text, solve problems visually.", color: "cyan", glow: "rgba(6,182,212,0.3)" },
    { icon: <Zap className="h-6 w-6" />, title: "Ultra-Fast Responses", desc: "Get answers in under a second with our optimized AI pipeline. No waiting, no lag, just instant intelligence.", color: "yellow", glow: "rgba(234,179,8,0.3)" },
    { icon: <Search className="h-6 w-6" />, title: "Always-On Gemini 3.1 Pro", desc: "Research tier maxes out every response with Gemini 3.1 Pro — comprehensive, expert-level depth on every question, automatically.", color: "indigo", glow: "rgba(99,102,241,0.3)" },
    { icon: <Palette className="h-6 w-6" />, title: "Dark & Light Themes", desc: "Switch between dark and light themes instantly. Your preference is saved and remembered across sessions.", color: "rose", glow: "rgba(244,63,94,0.3)" },
    { icon: <Shield className="h-6 w-6" />, title: "Privacy & Security", desc: "Your conversations stay private. Secure authentication, encrypted data, and no data selling. Ever.", color: "emerald", glow: "rgba(16,185,129,0.3)" },
    { icon: <QrCode className="h-6 w-6" />, title: "Mobile Ready", desc: "Works perfectly on any device. Scan a QR code to instantly open TurboAnswer on your phone or tablet.", color: "violet", glow: "rgba(139,92,246,0.3)" },
  ];

  const knowledgeDomains = [
    { icon: <Code className="h-5 w-5" />, label: "Programming & Code" },
    { icon: <HeartPulse className="h-5 w-5" />, label: "Health & Medicine" },
    { icon: <Scale className="h-5 w-5" />, label: "Legal & Law" },
    { icon: <TrendingUp className="h-5 w-5" />, label: "Finance & Business" },
    { icon: <BookOpen className="h-5 w-5" />, label: "Education & Learning" },
    { icon: <Lightbulb className="h-5 w-5" />, label: "Science & Research" },
    { icon: <Wrench className="h-5 w-5" />, label: "Engineering" },
    { icon: <Palette className="h-5 w-5" />, label: "Creative & Writing" },
  ];

  const colorMap: Record<string, { card: string; iconBg: string; text: string }> = {
    blue: { card: isDark ? "border-blue-500/30 bg-blue-500/5" : "border-blue-300 bg-blue-50", iconBg: isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600", text: "text-blue-400" },
    green: { card: isDark ? "border-green-500/30 bg-green-500/5" : "border-green-300 bg-green-50", iconBg: isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600", text: "text-green-400" },
    pink: { card: isDark ? "border-pink-500/30 bg-pink-500/5" : "border-pink-300 bg-pink-50", iconBg: isDark ? "bg-pink-500/20 text-pink-400" : "bg-pink-100 text-pink-600", text: "text-pink-400" },
    purple: { card: isDark ? "border-purple-500/30 bg-purple-500/5" : "border-purple-300 bg-purple-50", iconBg: isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600", text: "text-purple-400" },
    cyan: { card: isDark ? "border-cyan-500/30 bg-cyan-500/5" : "border-cyan-300 bg-cyan-50", iconBg: isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-600", text: "text-cyan-400" },
    yellow: { card: isDark ? "border-yellow-500/30 bg-yellow-500/5" : "border-yellow-300 bg-yellow-50", iconBg: isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-600", text: "text-yellow-400" },
    indigo: { card: isDark ? "border-indigo-500/30 bg-indigo-500/5" : "border-indigo-300 bg-indigo-50", iconBg: isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-600", text: "text-indigo-400" },
    rose: { card: isDark ? "border-rose-500/30 bg-rose-500/5" : "border-rose-300 bg-rose-50", iconBg: isDark ? "bg-rose-500/20 text-rose-400" : "bg-rose-100 text-rose-600", text: "text-rose-400" },
    emerald: { card: isDark ? "border-emerald-500/30 bg-emerald-500/5" : "border-emerald-300 bg-emerald-50", iconBg: isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600", text: "text-emerald-400" },
    violet: { card: isDark ? "border-violet-500/30 bg-violet-500/5" : "border-violet-300 bg-violet-50", iconBg: isDark ? "bg-violet-500/20 text-violet-400" : "bg-violet-100 text-violet-600", text: "text-violet-400" },
  };

  return (
    <div className={`min-h-screen overflow-x-hidden relative ${isDark ? 'bg-[#131314] text-white' : 'bg-gradient-to-b from-slate-50 via-white to-slate-50 text-gray-900'}`}>
      {isDark && <StarField />}

      <style>{`
        @keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1); } 50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.5), 0 0 80px rgba(99, 102, 241, 0.2); } }
        @keyframes border-glow { 0%, 100% { border-color: rgba(99,102,241,0.3); } 50% { border-color: rgba(168,85,247,0.5); } }
        @keyframes text-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .shimmer-text { background-size: 200% auto; animation: text-shimmer 3s linear infinite; }
        .hover-glow:hover { box-shadow: 0 0 30px rgba(99, 102, 241, 0.2), 0 0 60px rgba(168, 85, 247, 0.1); }
        .card-hologram { backdrop-filter: blur(10px); transition: all 0.3s ease; }
        .card-hologram:hover { transform: translateY(-4px); }
      `}</style>

      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl ${isDark ? 'bg-[#131314]/80 border-[#3c4043]' : 'bg-white/80 border-gray-200'} border-b`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TurboLogo size={32} animated={false} />
            <span className="text-lg sm:text-xl font-bold tracking-tight">Turbo Answer</span>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <a href="#features" className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>Features</a>
            <a href="#pricing" className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>Pricing</a>
            <a href="#mobile" className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>Mobile</a>
            <button onClick={toggleTheme} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              {isDark ? <span className="text-lg">&#9728;</span> : <span className="text-lg">&#9790;</span>}
            </button>
            <Link href={ctaHref}>
              <Button size="sm" className="font-medium px-5 rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314]">
                {ctaLabel}
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <button onClick={toggleTheme} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              {isDark ? <span className="text-lg">&#9728;</span> : <span className="text-lg">&#9790;</span>}
            </button>
            <button
              className={`p-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className={`sm:hidden border-t px-4 py-4 space-y-2 ${isDark ? 'border-[#3c4043] bg-[#131314]/95 backdrop-blur-xl' : 'border-gray-200 bg-white/95'}`}>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className={`w-full justify-start ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Features
              </Button>
            </a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className={`w-full justify-start ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Pricing
              </Button>
            </a>
            <a href="#mobile" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className={`w-full justify-start ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Mobile
              </Button>
            </a>
            <Link href={ctaHref} className="block">
              <Button className="w-full font-medium rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314]">
                {ctaLabel}
              </Button>
            </Link>
          </div>
        )}
      </nav>

      <section className="pt-28 sm:pt-44 pb-20 sm:pb-32 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <GlowOrb className="top-10 left-1/4" color="rgba(99,102,241,0.15)" size={600} />
          <GlowOrb className="top-40 right-1/4" color="rgba(168,85,247,0.12)" size={500} />
          <GlowOrb className="bottom-0 left-1/2 -translate-x-1/2" color="rgba(236,72,153,0.08)" size={700} />
          {isDark && (
            <>
              <GlowOrb className="top-20 right-10" color="rgba(6,182,212,0.08)" size={300} />
              <GlowOrb className="bottom-20 left-10" color="rgba(59,130,246,0.1)" size={400} />
            </>
          )}
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="flex justify-center mb-8">
            <div className="relative inline-block">
              <div className="relative flex justify-center" style={{ animation: 'float 6s ease-in-out infinite' }}>
                <TurboLogo size={100} animated={true} />
              </div>
              {isDark && (
                <>
                  <OrbitalRing size={160} duration={8} delay={0} color="rgba(99,102,241,0.4)" />
                  <OrbitalRing size={200} duration={12} delay={2} color="rgba(168,85,247,0.3)" />
                  <OrbitalRing size={240} duration={16} delay={4} color="rgba(236,72,153,0.2)" />
                </>
              )}
            </div>
          </div>

          {/* Code Studio launch announcement */}
          <div className="flex justify-center mb-6">
            <div className={`relative inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl text-sm font-semibold overflow-hidden shadow-xl ${isDark ? 'bg-black/60 border border-white/10' : 'bg-white border border-gray-200 shadow-lg'}`}>
              {/* Purple/cyan top bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, #8b5cf6, #22d3ee)" }} />
              <span style={{ color: "#a78bfa", fontSize: "18px" }}>⚡</span>
              <span className={isDark ? 'text-white' : 'text-gray-900'} style={{ background: "linear-gradient(90deg, #a78bfa, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Code Studio
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Antigravity · Gemini 3.1 Pro · Research</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>NEW</span>
            </div>
          </div>

          <div className="flex justify-center mb-8">
            <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm ${isDark ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border border-indigo-200 text-indigo-600'}`} style={isDark ? { animation: 'border-glow 3s ease-in-out infinite' } : {}}>
              <Rocket className="h-4 w-4" />
              <span className="font-medium">Next-Gen AI Intelligence</span>
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight mb-6">
            <span className={isDark ? 'text-white' : 'text-gray-900'}>Your AI That</span><br />
            <span
              className="shimmer-text bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(90deg, #4285F4, #EA4335, #FBBC05, #34A853, #4285F4)',
                backgroundSize: '200% auto',
              }}
            >
              Thinks, Creates & Analyzes
            </span>
          </h1>

          <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Chat naturally. Analyze documents. Generate images. 100+ languages. 
            All in one powerful AI assistant that works on any device.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link href={ctaHref}>
              <Button size="lg" className="w-full sm:w-auto text-lg px-10 py-7 font-medium rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314]">
                {ctaLabel}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className={`w-full sm:w-auto text-lg px-8 py-7 rounded-full ${isDark ? 'border-[#3c4043] text-[#c4c7c5] hover:bg-[#1e1f20] hover:border-[#5f6368]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`} onClick={() => setShowQR(true)}>
              <QrCode className="h-5 w-5 mr-2" />
              Open on Phone
            </Button>
          </div>

          <div className={`flex flex-wrap items-center justify-center gap-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-3 w-3 text-green-400" />
              </div>
              Free forever
            </span>
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-3 w-3 text-green-400" />
              </div>
              No credit card
            </span>
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-3 w-3 text-green-400" />
              </div>
              Works on all devices
            </span>
          </div>

        </div>
      </section>

      {/* ════ ANTIGRAVITY SHOWCASE SECTION ════ */}
      <section className="relative py-24 sm:py-36 px-4 overflow-hidden">
        {/* Multi-color Google glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30" style={{background:'#4285F4'}} />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-25" style={{background:'#EA4335'}} />
          <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] rounded-full blur-[110px] opacity-20" style={{background:'#FBBC05'}} />
          <div className="absolute bottom-1/4 right-1/5 w-[380px] h-[380px] rounded-full blur-[100px] opacity-25" style={{background:'#34A853'}} />
          {/* Dark overlay so text is readable */}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <style>{`
          @keyframes antigravity-float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-18px)} }
          @keyframes color-pulse-blue { 0%,100%{box-shadow:0 0 30px #4285F466,0 0 60px #4285F433} 50%{box-shadow:0 0 60px #4285F499,0 0 100px #4285F466} }
        `}</style>

        <div className="relative z-10 max-w-5xl mx-auto text-center">

          {/* NEW badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black text-white animate-pulse"
              style={{background:'linear-gradient(135deg,#4285F4,#EA4335,#FBBC05,#34A853)', backgroundSize:'200%'}}>
              ✦ JUST LAUNCHED · RESEARCH EXCLUSIVE
            </div>
          </div>

          {/* Floating Google G logo */}
          <div className="flex justify-center mb-8">
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl" style={{
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255,255,255,0.15)',
              animation: 'antigravity-float 4s ease-in-out infinite, color-pulse-blue 3s ease-in-out infinite',
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
          </div>

          {/* ANTIGRAVITY title — clean Google-color gradient, professional */}
          <h2 className="text-5xl sm:text-6xl lg:text-8xl font-black leading-none tracking-tighter mb-6 select-none"
            style={{
              background: 'linear-gradient(90deg, #4285F4 0%, #EA4335 30%, #FBBC05 60%, #34A853 85%, #4285F4 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'text-shimmer 4s linear infinite',
              letterSpacing: '-0.02em',
            }}>
            ANTIGRAVITY
          </h2>

          <p className="text-xl sm:text-2xl text-white/70 font-medium mb-4 max-w-2xl mx-auto">
            Describe any app. Watch it appear.
          </p>
          <p className="text-base text-white/50 mb-12 max-w-xl mx-auto">
            Google's agent-first AI IDE, powered by Gemini 3.1 Pro — now inside TurboAnswer Research.
          </p>

          {/* Feature cards — bright colored, floating */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12 max-w-3xl mx-auto">
            {[
              {icon:'🚀', label:'One-Prompt Build', sub:'Describe → Done', color:'#4285F4'},
              {icon:'⚡', label:'Live Preview', sub:'Instant feedback', color:'#EA4335'},
              {icon:'🌐', label:'Deploy Instantly', sub:'Public URL in 1 click', color:'#FBBC05'},
              {icon:'🧠', label:'Gemini 3.1 Pro', sub:'Maximum intelligence', color:'#34A853'},
            ].map((f,i) => (
              <div key={i} className="rounded-2xl p-4 text-center" style={{
                background: `${f.color}18`,
                border: `1px solid ${f.color}55`,
                boxShadow: `0 0 30px ${f.color}33`,
                animation: `antigravity-float ${3+i*0.4}s ease-in-out infinite`,
                animationDelay: `${i*0.3}s`,
              }}>
                <div className="text-3xl mb-2">{f.icon}</div>
                <div className="text-white font-bold text-sm">{f.label}</div>
                <div className="text-white/50 text-xs mt-1">{f.sub}</div>
              </div>
            ))}
          </div>

          {/* Giant CTA */}
          <Link href={isAuthenticated ? "/code-studio" : "/login"}>
            <button className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-xl text-white shadow-2xl overflow-hidden transition-transform duration-200 hover:scale-105" style={{
              background: 'linear-gradient(135deg, #4285F4 0%, #EA4335 33%, #FBBC05 66%, #34A853 100%)',
              backgroundSize: '200% 200%',
              animation: 'text-shimmer 3s linear infinite',
              boxShadow: '0 0 40px rgba(66,133,244,0.5), 0 0 80px rgba(234,67,53,0.3)',
            }}>
              <span>Try Code Studio Free</span>
              <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
          <p className="text-white/40 text-sm mt-4">Included with Research plan · $30/month · 7-day free trial</p>

        </div>
      </section>

      <div className="relative z-10 w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 py-4 px-4 text-center shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-white animate-pulse" />
            <span className="text-white text-lg sm:text-xl font-bold tracking-wide">
              Need Support? Call Now!
            </span>
          </div>
          <a
            href="tel:+18664677269"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold text-lg sm:text-xl px-6 py-2 rounded-full hover:bg-emerald-50 transition-colors shadow-md"
          >
            (866) 467-7269
          </a>
          <span className="text-white/90 text-sm sm:text-base font-medium">
            M-F 9:30 AM - 6 PM EST
          </span>
        </div>
      </div>

      <section id="features" className="py-20 sm:py-32 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 sm:mb-20">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-6 ${isDark ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' : 'bg-purple-50 border border-purple-200 text-purple-600'}`}>
              <Sparkles className="h-3.5 w-3.5" />
              Capabilities
            </div>
            <h2 className="text-3xl sm:text-5xl font-black mb-4">
              Everything{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">TurboAnswer</span>
              {" "}Can Do
            </h2>
            <p className={`text-lg max-w-xl mx-auto ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              One AI assistant packed with powerful features for every need
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f, i) => {
              const colors = colorMap[f.color];
              return (
                <div
                  key={i}
                  className={`card-hologram rounded-2xl p-6 border relative overflow-hidden group ${colors.card}`}
                  style={isDark ? { boxShadow: `0 0 0 rgba(0,0,0,0)` } : {}}
                  onMouseEnter={(e) => {
                    if (isDark) (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${f.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    if (isDark) (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 rgba(0,0,0,0)`;
                  }}
                >
                  {isDark && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 50% 0%, ${f.glow}, transparent 70%)` }} />
                  )}
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors.iconBg}`}>
                      {f.icon}
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{f.title}</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`py-20 sm:py-32 px-4 relative z-10 ${isDark ? '' : 'bg-gradient-to-b from-white via-indigo-50/30 to-white'}`}>
        {isDark && (
          <div className="absolute inset-0 pointer-events-none">
            <GlowOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" color="rgba(99,102,241,0.05)" size={800} />
          </div>
        )}
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-6 ${isDark ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border border-cyan-200 text-cyan-600'}`}>
              <Brain className="h-3.5 w-3.5" />
              Knowledge
            </div>
            <h2 className="text-3xl sm:text-5xl font-black mb-4">
              Expert Knowledge in{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Every Field</span>
            </h2>
            <p className={`text-lg max-w-xl mx-auto ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              TurboAnswer provides professional-level answers across all major domains
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {knowledgeDomains.map((d, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 hover:scale-105 ${isDark ? 'bg-white/[0.03] border-white/10 text-gray-300 hover:border-indigo-500/30 hover:bg-indigo-500/5' : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'}`}
              >
                <span className={isDark ? "text-indigo-400" : "text-indigo-600"}>{d.icon}</span>
                <span className="text-sm font-medium">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gemini 3.1 Pro Spotlight Banner */}
      <section className="py-16 sm:py-24 px-4 relative z-10 overflow-hidden">
        {isDark && (
          <div className="absolute inset-0 pointer-events-none">
            <GlowOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" color="rgba(99,102,241,0.12)" size={900} />
          </div>
        )}
        <div className="max-w-6xl mx-auto relative z-10">
          <div className={`rounded-3xl border-2 overflow-hidden relative ${isDark ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-slate-950/80 to-violet-950/60' : 'border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-2xl shadow-indigo-100'}`}>
            {/* Top shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
            {/* Subtle grid pattern overlay */}
            {isDark && <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px'}} />}

            <div className="p-8 sm:p-12 lg:p-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Left: text */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-6">
                    <Cpu className="h-3.5 w-3.5" /> Google's Most Advanced Model
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black mb-5 leading-tight">
                    <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">Gemini 3.1 Pro</span>
                    <br />
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>is here.</span>
                  </h2>
                  <p className={`text-lg mb-8 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    The most capable AI model available on TurboAnswer. Powered by Google's flagship Gemini 3.1 Pro, the Research plan gives you access to the same intelligence used by professionals, researchers, and enterprises worldwide.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {[
                      { icon: <Microscope className="h-4 w-4 text-indigo-400" />, label: "Always Maximum Depth", desc: "Every answer uses full Gemini 3.1 Pro power" },
                      { icon: <Brain className="h-4 w-4 text-violet-400" />, label: "Advanced Reasoning", desc: "Solves complex, multi-step problems" },
                      { icon: <Layers className="h-4 w-4 text-cyan-400" />, label: "1M Token Context", desc: "Analyze entire books & codebases" },
                      { icon: <BarChart3 className="h-4 w-4 text-indigo-400" />, label: "Expert Analysis", desc: "Research-grade depth on any topic" },
                    ].map((f, i) => (
                      <div key={i} className={`flex items-start gap-3 rounded-xl p-3.5 border ${isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-white/80 border-indigo-100 shadow-sm'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>{f.icon}</div>
                        <div>
                          <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{f.label}</div>
                          <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href={ctaHref}>
                    <Button className="rounded-xl h-13 px-8 font-bold text-base bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:from-indigo-500 hover:via-violet-500 hover:to-cyan-500 shadow-xl shadow-indigo-500/30 transition-all duration-200 hover:shadow-indigo-500/50 hover:scale-[1.02]">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Try Research Free for 7 Days
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                  <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No credit card charged during trial · Cancel anytime</p>
                </div>

                {/* Right: capability cards */}
                <div className="space-y-3">
                  {[
                    { title: "Expert Depth on Every Response", body: "No toggle needed. Every question on the Research plan automatically uses Gemini 3.1 Pro at full power — thorough, structured, expert-level answers every time.", badge: "Always On", color: "indigo" },
                    { title: "Superior Coding & Math", body: "Tackles complex algorithms, debugging, architecture design, and advanced mathematics with near-human accuracy and clear explanations.", badge: "Pro-Level", color: "violet" },
                    { title: "Long Document Mastery", body: "Upload entire PDFs, legal contracts, or research papers and get precise, detailed analysis. 1 million token context means nothing gets missed.", badge: "Unmatched", color: "cyan" },
                    { title: "Creative & Strategic Thinking", body: "From business strategy to creative writing, Gemini 3.1 Pro produces work that's nuanced, structured, and remarkably human.", badge: "All Domains", color: "blue" },
                  ].map((c, i) => (
                    <div key={i} className={`rounded-2xl p-5 border transition-all hover:scale-[1.01] ${isDark ? 'bg-white/[0.03] border-white/[0.07] hover:border-indigo-500/30' : 'bg-white border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md'}`}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                          c.color === 'indigo' ? 'bg-indigo-500/15 text-indigo-400' :
                          c.color === 'violet' ? 'bg-violet-500/15 text-violet-400' :
                          c.color === 'cyan' ? 'bg-cyan-500/15 text-cyan-400' :
                          'bg-blue-500/15 text-blue-400'
                        }`}>{c.badge}</span>
                      </div>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 sm:py-32 px-4 relative z-10">
        {isDark && (
          <div className="absolute inset-0 pointer-events-none">
            <GlowOrb className="top-0 left-1/3" color="rgba(168,85,247,0.06)" size={600} />
            <GlowOrb className="bottom-0 right-1/3" color="rgba(236,72,153,0.06)" size={500} />
          </div>
        )}
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-6 ${isDark ? 'bg-pink-500/10 border border-pink-500/20 text-pink-400' : 'bg-pink-50 border border-pink-200 text-pink-600'}`}>
              <Crown className="h-3.5 w-3.5" />
              Plans
            </div>
            <h2 className="text-3xl sm:text-5xl font-black mb-4">
              Simple{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Pricing</span>
            </h2>
            <p className={`text-lg max-w-xl mx-auto ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Start free, upgrade when you need more power
            </p>
            <div className="inline-flex items-center gap-2 mt-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold px-4 py-1.5 rounded-full">
              <Check className="h-4 w-4" /> All paid plans include a 7-day free trial
            </div>
          </div>

          {/* Pricing cards — Research is the centrepiece */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">

            {/* Free */}
            <div className={`card-hologram rounded-2xl p-7 border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="mb-5">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Free</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black">$0</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/month</span>
                </div>
              </div>
              <div className={`text-sm mb-5 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Gemini 3.1 Flash Lite</div>
              <ul className="space-y-3 mb-7">
                {["AI chat conversations", "Document analysis", "100+ languages", "Dark & light themes", "Mobile access"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-green-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <Button variant="outline" className={`w-full rounded-xl h-12 font-semibold ${isDark ? 'border-white/10 hover:bg-white/5 text-gray-300' : 'border-gray-300 hover:bg-gray-100'}`}>
                  {isAuthenticated ? "Go to Chat" : "Get Started Free"}
                </Button>
              </Link>
            </div>

            {/* Research — FEATURED */}
            <div className="relative pt-5 md:-mt-4 md:-mb-4">
              {/* Badge sits OUTSIDE overflow-hidden card so it's always visible */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-4 py-1.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 rounded-full text-xs font-black text-white tracking-wide shadow-lg shadow-indigo-500/40 flex items-center gap-1.5">
                <Star className="h-3 w-3 fill-white" /> MOST POWERFUL
              </div>
            <div className={`card-hologram rounded-2xl border-2 relative overflow-hidden ${isDark ? 'border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 to-slate-950/60 shadow-2xl shadow-indigo-500/20' : 'border-indigo-400 bg-gradient-to-b from-indigo-50/60 to-white shadow-2xl shadow-indigo-200'}`}>
              {/* Animated shimmer top border */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-violet-500" />
              {/* Glow behind card in dark mode */}
              {isDark && <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{boxShadow: '0 0 60px rgba(99,102,241,0.15) inset'}} />}
              <div className="p-8 pt-10">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Microscope className="h-5 w-5 text-indigo-400" /> Research
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-5xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">$30</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/month</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-2 bg-green-500/15 text-green-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  <Check className="h-3 w-3" /> 7-day free trial
                </div>

                <div className="mt-4 mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30">
                  <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-400 tracking-wide">GEMINI 3.1 PRO — FLAGSHIP MODEL</span>
                </div>

                <ul className="space-y-3 mb-7">
                  {/* Antigravity highlight */}
                  <li className={`flex items-start gap-2.5 rounded-xl p-2.5 -mx-1 relative overflow-hidden ${isDark ? 'bg-black/50 border border-white/10' : 'bg-white border border-gray-200 shadow-sm'}`}>
                    <div className="absolute top-0 left-0 right-0 h-0.5 flex">
                      {["#4285F4","#EA4335","#FBBC05","#34A853"].map((c,k) => <div key={k} className="flex-1" style={{background:c}} />)}
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <div>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}><span style={{color:'#4285F4'}}>A</span><span style={{color:'#EA4335'}}>n</span><span style={{color:'#FBBC05'}}>t</span><span style={{color:'#34A853'}}>i</span>gravity</span>
                      <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Build full apps with one prompt</div>
                    </div>
                  </li>
                  {/* Video Studio highlight */}
                  <li className={`flex items-start gap-2.5 rounded-xl p-2.5 -mx-1 ${isDark ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-violet-50 border border-violet-200'}`}>
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Film className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <span className={`text-sm font-bold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>AI Video Studio</span>
                      <div className={`text-xs mt-0.5 ${isDark ? 'text-violet-400/70' : 'text-violet-500'}`}>Generate AI videos with Google Veo</div>
                    </div>
                  </li>

                  {[
                    { text: "Everything in Pro", sub: null },
                    { text: "Gemini 3.1 Pro model", sub: "Google's most capable AI" },
                    { text: "Always-on maximum depth", sub: "No toggle — every reply at full power" },
                    { text: "1M token context window", sub: "Analyze entire books & codebases" },
                    { text: "Advanced reasoning & math", sub: "Solves complex multi-step problems" },
                    { text: "Priority queue access", sub: "Always fast, never throttled" },
                    { text: "Extended long-form responses", sub: "Full-depth answers, no truncation" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isDark ? 'bg-indigo-500/25' : 'bg-indigo-100'}`}>
                        <Check className="h-3 w-3 text-indigo-400" />
                      </div>
                      <div>
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.text}</span>
                        {item.sub && <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.sub}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href={ctaHref}>
                  <Button className="w-full rounded-xl h-13 font-black text-base bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:from-indigo-500 hover:via-violet-500 hover:to-cyan-500 shadow-xl shadow-indigo-500/30 transition-all duration-200 hover:shadow-indigo-500/50">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isAuthenticated ? "Unlock Research" : "Start Free Trial"}
                  </Button>
                </Link>
                <p className={`text-center text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Cancel anytime · No charge for 7 days</p>
              </div>
            </div>
            </div>{/* end Research wrapper */}

            {/* Pro */}
            <div className="relative pt-5">
              {/* Badge outside overflow-hidden so it's fully visible */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xs font-bold text-white tracking-wide shadow-lg shadow-purple-500/30">
                POPULAR
              </div>
            <div className={`card-hologram rounded-2xl p-7 border-2 relative overflow-hidden ${isDark ? 'border-purple-500/40 bg-purple-500/[0.03]' : 'border-purple-400 bg-purple-50/30 shadow-lg shadow-purple-100'}`}>
              <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
              <div className="mb-5 mt-2">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Crown className="h-5 w-5 text-purple-400" /> Pro
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black">$6.99</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/month</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-1.5 bg-green-500/15 text-green-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  <Check className="h-3 w-3" /> 7-day free trial
                </div>
              </div>
              <div className={`text-sm mb-5 font-medium ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Gemini 3.1 Flash</div>
              <ul className="space-y-3 mb-7">
                {["Everything in Free", "Gemini 3.1 Flash model", "Faster responses", "Priority processing", "AI image generation", "Advanced analysis"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-purple-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={ctaHref}>
                <Button className="w-full rounded-xl h-12 font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/20">
                  {isAuthenticated ? "Go to Chat" : "Upgrade to Pro"}
                </Button>
              </Link>
            </div>
            </div>{/* end Pro wrapper */}

          </div>
        </div>
      </section>

      <section className={`py-20 sm:py-32 px-4 relative z-10 ${isDark ? '' : 'bg-gradient-to-b from-white via-purple-50/20 to-white'}`}>
        {isDark && (
          <div className="absolute inset-0 pointer-events-none">
            <GlowOrb className="top-1/3 left-1/4" color="rgba(99,102,241,0.06)" size={400} />
            <GlowOrb className="bottom-1/3 right-1/4" color="rgba(168,85,247,0.06)" size={400} />
          </div>
        )}
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-6 ${isDark ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border border-indigo-200 text-indigo-600'}`}>
              <Rocket className="h-3.5 w-3.5" />
              How It Works
            </div>
            <h2 className="text-3xl sm:text-5xl font-black mb-4">
              How It{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Works</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Sign Up Free", desc: "Create your account in seconds with one click. No credit card required.", icon: <Lock className="h-7 w-7" />, color: "indigo" },
              { step: "2", title: "Ask Anything", desc: "Type or speak your question. Upload documents. Generate images. The AI handles it all.", icon: <MessageSquare className="h-7 w-7" />, color: "purple" },
              { step: "3", title: "Get Smart Answers", desc: "Receive instant, accurate, and comprehensive responses powered by the best AI models.", icon: <Sparkles className="h-7 w-7" />, color: "pink" },
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${isDark ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 border border-indigo-200'}`} style={isDark ? { boxShadow: '0 0 30px rgba(99,102,241,0.15)' } : {}}>
                  {item.icon}
                </div>
                <div className={`text-xs font-black tracking-[0.2em] mb-3 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>STEP {item.step}</div>
                <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="mobile" className="py-20 sm:py-32 px-4 relative z-10">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-2 ${isDark ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400' : 'bg-violet-50 border border-violet-200 text-violet-600'}`}>
            <Globe className="h-3.5 w-3.5" />
            Go Mobile
          </div>
          <h2 className="text-3xl sm:text-5xl font-black">
            Take It{" "}
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Everywhere</span>
          </h2>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Scan the QR code with your phone camera to instantly access Turbo Answer on any mobile device.
          </p>

          {!showQR ? (
            <Button
              onClick={() => setShowQR(true)}
              size="lg"
              variant="outline"
              className={`gap-2 px-8 rounded-xl ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <QrCode className="h-5 w-5" />
              Show QR Code
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className={`p-6 rounded-3xl shadow-2xl ${isDark ? 'bg-white/5 border border-white/10 shadow-indigo-500/10' : 'bg-white border border-gray-200 shadow-lg'}`}>
                <div className="bg-white p-4 rounded-2xl">
                  <QRCodeSVG
                    value={appUrl}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>
              <p className={`text-xs break-all max-w-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{appUrl}</p>
              <Button onClick={() => setShowQR(false)} variant="ghost" size="sm" className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                Hide QR Code
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 sm:py-28 px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className={`rounded-3xl p-10 sm:p-14 border relative overflow-hidden ${isDark ? 'bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 border-white/10' : 'bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-indigo-200/50'}`}>
            {isDark && (
              <div className="absolute inset-0 pointer-events-none">
                <GlowOrb className="top-0 left-0" color="rgba(99,102,241,0.1)" size={300} />
                <GlowOrb className="bottom-0 right-0" color="rgba(236,72,153,0.1)" size={300} />
              </div>
            )}
            <div className="relative z-10">
              <div className="relative inline-block mb-6" style={{ animation: 'float 6s ease-in-out infinite' }}>
                <TurboLogo size={70} animated={false} />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black mb-5">
                Ready to Get{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">Started?</span>
              </h2>
              <p className={`text-lg mb-10 max-w-xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Join thousands using TurboAnswer to work smarter, learn faster, and create more. It's completely free to start.
              </p>
              <Link href={ctaHref}>
                <Button size="lg" className="text-lg px-12 py-7 font-bold shadow-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 shadow-purple-500/25 rounded-2xl" style={isDark ? { animation: 'glow-pulse 3s ease-in-out infinite' } : {}}>
                  {ctaLabel}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-3xl p-8 sm:p-12 border relative overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-gradient-to-br from-white via-gray-50 to-white border-gray-200'}`}>
            {isDark && (
              <div className="absolute inset-0 pointer-events-none">
                <GlowOrb className="top-0 right-0" color="rgba(168,85,247,0.05)" size={400} />
                <GlowOrb className="bottom-0 left-0" color="rgba(99,102,241,0.05)" size={400} />
              </div>
            )}
            <div className="relative z-10">
              <div className="text-center mb-8">
                <span className={`inline-block text-xs font-black tracking-[0.2em] uppercase mb-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Our Story</span>
                <h2 className={`text-3xl sm:text-4xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Built Through the Hate
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mx-auto mt-4 rounded-full"></div>
              </div>

              <div className={`space-y-6 text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>
                  When we first launched TurboAnswer, the response wasn't applause — it was ridicule. People laughed at the idea. They said we were wasting our time. They said an AI assistant built by a small team could never compete. The hate was loud, constant, and came from every direction.
                </p>
                <p>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>"It'll never work."</span>{" "}
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>"Who's going to use this?"</span>{" "}
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>"Just give up."</span>{" "}
                  We heard it all. Every single day. From people online, from doubters, even from people we knew. They wanted us to quit.
                </p>
                <p>
                  But we didn't quit. We took every piece of criticism, every hateful comment, every dismissive laugh — and we turned it into fuel. Late nights turned into breakthroughs. Setbacks turned into comebacks. Every time someone said TurboAnswer wasn't good enough, we made it better.
                </p>
                <p>
                  We built multi-model AI intelligence. We added voice commands, document analysis, image generation, crisis support, enterprise-grade security, and a system fast enough to feel like a real conversation. We didn't just build an app — we built something that actually helps people, every single day.
                </p>
                <p className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  The same people who doubted us? Some of them are our users now.
                </p>
                <p>
                  TurboAnswer exists because we refused to let the noise stop us. Innovation doesn't come from comfort — it comes from proving the doubters wrong. And we're just getting started.
                </p>
              </div>

              <div className="mt-10 pt-8 border-t flex items-center justify-center gap-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <TurboLogo size={32} animated={false} />
                <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>TurboAnswer</span>
                <span className={`mx-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>|</span>
                <span className={`italic ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Built through adversity. Powered by innovation.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beta Testing Section */}
      <section className={`py-16 px-4 relative z-10 ${isDark ? 'bg-gradient-to-b from-transparent to-purple-950/20' : 'bg-gradient-to-b from-transparent to-purple-50'}`}>
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-2xl border-2 ${isDark ? 'border-purple-600/40 bg-purple-950/30' : 'border-purple-300 bg-purple-50'} p-8 md:p-12 text-center relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, #7c3aed, transparent 70%)' }} />
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4 ${isDark ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'}`}>
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> BETA PROGRAM — NOT A JOB APPLICATION
            </div>
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Help Shape the Future of TurboAnswer
            </h2>
            <p className={`text-lg mb-2 max-w-xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              We're looking for passionate users to join our exclusive beta testing program. Get early access, try new features before anyone else, and help us build something extraordinary.
            </p>
            <p className={`text-sm mb-8 ${isDark ? 'text-yellow-400/80' : 'text-yellow-700'}`}>
              This is strictly a beta testing application and will not affect any job applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/beta">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-base font-semibold rounded-xl shadow-lg shadow-purple-900/30">
                  Apply to Be a Beta Tester
                </Button>
              </Link>
            </div>
            <div className={`mt-6 flex flex-wrap justify-center gap-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="flex items-center gap-1.5">✓ Early feature access</span>
              <span className="flex items-center gap-1.5">✓ Direct line to the team</span>
              <span className="flex items-center gap-1.5">✓ Shape the product roadmap</span>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Open Chat button for authenticated users */}
      {isAuthenticated && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          <div className={`text-xs font-medium px-3 py-1 rounded-full ${isDark ? 'bg-zinc-800 text-gray-400' : 'bg-gray-100 text-gray-500'} shadow`}>
            Signed in as {user?.firstName || user?.email?.split("@")[0] || "you"}
          </div>
          <Link href="/chat">
            <button className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-2xl shadow-purple-500/40 transition-all hover:scale-105 active:scale-95 text-sm">
              <MessageSquare className="h-4 w-4" />
              Open Chat
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      )}

      <footer className={`border-t py-8 px-4 relative z-10 ${isDark ? 'border-white/5 bg-[#030014]/80' : 'border-gray-200'}`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TurboLogo size={24} animated={false} />
            <span className="font-semibold">Turbo Answer</span>
            <span className={`text-xs ml-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>The AI that gets it done</span>
          </div>
          <div className={`flex gap-6 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <Link href="/privacy-policy" className={isDark ? 'hover:text-gray-300' : 'hover:text-gray-600'}>Privacy</Link>
            <Link href="/support" className={isDark ? 'hover:text-gray-300' : 'hover:text-gray-600'}>Support</Link>
            <Link href="/business" className={isDark ? 'hover:text-gray-300' : 'hover:text-gray-600'}>Business</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
