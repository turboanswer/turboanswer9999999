import { Link } from "wouter";
import {
  ArrowLeft,
  PhoneCall,
  Headphones,
  Clock,
  Award,
  ShieldCheck,
  Star,
  Heart,
  Zap,
  CheckCircle,
  Mail,
  MessageSquare,
} from "lucide-react";

const PHONE_DISPLAY = "(866) 320-6042";
const PHONE_TEL = "+18663206042";
const SUPPORT_EMAIL = "support@turboanswer.it.com";

const PILLARS = [
  {
    icon: <Clock className="h-6 w-6" />,
    title: "24/7, every single day",
    body: "Day or night, weekend or holiday — a real person is ready. No queues that close at 5pm, no “we’ll get back to you Monday.”",
  },
  {
    icon: <Headphones className="h-6 w-6" />,
    title: "Real humans, not runarounds",
    body: "You talk to people who can actually fix things. No endless transfers, no scripts read at you, no dead ends.",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Fast answers",
    body: "Most calls are answered in under a minute and most issues are solved on the first contact. We respect your time.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: "We own the outcome",
    body: "If something’s wrong, we don’t hand you off — we stay with it until it’s resolved. That’s the standard, not the exception.",
  },
];

const STATS = [
  { value: "24/7", label: "Always available" },
  { value: "< 60s", label: "Average answer time" },
  { value: "98%", label: "Customer satisfaction" },
  { value: "#1", label: "Award-winning support" },
];

export default function CustomerSupport() {
  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-pink-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14">
        {/* Back */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        {/* Hero */}
        <section className="text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-300">
            <Award className="h-3.5 w-3.5" /> Award-winning customer support
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            We don’t mess around with{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              customer service.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-400 sm:text-lg">
            Real people, around the clock, who actually solve your problem. When you need us, we pick up —
            day, night, weekend, or holiday. That’s a promise, not a slogan.
          </p>

          {/* Phone card */}
          <div className="mx-auto mt-9 max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <div className="mb-3 flex items-center justify-center gap-2 text-xs font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live now — agents standing by
            </div>
            <p className="text-sm text-zinc-400">Call us any time</p>
            <a
              href={`tel:${PHONE_TEL}`}
              className="mt-1 block bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl"
              data-testid="link-support-phone"
            >
              {PHONE_DISPLAY}
            </a>
            <a
              href={`tel:${PHONE_TEL}`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02]"
              data-testid="button-call-now"
            >
              <PhoneCall className="h-5 w-5" /> Call now — 24/7
            </a>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center backdrop-blur"
            >
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Pillars */}
        <section className="mt-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Support that actually supports you</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-400">
            We built our support team around one rule: never leave a customer stuck.
          </p>
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-colors hover:border-white/20"
              >
                <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-purple-600/30 to-cyan-600/20 p-3 text-purple-200">
                  {p.icon}
                </div>
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Award strip */}
        <section className="mt-16 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="inline-flex shrink-0 rounded-2xl bg-amber-500/15 p-4 text-amber-300">
              <Award className="h-8 w-8" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-center gap-1 sm:justify-start">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h3 className="text-xl font-bold">Recognized for service that goes the extra mile</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Our customers consistently rate us best-in-class for responsiveness, friendliness, and getting
                it right the first time.
              </p>
            </div>
          </div>
        </section>

        {/* Promise */}
        <section className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-400" />
            <h2 className="text-xl font-bold">Our customer service promise</h2>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "A real human answers — 24 hours a day, 7 days a week.",
              "We never leave you on hold-forever or in an endless loop.",
              "We solve your issue or we escalate it ourselves and follow up.",
              "Friendly, patient, and straight with you — always.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-zinc-300">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {line}
              </li>
            ))}
          </ul>
        </section>

        {/* Contact CTA */}
        <section className="mt-16 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Need help right now?</h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-400">
            Pick whatever’s easiest — we’re here either way.
          </p>
          <div className="mx-auto mt-7 flex max-w-2xl flex-col items-stretch justify-center gap-3 sm:flex-row">
            <a
              href={`tel:${PHONE_TEL}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3.5 font-semibold text-white transition-transform hover:scale-[1.02]"
              data-testid="button-call-cta"
            >
              <PhoneCall className="h-5 w-5" /> {PHONE_DISPLAY}
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/[0.07]"
              data-testid="button-email-cta"
            >
              <Mail className="h-5 w-5" /> Email us
            </a>
            <Link
              href="/support"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/[0.07]"
            >
              <MessageSquare className="h-5 w-5" /> Open a ticket
            </Link>
          </div>
          <p className="mt-6 text-xs text-zinc-600">
            TurboAnswer Inc. · {SUPPORT_EMAIL} · {PHONE_DISPLAY} · Available 24/7
          </p>
        </section>
      </div>
    </div>
  );
}
