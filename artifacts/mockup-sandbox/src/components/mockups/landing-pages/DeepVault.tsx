import React, { useEffect, useState } from 'react';
import './_deep-vault.css';
import { Shield, ChevronRight, Lock, Terminal } from 'lucide-react';

export function DeepVault() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="deep-vault-container">
      <div className="scanline" />
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-mono-display text-sm tracking-widest text-slate-300 uppercase">TurboAnswer</span>
            <span className="text-xs text-slate-600 ml-2">/ Matrix AI</span>
          </div>
          
          <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2 group">
            Access Terminal <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-6 text-center">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="space-y-4">
            <h1 className="font-mono-display text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-white glow-text fade-in-up uppercase leading-none">
              TRUTH,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-500">WEAPONIZED.</span>
            </h1>
          </div>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed fade-in-up delay-200">
            Confident guesses are liabilities. Matrix AI delivers cited, verified reality. For the ones who cannot afford to be wrong.
          </p>

          <div className="fade-in-up delay-300 pt-8">
            <button className="relative group overflow-hidden rounded-sm bg-slate-900 border border-cyan-900/50 hover:border-cyan-500/50 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="px-8 py-4 flex items-center gap-3">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <span className="font-mono-display text-sm tracking-widest text-white uppercase">Initialize Sequence</span>
              </div>
            </button>
          </div>

        </div>
      </main>

      {/* Proof Strip */}
      <section className="relative z-10 py-24 border-t border-slate-800/50 bg-slate-950/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            
            <div className="glow-box bg-slate-900/50 p-8 rounded-sm fade-in-up delay-400">
              <Shield className="w-8 h-8 text-emerald-400 mb-6" />
              <h3 className="text-white font-medium mb-3">Self-Verification Protocol</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every output runs through a secondary neural constraint checking for hallucination before display.
              </p>
            </div>

            <div className="glow-box bg-slate-900/50 p-8 rounded-sm fade-in-up delay-500">
              <Lock className="w-8 h-8 text-cyan-400 mb-6" />
              <h3 className="text-white font-medium mb-3">Stack Trace Surgeon</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Input the error. Output the pull request. We diagnose and deploy fixes straight to the repository.
              </p>
            </div>

            <div className="glow-box bg-slate-900/50 p-8 rounded-sm fade-in-up delay-500">
              <Terminal className="w-8 h-8 text-slate-400 mb-6" />
              <h3 className="text-white font-medium mb-3">Absolute Citation</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                No black boxes. Every claim is hard-linked to the source material with a transparent confidence rating.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
