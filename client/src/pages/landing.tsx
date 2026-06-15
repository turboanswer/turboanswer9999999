import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  ArrowRight, ShieldCheck, Zap, Layers, Lock, Cpu, Globe2, 
  Activity, FileText, CheckCircle2, Network, Server, 
  Database, GitBranch
} from "lucide-react";
import turboLogo from "@/assets/turboanswer-logo.png";

// A self-contained, premium dark theme palette applied via wrapper div
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-[#EDEDED] font-sans selection:bg-[#4A47F6]/30 selection:text-white pb-0">
      {/* Navigation */}
      <nav 
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b ${
          scrolled ? "bg-[#050505]/80 backdrop-blur-md border-[#1A1A1A]" : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={turboLogo} alt="TurboAnswer" className="h-6 w-auto brightness-0 invert opacity-90" />
            <span className="font-semibold text-[15px] tracking-tight text-[#EDEDED]">TurboAnswer</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-[#A1A1AA] hover:text-white transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="h-8 px-4 inline-flex items-center justify-center rounded bg-[#EDEDED] text-[#050505] text-sm font-medium hover:bg-white transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 md:pt-52 md:pb-32 px-6 overflow-hidden flex flex-col items-center text-center">
        {/* Subtle top glow */}
        <div className="absolute top-[-20%] inset-x-0 h-[600px] w-full max-w-4xl mx-auto bg-gradient-to-b from-[#4A47F6]/10 to-transparent blur-[120px] pointer-events-none rounded-full" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111111]/50 border border-[#222]/80 text-[#A1A1AA] text-xs font-medium mb-8 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4A47F6] animate-pulse" />
          Powered by Azure AI & Frontier Models
        </div>
        
        <h1 className="max-w-5xl text-5xl md:text-7xl lg:text-8xl font-display font-medium tracking-tight text-white mb-6 leading-[1.05]">
          Answers at the speed of thought. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#886DF2] to-[#4A47F6]">
            Verified and cited.
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg md:text-xl text-[#A1A1AA] mb-10 leading-relaxed font-light">
          A premium AI assistant for professionals. Intelligent multi-model routing across Claude, Gemini, and more, delivering ultra-fast, trustworthy insights without the hallucinations.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link href="/register" className="h-12 px-8 inline-flex items-center justify-center gap-2 rounded bg-white text-black text-[15px] font-medium hover:bg-gray-100 transition-colors w-full sm:w-auto">
            Get started — free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#architecture" className="h-12 px-8 inline-flex items-center justify-center rounded bg-[#111111] border border-[#333] text-white text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors w-full sm:w-auto">
            Explore architecture
          </a>
        </div>
      </section>

      {/* Trust bar */}
      <section className="py-12 border-t border-[#111111] bg-[#020202]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-[#666] font-semibold mb-8">Trusted by research and engineering teams</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale">
             {/* Abstract geometry representing logos */}
             <div className="h-6 flex items-center font-display font-bold text-xl tracking-tighter">VERTEX</div>
             <div className="h-6 flex items-center font-sans font-bold text-xl tracking-tight">NEXUS</div>
             <div className="h-6 flex items-center font-mono font-bold text-xl tracking-widest">QUANTUM</div>
             <div className="h-6 flex items-center font-display font-semibold text-xl tracking-tight">LUMINA</div>
             <div className="h-6 flex items-center font-sans font-black text-xl tracking-tighter">AURA</div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-24 md:py-32 px-6 border-t border-[#111111] bg-[#000000]" id="capabilities">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tight text-white mb-4">
              Intelligence without compromise.
            </h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl">
              Engineered for precision, speed, and absolute reliability. We stripped away the gimmicks to focus on what professionals actually need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Feature - Speed */}
            <div className="md:col-span-2 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4A47F6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-white mb-6">
                  <Zap className="h-6 w-6 text-[#886DF2]" />
                </div>
                <h3 className="text-2xl font-medium text-white mb-3">Ultra-Fast Inference</h3>
                <p className="text-[#A1A1AA] leading-relaxed max-w-md">
                  Deployed on enterprise-grade Azure infrastructure. Optimized for minimal latency and sub-300ms time-to-first-token for critical workflows. No waiting in shared queues.
                </p>
              </div>
              
              <div className="mt-12 flex items-center gap-6 text-xs font-mono text-[#666] relative z-10 border-t border-[#1A1A1A] pt-6">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]"/> East US</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]"/> West EU</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]"/> Japan East</div>
              </div>
            </div>

            {/* Feature - Verified */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] p-8 md:p-12 flex flex-col justify-between hover:border-[#333] transition-colors">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-white mb-6">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">Verified & Cited</h3>
                <p className="text-[#A1A1AA] leading-relaxed">
                  We cross-reference outputs against authoritative sources. Every factual claim is backed by traceable citations to prevent hallucinations.
                </p>
              </div>
            </div>

            {/* Feature - Multi-model */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] p-8 md:p-12 flex flex-col justify-between hover:border-[#333] transition-colors">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-white mb-6">
                  <Network className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">Multi-Model Routing</h3>
                <p className="text-[#A1A1AA] leading-relaxed">
                  Dynamic dispatch between Claude 3.5, Gemini 1.5 Pro, and others. The optimal intelligence engine is selected per-query.
                </p>
              </div>
            </div>

            {/* Feature - Security */}
            <div className="md:col-span-2 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center justify-between hover:border-[#333] transition-colors">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-white mb-6">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-medium text-white mb-3">Enterprise Security</h3>
                <p className="text-[#A1A1AA] leading-relaxed">
                  SOC2 compliant architecture. Zero data retention policies available. Your prompts are never used to train our models, period. Designed for healthcare, legal, and finance.
                </p>
              </div>
              <div className="w-full md:w-auto grid grid-cols-2 gap-4 shrink-0">
                <div className="p-5 rounded-lg border border-[#222] bg-[#111] text-center w-full md:w-32">
                  <div className="text-white font-medium mb-1 text-lg">Zero</div>
                  <div className="text-[#666] text-xs uppercase tracking-wider">Data Training</div>
                </div>
                <div className="p-5 rounded-lg border border-[#222] bg-[#111] text-center w-full md:w-32">
                  <div className="text-white font-medium mb-1 text-lg">E2E</div>
                  <div className="text-[#666] text-xs uppercase tracking-wider">Encryption</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Deep Dive / Architecture */}
      <section className="py-24 md:py-32 px-6 bg-[#020202] border-t border-[#111111]" id="architecture">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center">
            <div className="order-2 lg:order-1 relative rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden shadow-2xl">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#4A47F6]/40 to-transparent" />
              <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between bg-[#050505]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                </div>
                <div className="text-xs text-[#666] font-mono">system_architecture.diagram</div>
              </div>
              <div className="p-8 md:p-12 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-[#111] border border-[#222] flex items-center justify-center shrink-0">
                    <Globe2 className="h-5 w-5 text-[#666]" />
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#222] to-[#4A47F6]/30 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#4A47F6] shadow-[0_0_8px_rgba(74,71,246,0.6)]" />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pl-14">
                  <div className="w-10 h-10 rounded bg-[#111] border border-[#4A47F6]/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(74,71,246,0.1)]">
                    <GitBranch className="h-5 w-5 text-[#886DF2]" />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="text-xs font-mono text-[#886DF2]">ROUTER</div>
                    <div className="h-px bg-[#222] w-full" />
                  </div>
                </div>
                
                <div className="flex flex-col gap-4 pl-28">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-[#111] border border-[#222] flex items-center justify-center shrink-0">
                      <Cpu className="h-5 w-5 text-[#EDEDED]" />
                    </div>
                    <div className="text-sm font-medium text-[#EDEDED]">Claude 3.5 Sonnet</div>
                  </div>
                  <div className="flex items-center gap-4 opacity-40">
                    <div className="w-10 h-10 rounded bg-[#111] border border-[#222] flex items-center justify-center shrink-0">
                      <Cpu className="h-5 w-5 text-[#EDEDED]" />
                    </div>
                    <div className="text-sm font-medium text-[#EDEDED]">Gemini 1.5 Pro</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pl-14 mt-4">
                  <div className="w-10 h-10 rounded bg-[#111] border border-green-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-xs font-mono text-green-500">FACT-CHECK CHAIN</div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tight text-white mb-6">
                Built for the highest standard of work.
              </h2>
              <p className="text-[#A1A1AA] text-lg mb-8 leading-relaxed font-light">
                When you're writing production code, drafting legal documents, or conducting market research, you can't afford hallucinations or downtime.
              </p>
              
              <ul className="space-y-8">
                {[
                  { icon: FileText, title: "Document intelligence", desc: "Ingest dense PDFs, codebase repositories, and lengthy contracts with semantic search capabilities." },
                  { icon: Activity, title: "Deterministic execution", desc: "Advanced temperature control and context window management for reliable, repeatable complex tasks." },
                  { icon: Server, title: "Provisioned throughput", desc: "We purchase dedicated compute units so your API calls never get throttled during peak hours." }
                ].map((item, i) => (
                  <li key={i} className="flex gap-5">
                    <div className="mt-1 w-10 h-10 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center text-white shrink-0">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-white">{item.title}</h4>
                      <p className="text-[15px] text-[#A1A1AA] mt-2 leading-relaxed">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Restrained Metrics */}
      <section className="py-24 px-6 border-y border-[#111111] bg-[#000000]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-display text-white mb-3">~150<span className="text-[#444] font-sans text-3xl">ms</span></div>
              <div className="text-[15px] font-medium text-[#A1A1AA]">Time to First Token</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-display text-white mb-3">99.9<span className="text-[#444] font-sans text-3xl">%</span></div>
              <div className="text-[15px] font-medium text-[#A1A1AA]">Uptime SLA</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-display text-white mb-3">2<span className="text-[#444] font-sans text-3xl">M+</span></div>
              <div className="text-[15px] font-medium text-[#A1A1AA]">Context Window</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-display text-white mb-3">10</div>
              <div className="text-[15px] font-medium text-[#A1A1AA]">Global Azure Regions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 md:py-32 px-6 bg-[#020202]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tight text-white mb-4">
              Clear, transparent pricing.
            </h2>
            <p className="text-[#A1A1AA] text-xl font-light">Scales seamlessly with your ambition.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 md:gap-8">
            {[
              { name: "Free", price: "$0", desc: "For individuals", features: ["Base models", "Standard speed", "50 queries/day", "Community support"] },
              { name: "Pro", price: "$20", desc: "For professionals", features: ["Frontier models", "Priority routing", "Unlimited queries", "Email support"], featured: true },
              { name: "Research", price: "$49", desc: "For academics", features: ["Extended context", "Citation enforcement", "Data export API", "Priority support"] },
              { name: "Enterprise", price: "Custom", desc: "For teams", features: ["SSO & SAML", "Zero data retention", "Dedicated compute", "24/7 SLA"] }
            ].map((plan, i) => (
              <div key={i} className={`rounded-2xl p-8 md:p-10 flex flex-col ${plan.featured ? "bg-[#0A0A0A] border border-[#333] shadow-[0_0_40px_rgba(74,71,246,0.08)] relative transform md:-translate-y-2" : "bg-transparent border border-[#222]"}`}>
                {plan.featured && (
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#886DF2] to-transparent rounded-t-2xl" />
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-medium text-white mb-2">{plan.name}</h3>
                  <div className="text-[15px] text-[#888] mb-6">{plan.desc}</div>
                  <div className="text-4xl md:text-5xl font-display font-medium text-white tracking-tight">{plan.price}</div>
                  {plan.price !== "Custom" && <div className="text-sm text-[#666] mt-2">per month</div>}
                </div>
                
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-[15px] text-[#A1A1AA]">
                      <CheckCircle2 className={`h-5 w-5 ${plan.featured ? "text-[#886DF2]" : "text-[#555]"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                
                <Link href={plan.name === "Enterprise" ? "mailto:sales@turboanswer.com" : "/register"} className={`h-12 w-full inline-flex items-center justify-center rounded text-[15px] font-medium transition-colors ${
                  plan.featured 
                    ? "bg-white text-black hover:bg-gray-200" 
                    : "bg-[#111] text-white border border-[#333] hover:bg-[#1A1A1A]"
                }`}>
                  {plan.name === "Enterprise" ? "Contact sales" : "Get started"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-[#000000] border-t border-[#111111] relative overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-[#4A47F6]/10 blur-[150px] pointer-events-none rounded-full" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-6xl font-display font-medium text-white mb-6 tracking-tight">Ready to move faster?</h2>
          <p className="text-xl text-[#A1A1AA] mb-10 font-light">Join the professionals who trust TurboAnswer for critical insights.</p>
          <Link href="/register" className="h-14 px-10 inline-flex items-center justify-center gap-3 rounded bg-white text-black text-lg font-medium hover:bg-gray-100 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            Start your free trial
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-16 pb-12 px-6 border-t border-[#111111] bg-[#020202]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={turboLogo} alt="TurboAnswer" className="h-6 w-auto brightness-0 invert opacity-40" />
            <span className="font-medium text-[15px] tracking-tight text-[#666]">TurboAnswer</span>
          </div>
          <div className="flex gap-8 text-[15px] text-[#666]">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms-conditions" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/support" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
