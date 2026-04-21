import { Link } from "wouter";
import { Zap, Shield, Users, Check, ArrowRight, Clock, DollarSign, Lock, Infinity as InfinityIcon, ChevronRight, Building2, Rocket, XCircle } from "lucide-react";
import TurboLogo from "@/components/TurboLogo";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";

export default function Enterprise() {
  const { theme } = useTheme();
  const D = theme === "dark";
  const { isAuthenticated } = useAuth();
  const ctaHref = isAuthenticated ? "/subscribe?plan=enterprise" : "/register?plan=enterprise";

  const bg = D ? "#000" : "#fff";
  const text = D ? "#fff" : "#111";
  const muted = D ? "#a1a1aa" : "#52525b";
  const dim = D ? "#71717a" : "#71717a";
  const cardBg = D ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const border = D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const accent = "#10b981";
  const accentGlow = "rgba(16,185,129,0.15)";

  const valueProps = [
    { icon: <Clock className="w-5 h-5" />, title: "Deployed in 10 minutes, not 10 weeks", desc: "SSO, user provisioning, admin controls — all ready out of the box. No IT project required." },
    { icon: <Check className="w-5 h-5" />, title: "Every answer comes with sources", desc: "Your team stops guessing and starts citing. Matrix AI verifies and grades every response in real time." },
    { icon: <InfinityIcon className="w-5 h-5" />, title: "Unlimited seats. Unlimited questions.", desc: "No per-seat tax. No usage caps. No surprise overages when your team grows." },
    { icon: <Lock className="w-5 h-5" />, title: "Your data stays yours", desc: "Never used to train models. Never shared. Never sold. SSO, audit logs, and admin controls included." },
    { icon: <Rocket className="w-5 h-5" />, title: "Works on day one", desc: "No custom integrations. No consultants. No onboarding fees. Your team just logs in and starts asking." },
    { icon: <DollarSign className="w-5 h-5" />, title: "Priced for real businesses", desc: "Straightforward monthly pricing. Cancel anytime. No Fortune-500 contracts or six-figure minimums." },
  ];

  const objections = [
    {
      q: "We already have ChatGPT Teams.",
      a: "TurboAnswer verifies and cites every answer — ChatGPT doesn't. Your team stops guessing and starts knowing. Plus, flat pricing means no per-seat creep when you hire."
    },
    {
      q: "We need enterprise-grade security.",
      a: "Your data is never trained on, never shared, never retained beyond your account. SSO, admin controls, and audit logs are included. No security review team required — it's already locked down."
    },
    {
      q: "We need to integrate it into our workflow.",
      a: "Nothing to integrate. Your team just logs in on web, mobile, or desktop and uses it. No APIs to wire up, no consultants, no pilot program."
    },
    {
      q: "Is it really only 10 minutes?",
      a: "Sign up. Add SSO (optional). Invite your team. Done. The slowest part is typing in email addresses."
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: bg, color: text }}>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl" style={{ background: D ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)", borderColor: border }}>
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <TurboLogo size={28} animated={false} />
              <span className="text-base font-bold tracking-tight">TurboAnswer</span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: accentGlow, color: accent, border: `1px solid ${accent}40` }}>
                Enterprise
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden sm:block text-sm transition-colors" style={{ color: muted }}>Pricing</Link>
            <Link href={ctaHref}>
              <button className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105" style={{ background: accent, color: "#000" }}>
                Start Trial
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 px-5 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`, filter: "blur(60px)" }} />
        <div className="max-w-5xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: accentGlow, color: accent, border: `1px solid ${accent}40` }}>
            <Building2 className="w-3.5 h-3.5" />
            For Business — TurboAnswer Enterprise
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
            AI built for<br />
            <span style={{ background: `linear-gradient(135deg, ${accent}, #34d399)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>busy businesses.</span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl leading-relaxed" style={{ color: muted }}>
            Give your whole company instant, verified AI answers — without the 6-month rollout, the $60-per-seat pricing, or the IT project. Whether you're a 5-person team or a 5,000-person company, TurboAnswer Enterprise deploys in under 10 minutes and just works.
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <Link href={ctaHref}>
              <button className="group px-7 py-4 rounded-xl font-bold text-base flex items-center gap-2 transition-all hover:scale-105" style={{ background: accent, color: "#000", boxShadow: `0 10px 40px ${accentGlow}` }}>
                Start Enterprise Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/pricing">
              <button className="px-7 py-4 rounded-xl font-semibold text-base border transition-all hover:scale-105" style={{ borderColor: border, color: text, background: "transparent" }}>
                See Pricing
              </button>
            </Link>
            <div className="text-sm flex items-center gap-2" style={{ color: dim }}>
              <Check className="w-4 h-4" style={{ color: accent }} /> No demo required &nbsp;
              <Check className="w-4 h-4" style={{ color: accent }} /> No sales call
            </div>
          </div>
        </div>
      </section>

      {/* STAT STRIP */}
      <section className="px-5 py-10 border-y" style={{ borderColor: border, background: cardBg }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-bold" style={{ color: accent }}>10 min</div>
            <div className="text-xs mt-1 uppercase tracking-widest" style={{ color: dim }}>Setup time</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold" style={{ color: accent }}>99.2%</div>
            <div className="text-xs mt-1 uppercase tracking-widest" style={{ color: dim }}>Answer accuracy</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold" style={{ color: accent }}>∞</div>
            <div className="text-xs mt-1 uppercase tracking-widest" style={{ color: dim }}>Seats included</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold" style={{ color: accent }}>$0</div>
            <div className="text-xs mt-1 uppercase tracking-widest" style={{ color: dim }}>Setup fees</div>
          </div>
        </div>
      </section>

      {/* THE PITCH */}
      <section className="px-5 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight">
            Your team is drowning in questions.
          </h2>
          <div className="text-lg leading-relaxed space-y-5" style={{ color: muted }}>
            <p>
              Your sales reps need fast market intel. Your support staff needs instant answers. Your managers need summaries, drafts, and research — yesterday.
            </p>
            <p>
              Right now they're either Googling, asking ChatGPT (and risking leaking your data), or waiting on someone else.
            </p>
            <p className="text-xl font-semibold" style={{ color: text }}>
              TurboAnswer Enterprise fixes all of that in one afternoon.
            </p>
            <p>
              If your team is spending even <span style={{ color: accent, fontWeight: 600 }}>one hour a week</span> searching for information, TurboAnswer Enterprise pays for itself in the first week.
            </p>
          </div>
        </div>
      </section>

      {/* VALUE PROPS GRID */}
      <section className="px-5 py-20" style={{ background: cardBg }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Built for businesses that need answers now.</h2>
            <p className="text-lg" style={{ color: muted }}>No bloat. No six-month rollouts. No enterprise BS.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {valueProps.map((v, i) => (
              <div key={i} className="p-6 rounded-2xl border transition-all hover:scale-[1.02]" style={{ background: bg, borderColor: border }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: accentGlow, color: accent }}>
                  {v.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: muted }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="px-5 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-14 text-center">Stop overpaying for enterprise AI.</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-2xl border" style={{ borderColor: border, background: cardBg }}>
              <div className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: dim }}>The old way</div>
              <ul className="space-y-3 text-sm">
                {[
                  "6-month enterprise rollout",
                  "$60+ per seat, per month",
                  "Annual contracts, no escape",
                  "Data used to train models",
                  "Consultants required for setup",
                  "Usage caps and overage charges",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2" style={{ color: muted }}>
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 rounded-2xl border relative overflow-hidden" style={{ borderColor: `${accent}60`, background: accentGlow, boxShadow: `0 20px 60px ${accentGlow}` }}>
              <div className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: accent }}>TurboAnswer Enterprise</div>
              <ul className="space-y-3 text-sm">
                {[
                  "Deployed in 10 minutes",
                  "Flat monthly rate — no per-seat tax",
                  "Cancel anytime, no contracts",
                  "Your data never trains a model",
                  "Set up yourself in minutes",
                  "Unlimited questions, unlimited seats",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accent }} />
                    <span style={{ color: text }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* OBJECTIONS / FAQ */}
      <section className="px-5 py-20" style={{ background: cardBg }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-14 text-center">Questions leaders ask.</h2>
          <div className="space-y-4">
            {objections.map((o, i) => (
              <details key={i} className="group p-6 rounded-2xl border cursor-pointer transition-all" style={{ borderColor: border, background: bg }}>
                <summary className="flex items-center justify-between list-none">
                  <span className="font-semibold text-base pr-4">{o.q}</span>
                  <ChevronRight className="w-5 h-5 flex-shrink-0 transition-transform group-open:rotate-90" style={{ color: accent }} />
                </summary>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: muted }}>{o.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${accentGlow} 0%, transparent 60%)` }} />
        <div className="max-w-3xl mx-auto text-center relative">
          <Zap className="w-12 h-12 mx-auto mb-6" style={{ color: accent }} />
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Get your team set up today.
          </h2>
          <p className="text-lg mb-10" style={{ color: muted }}>
            No demo required. No sales call. Up and running before lunch.
          </p>
          <Link href={ctaHref}>
            <button className="group px-10 py-5 rounded-xl font-bold text-lg inline-flex items-center gap-3 transition-all hover:scale-105" style={{ background: accent, color: "#000", boxShadow: `0 20px 60px ${accentGlow}` }}>
              Start Enterprise Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <p className="text-xs mt-6 uppercase tracking-widest" style={{ color: dim }}>
            Cancel anytime · No setup fees · Flat monthly pricing
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-10 border-t" style={{ borderColor: border }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm" style={{ color: dim }}>
          <div className="flex items-center gap-2">
            <TurboLogo size={20} animated={false} />
            <span className="font-semibold" style={{ color: muted }}>TurboAnswer Enterprise</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/pricing" style={{ color: muted }}>Pricing</Link>
            <Link href="/support" style={{ color: muted }}>Contact</Link>
            <Link href="/privacy-policy" style={{ color: muted }}>Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
