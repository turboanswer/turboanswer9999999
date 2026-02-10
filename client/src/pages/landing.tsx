import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Brain, FileText, Globe, Shield, MessageSquare, Menu, X, QrCode, ImageIcon, Camera, Sparkles, ArrowRight, Check, Star, Languages, Lock, Clock, Palette, Search, Code, BookOpen, Lightbulb, HeartPulse, Scale, TrendingUp, Wrench, Crown } from "lucide-react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "@/hooks/use-theme";
import TurboLogo from "@/components/TurboLogo";

const TRUSTPILOT_BUSINESS_UNIT_ID = "";

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
    <section className="py-12 sm:py-16 px-4">
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
    { icon: <Brain className="h-6 w-6" />, title: "Multi-Model AI Chat", desc: "Powered by Gemini 2.5 Flash, Gemini Pro, and Gemini 2.5 Pro for intelligent conversations on any topic.", color: "blue" },
    { icon: <FileText className="h-6 w-6" />, title: "Document Analysis", desc: "Upload any document and get instant summaries, key insights, and detailed answers. Supports TXT, CSV, JSON, and more.", color: "green" },
    { icon: <ImageIcon className="h-6 w-6" />, title: "AI Image Generation", desc: "Create stunning images from text descriptions using DALL-E 3. Generate art, designs, and visuals instantly.", color: "pink" },
    { icon: <Globe className="h-6 w-6" />, title: "100+ Languages", desc: "Chat in any language with automatic detection and native-quality responses. Supports over 100 languages worldwide.", color: "purple" },
    { icon: <Camera className="h-6 w-6" />, title: "Camera Vision", desc: "Point your camera at anything and get instant AI analysis. Identify objects, read text, solve problems visually.", color: "cyan" },
    { icon: <Zap className="h-6 w-6" />, title: "Ultra-Fast Responses", desc: "Get answers in under a second with our optimized AI pipeline. No waiting, no lag, just instant intelligence.", color: "yellow" },
    { icon: <Search className="h-6 w-6" />, title: "Deep Research Mode", desc: "Research tier gives you Gemini 2.5 Pro for comprehensive, in-depth analysis with extended responses.", color: "indigo" },
    { icon: <Palette className="h-6 w-6" />, title: "Dark & Light Themes", desc: "Switch between dark and light themes instantly. Your preference is saved and remembered across sessions.", color: "rose" },
    { icon: <Shield className="h-6 w-6" />, title: "Privacy & Security", desc: "Your conversations stay private. Secure authentication, encrypted data, and no data selling. Ever.", color: "emerald" },
    { icon: <QrCode className="h-6 w-6" />, title: "Mobile Ready", desc: "Works perfectly on any device. Scan a QR code to instantly open TurboAnswer on your phone or tablet.", color: "violet" },
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

  const colorMap: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    green: "from-green-500/20 to-green-600/5 border-green-500/20 text-green-400",
    pink: "from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400",
    orange: "from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400",
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
    yellow: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/20 text-yellow-400",
    indigo: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
    rose: "from-rose-500/20 to-rose-600/5 border-rose-500/20 text-rose-400",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    violet: "from-violet-500/20 to-violet-600/5 border-violet-500/20 text-violet-400",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400",
  };

  return (
    <div className={`min-h-screen overflow-x-hidden ${isDark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md ${isDark ? 'bg-black/80 border-gray-800' : 'bg-white/80 border-gray-200'} border-b`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TurboLogo size={32} animated={false} />
            <span className="text-lg sm:text-xl font-bold tracking-tight">Turbo Answer</span>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <a href="#features" className={`text-sm px-3 py-1.5 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Features</a>
            <a href="#pricing" className={`text-sm px-3 py-1.5 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Pricing</a>
            <a href="#mobile" className={`text-sm px-3 py-1.5 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Mobile</a>
            <button onClick={toggleTheme} className={`p-2 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              {isDark ? <span className="text-lg">&#9728;</span> : <span className="text-lg">&#9790;</span>}
            </button>
            <a href="/login">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold px-5">
                Login / Sign Up
              </Button>
            </a>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <button onClick={toggleTheme} className={`p-2 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
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
          <div className={`sm:hidden border-t px-4 py-4 space-y-2 ${isDark ? 'border-gray-800 bg-black/95' : 'border-gray-200 bg-white/95'}`}>
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
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold">
                Login / Sign Up
              </Button>
            </a>
          </div>
        )}
      </nav>

      <section className="pt-28 sm:pt-40 pb-16 sm:pb-24 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="flex justify-center mb-6">
            <TurboLogo size={80} animated={true} />
          </div>

          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6 ${isDark ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-blue-50 border border-blue-200 text-blue-600'}`}>
            <Sparkles className="h-4 w-4" />
            <span>Powered by Gemini AI</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            Your AI That<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Thinks, Creates & Analyzes
            </span>
          </h1>

          <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Chat naturally. Analyze documents. Generate images. 100+ languages. 
            All in one powerful AI assistant that works on any device.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <a href="/login">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-10 py-6 font-semibold shadow-lg shadow-blue-500/25">
                Login / Sign Up Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </a>
            <Button size="lg" variant="outline" className={`w-full sm:w-auto text-lg px-8 py-6 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`} onClick={() => setShowQR(true)}>
              <QrCode className="h-5 w-5 mr-2" />
              Open on Phone
            </Button>
          </div>

          <div className={`flex flex-wrap items-center justify-center gap-6 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-green-400" /> Free forever
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-green-400" /> No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-green-400" /> Works on mobile
            </span>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">TurboAnswer</span>
              {" "}Can Do
            </h2>
            <p className={`text-lg max-w-xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              One AI assistant packed with powerful features for every need
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f, i) => (
              <div key={i} className={`rounded-2xl p-5 border bg-gradient-to-b ${colorMap[f.color]} ${isDark ? '' : 'bg-opacity-50'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                  {f.icon}
                </div>
                <h3 className={`text-lg font-semibold mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`py-16 sm:py-24 px-4 ${isDark ? 'bg-gradient-to-b from-black via-blue-950/10 to-black' : 'bg-gradient-to-b from-white via-blue-50/50 to-white'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Expert Knowledge in{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Every Field</span>
            </h2>
            <p className={`text-lg max-w-xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              TurboAnswer provides professional-level answers across all major domains
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {knowledgeDomains.map((d, i) => (
              <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${isDark ? 'bg-gray-900/50 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <span className="text-blue-400">{d.icon}</span>
                <span className="text-sm font-medium">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Pricing</span>
            </h2>
            <p className={`text-lg max-w-xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Start free, upgrade when you need more power
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className={`rounded-2xl p-6 border ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
              <div className="mb-4">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Free</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">$0</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/month</span>
                </div>
              </div>
              <div className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Gemini 2.5 Flash</div>
              <ul className="space-y-2.5 mb-6">
                {["AI chat conversations", "Document analysis", "100+ languages", "Dark & light themes", "Mobile access"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/login">
                <Button variant="outline" className={`w-full ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}>
                  Get Started Free
                </Button>
              </a>
            </div>

            <div className={`rounded-2xl p-6 border-2 border-purple-500/50 relative ${isDark ? 'bg-purple-950/20' : 'bg-purple-50/50'}`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-semibold text-white">
                POPULAR
              </div>
              <div className="mb-4">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Crown className="h-5 w-5 text-purple-400" /> Pro
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">$6.99</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/month</span>
                </div>
              </div>
              <div className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Gemini Pro</div>
              <ul className="space-y-2.5 mb-6">
                {["Everything in Free", "Gemini Pro model", "Faster responses", "Priority processing", "AI image generation", "Advanced analysis"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Check className="h-4 w-4 text-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/login">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold">
                  Upgrade to Pro
                </Button>
              </a>
            </div>

            <div className={`rounded-2xl p-6 border-2 border-blue-500/50 ${isDark ? 'bg-blue-950/20' : 'bg-blue-50/50'}`}>
              <div className="mb-4">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Brain className="h-5 w-5 text-blue-400" /> Research
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">$15</span>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/month</span>
                </div>
              </div>
              <div className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Gemini 2.5 Pro</div>
              <ul className="space-y-2.5 mb-6">
                {["Everything in Pro", "Gemini 2.5 Pro model", "Deep research analysis", "Extended responses", "Comprehensive coverage", "Top-tier intelligence"].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/login">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-semibold">
                  Upgrade to Research
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={`py-16 sm:py-24 px-4 ${isDark ? 'bg-gradient-to-b from-black via-purple-950/10 to-black' : 'bg-gradient-to-b from-white via-purple-50/30 to-white'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It{" "}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Works</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Sign Up Free", desc: "Create your account in seconds with one click. No credit card required.", icon: <Lock className="h-6 w-6" /> },
              { step: "2", title: "Ask Anything", desc: "Type or speak your question. Upload documents. Generate images. The AI handles it all.", icon: <MessageSquare className="h-6 w-6" /> },
              { step: "3", title: "Get Smart Answers", desc: "Receive instant, accurate, and comprehensive responses powered by the best AI models.", icon: <Sparkles className="h-6 w-6" /> },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400' : 'bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600'}`}>
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-blue-400 mb-2">STEP {item.step}</div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="mobile" className="py-16 sm:py-24 px-4">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Take It{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Everywhere</span>
          </h2>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Scan the QR code with your phone camera to instantly access Turbo Answer on any mobile device.
          </p>
          
          {!showQR ? (
            <Button
              onClick={() => setShowQR(true)}
              size="lg"
              variant="outline"
              className={`gap-2 px-8 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <QrCode className="h-5 w-5" />
              Show QR Code
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="bg-white p-5 rounded-2xl shadow-2xl shadow-purple-500/10">
                <QRCodeSVG
                  value={appUrl}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className={`text-xs break-all max-w-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{appUrl}</p>
              <Button onClick={() => setShowQR(false)} variant="ghost" size="sm" className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                Hide QR Code
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className={`rounded-3xl p-8 sm:p-12 border ${isDark ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/10' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200/50'}`}>
            <TurboLogo size={60} animated={false} />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 mt-4">
              Ready to Get Started?
            </h2>
            <p className={`text-lg mb-8 max-w-xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Join thousands using TurboAnswer to work smarter, learn faster, and create more. It's completely free to start.
            </p>
            <a href="/login">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-10 py-6 font-semibold shadow-lg shadow-blue-500/25">
                Login / Sign Up Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-3xl p-8 sm:p-12 border ${isDark ? 'bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/80 border-gray-700/50' : 'bg-gradient-to-br from-white via-gray-50 to-white border-gray-200'}`}>
            <div className="text-center mb-8">
              <span className={`inline-block text-sm font-semibold tracking-widest uppercase mb-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Our Story</span>
              <h2 className={`text-3xl sm:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Built Through the Hate
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-4 rounded-full"></div>
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
              <p className={`font-semibold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
      </section>

      <TrustpilotWidget isDark={isDark} />

      <footer className={`border-t py-8 px-4 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
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
