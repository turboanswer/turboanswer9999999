import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Brain, FileText, Globe, Shield, MessageSquare, Menu, X, QrCode, ImageIcon, Camera, Sparkles, ArrowRight, Check, Star, Lock, Palette, Search, Code, BookOpen, Lightbulb, HeartPulse, Scale, TrendingUp, Wrench, Crown, Rocket } from "lucide-react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "@/hooks/use-theme";
import TurboLogo from "@/components/TurboLogo";

const TRUSTPILOT_BUSINESS_UNIT_ID = "";

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

function TrustpilotWidget({ isDark }: { isDark: boolean }) {
  const trustpilotRef = useRef<HTMLDivElement>(null);
  const [widgetError, setWidgetError] = useState(false);

  useEffect(() => {
    if (!TRUSTPILOT_BUSINESS_UNIT_ID) return;
    try {
      if ((window as any).Trustpilot && trustpilotRef.current) {
        (window as any).Trustpilot.loadFromElement(trustpilotRef.current, true);
      }
    } catch (e) {
      setWidgetError(true);
    }
  }, []);

  return (
    <section className="py-12 sm:py-16 px-4 relative z-10">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className={`text-2xl sm:text-3xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Trusted by Users Worldwide
        </h2>
        {TRUSTPILOT_BUSINESS_UNIT_ID && !widgetError ? (
          <div
            ref={trustpilotRef}
            className="trustpilot-widget"
            data-locale="en-US"
            data-template-id="56278e9abfbbba0bdcd568bc"
            data-businessunit-id={TRUSTPILOT_BUSINESS_UNIT_ID}
            data-style-height="52px"
            data-style-width="100%"
            data-theme={isDark ? "dark" : "light"}
          >
            <a href="https://www.trustpilot.com/review/turboanswer.com" target="_blank" rel="noopener noreferrer" className={`text-sm ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}>
              See our reviews on Trustpilot
            </a>
          </div>
        ) : (
          <div className={`flex items-center justify-center gap-2 py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Star className="h-5 w-5 text-green-500 fill-green-500" />
            <a href="https://www.trustpilot.com/review/turboanswer.com" target="_blank" rel="noopener noreferrer" className={`text-sm font-medium ${isDark ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-500'} underline`}>
              See our reviews on Trustpilot
            </a>
            <Star className="h-5 w-5 text-green-500 fill-green-500" />
          </div>
        )}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const features = [
    { icon: <Brain className="h-6 w-6" />, title: "Multi-Model AI Chat", desc: "Powered by Gemini 2.5 Flash, Gemini Pro, and Gemini 2.5 Pro for intelligent conversations on any topic.", color: "blue", glow: "rgba(59,130,246,0.3)" },
    { icon: <FileText className="h-6 w-6" />, title: "Document Analysis", desc: "Upload any document and get instant summaries, key insights, and detailed answers. Supports TXT, CSV, JSON, and more.", color: "green", glow: "rgba(34,197,94,0.3)" },
    { icon: <ImageIcon className="h-6 w-6" />, title: "AI Image Generation", desc: "Create stunning images from text descriptions using DALL-E 3. Generate art, designs, and visuals instantly.", color: "pink", glow: "rgba(236,72,153,0.3)" },
    { icon: <Globe className="h-6 w-6" />, title: "100+ Languages", desc: "Chat in any language with automatic detection and native-quality responses. Supports over 100 languages worldwide.", color: "purple", glow: "rgba(168,85,247,0.3)" },
    { icon: <Camera className="h-6 w-6" />, title: "Camera Vision", desc: "Point your camera at anything and get instant AI analysis. Identify objects, read text, solve problems visually.", color: "cyan", glow: "rgba(6,182,212,0.3)" },
    { icon: <Zap className="h-6 w-6" />, title: "Ultra-Fast Responses", desc: "Get answers in under a second with our optimized AI pipeline. No waiting, no lag, just instant intelligence.", color: "yellow", glow: "rgba(234,179,8,0.3)" },
    { icon: <Search className="h-6 w-6" />, title: "Deep Research Mode", desc: "Research tier gives you Gemini 2.5 Pro for comprehensive, in-depth analysis with extended responses.", color: "indigo", glow: "rgba(99,102,241,0.3)" },
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
    <div className={`min-h-screen overflow-x-hidden relative ${isDark ? 'bg-[#030014] text-white' : 'bg-gradient-to-b from-slate-50 via-white to-slate-50 text-gray-900'}`}>
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

      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl ${isDark ? 'bg-[#030014]/70 border-white/5' : 'bg-white/80 border-gray-200'} border-b`}>
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
            <a href="/login">
              <Button size="sm" className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 font-semibold px-5 shadow-lg shadow-purple-500/20">
                Login / Sign Up
              </Button>
            </a>
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
          <div className={`sm:hidden border-t px-4 py-4 space-y-2 ${isDark ? 'border-white/5 bg-[#030014]/95 backdrop-blur-xl' : 'border-gray-200 bg-white/95'}`}>
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
            <a href="/login" className="block">
              <Button className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 font-semibold">
                Login / Sign Up
              </Button>
            </a>
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
                backgroundImage: isDark
                  ? 'linear-gradient(90deg, #818cf8, #a78bfa, #f472b6, #818cf8)'
                  : 'linear-gradient(90deg, #4f46e5, #7c3aed, #db2777, #4f46e5)',
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
            <a href="/login">
              <Button size="lg" className="w-full sm:w-auto text-lg px-10 py-7 font-bold shadow-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 shadow-purple-500/25 rounded-2xl" style={isDark ? { animation: 'glow-pulse 3s ease-in-out infinite' } : {}}>
                Login / Sign Up Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </a>
            <Button size="lg" variant="outline" className={`w-full sm:w-auto text-lg px-8 py-7 rounded-2xl ${isDark ? 'border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`} onClick={() => setShowQR(true)}>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className={`card-hologram rounded-2xl p-7 border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="mb-5">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Free</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black">$0</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/month</span>
                </div>
              </div>
              <div className={`text-sm mb-5 font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Gemini 2.5 Flash</div>
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
              <a href="/login">
                <Button variant="outline" className={`w-full rounded-xl h-12 font-semibold ${isDark ? 'border-white/10 hover:bg-white/5 text-gray-300' : 'border-gray-300 hover:bg-gray-100'}`}>
                  Get Started Free
                </Button>
              </a>
            </div>

            <div className={`card-hologram rounded-2xl p-7 border-2 relative overflow-hidden ${isDark ? 'border-purple-500/40 bg-purple-500/[0.03]' : 'border-purple-400 bg-purple-50/30 shadow-lg shadow-purple-100'}`}>
              <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xs font-bold text-white tracking-wide shadow-lg shadow-purple-500/30">
                POPULAR
              </div>
              <div className="mb-5 mt-2">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Crown className="h-5 w-5 text-purple-400" /> Pro
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black">$6.99</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/month</span>
                </div>
              </div>
              <div className={`text-sm mb-5 font-medium ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Gemini Pro</div>
              <ul className="space-y-3 mb-7">
                {["Everything in Free", "Gemini Pro model", "Faster responses", "Priority processing", "AI image generation", "Advanced analysis"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-purple-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/login">
                <Button className="w-full rounded-xl h-12 font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/20">
                  Upgrade to Pro
                </Button>
              </a>
            </div>

            <div className={`card-hologram rounded-2xl p-7 border-2 relative overflow-hidden ${isDark ? 'border-indigo-500/40 bg-indigo-500/[0.03]' : 'border-indigo-400 bg-indigo-50/30 shadow-lg shadow-indigo-100'}`}>
              <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500" />
              <div className="mb-5">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Brain className="h-5 w-5 text-indigo-400" /> Research
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black">$15</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/month</span>
                </div>
              </div>
              <div className={`text-sm mb-5 font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Gemini 2.5 Pro</div>
              <ul className="space-y-3 mb-7">
                {["Everything in Pro", "Gemini 2.5 Pro model", "Deep research analysis", "Extended responses", "Comprehensive coverage", "Top-tier intelligence"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-indigo-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/login">
                <Button className="w-full rounded-xl h-12 font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-lg shadow-indigo-500/20">
                  Upgrade to Research
                </Button>
              </a>
            </div>

            <div className={`card-hologram rounded-2xl p-7 border-2 relative overflow-hidden ${isDark ? 'border-emerald-500/40 bg-emerald-500/[0.03]' : 'border-emerald-400 bg-emerald-50/30 shadow-lg shadow-emerald-100'}`}>
              <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
              <div className="mb-5">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Zap className="h-5 w-5 text-emerald-400" /> Ultimate
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black">$25</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/month</span>
                </div>
              </div>
              <div className={`text-sm mb-5 font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>OpenAI GPT-4o</div>
              <ul className="space-y-3 mb-7">
                {["Everything in Research", "OpenAI GPT-4o model", "Superior code generation", "Advanced reasoning", "Multimodal understanding", "Priority support"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/login">
                <Button className="w-full rounded-xl h-12 font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20">
                  Upgrade to Ultimate
                </Button>
              </a>
            </div>
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
              <a href="/login">
                <Button size="lg" className="text-lg px-12 py-7 font-bold shadow-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 shadow-purple-500/25 rounded-2xl" style={isDark ? { animation: 'glow-pulse 3s ease-in-out infinite' } : {}}>
                  Login / Sign Up Free
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </a>
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

      <TrustpilotWidget isDark={isDark} />

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
