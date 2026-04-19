import { Link } from "wouter";
import { ArrowLeft, Shield, Search, Home, MessageSquare } from "lucide-react";
import logoImg from "@/assets/turboanswer-logo.png";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 px-6 py-5 flex items-center justify-between border-b border-white/5">
        <Link href="/">
          <a className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home-header">
            <img src={logoImg} alt="TurboAnswer" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg">TurboAnswer</span>
          </a>
        </Link>
        <Link href="/">
          <a className="text-sm text-zinc-400 hover:text-white transition-colors" data-testid="link-back-top">
            ← Back to home
          </a>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-xl">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 border border-emerald-500/30 mb-8">
            <Shield className="w-12 h-12 text-emerald-400" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Matrix AI · Page status: missing</span>
          </div>

          <h1 className="text-7xl sm:text-8xl font-black tracking-tight mb-3 bg-gradient-to-br from-white via-white to-emerald-200 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">This page got lost in the static.</h2>
          <p className="text-zinc-400 text-base sm:text-lg mb-10 leading-relaxed">
            The page you're looking for doesn't exist, was moved, or was never here in the first place.
            Let's get you back to verified answers.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Link href="/">
              <a
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-semibold transition-colors shadow-lg shadow-emerald-500/20"
                data-testid="link-home"
              >
                <Home className="w-4 h-4" />
                Back to TurboAnswer
              </a>
            </Link>
            <Link href="/chat">
              <a
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-colors border border-white/10"
                data-testid="link-chat"
              >
                <MessageSquare className="w-4 h-4" />
                Ask the AI
              </a>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
            <Link href="/pricing">
              <a className="hover:text-white transition-colors" data-testid="link-pricing">Pricing</a>
            </Link>
            <Link href="/support">
              <a className="hover:text-white transition-colors" data-testid="link-support">Support</a>
            </Link>
            <Link href="/privacy">
              <a className="hover:text-white transition-colors" data-testid="link-privacy">Privacy</a>
            </Link>
            <Link href="/terms">
              <a className="hover:text-white transition-colors" data-testid="link-terms">Terms</a>
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-4 border-t border-white/5 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} TurboAnswer · turboanswer.it.com · Protected by Cloudflare
      </footer>
    </div>
  );
}
