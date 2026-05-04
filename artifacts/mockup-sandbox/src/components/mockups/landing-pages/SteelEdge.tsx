import React from 'react';
import './SteelEdge.css';

export function SteelEdge() {
  return (
    <div className="steel-edge-root relative flex flex-col">
      <div className="grain-overlay" />
      
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 md:p-12 animate-fade-up border-b border-white/5">
        <div className="flex items-baseline gap-4">
          <span className="steel-heading text-xl md:text-2xl font-bold tracking-tighter">TurboAnswer</span>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest hidden md:inline-block border-l border-white/10 pl-4">
            Powered by Matrix AI
          </span>
        </div>
        <button className="uppercase text-xs tracking-widest font-bold border border-white/20 px-6 py-3 hover:bg-white hover:text-black transition-colors duration-300 cut-corner">
          Start Free
        </button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col justify-center px-6 md:px-12 pt-20 pb-32">
        <div className="max-w-7xl">
          <h1 className="steel-heading text-6xl md:text-[8rem] lg:text-[10rem] font-bold text-[var(--text-main)] mb-8 animate-fade-up delay-100 mix-blend-difference relative z-10">
            No bluffs.<br />
            <span className="text-[var(--text-muted)]">Just</span><br />
            receipts.
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-24 animate-fade-up delay-200">
            <div className="flex flex-col justify-end">
              <p className="text-lg md:text-xl text-[var(--text-muted)] max-w-md leading-relaxed mb-12">
                Stop accepting confident guesses. TurboAnswer delivers verified, cited intelligence engineered for truth.
              </p>
              <div className="flex items-center gap-6">
                <button className="bg-white text-black font-bold uppercase tracking-widest text-sm px-8 py-4 hover:bg-[var(--accent)] transition-colors duration-300 cut-corner">
                  Deploy Now
                </button>
                <div className="h-px bg-white/20 w-24"></div>
                <span className="text-[var(--accent)] text-xs uppercase tracking-widest font-bold">V 3.0.4</span>
              </div>
            </div>

            <div className="relative aspect-video md:aspect-[4/3] brushed-panel p-1 cut-corner group overflow-hidden">
               {/* Image backing for texture */}
               <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay transition-transform duration-700 group-hover:scale-105" style={{backgroundImage: 'url(/__mockup/images/steel-texture.png)'}}></div>
               
               <div className="relative h-full w-full bg-[#0a0a0a] flex flex-col p-6 md:p-8 cut-corner">
                 <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                   <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Stack Trace Surgeon</span>
                   <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                 </div>
                 <div className="flex-1 font-mono text-xs md:text-sm text-[var(--text-muted)] flex flex-col justify-end">
                   <div className="mb-2"><span className="text-red-400">Error:</span> TypeError: Cannot read properties of undefined (reading 'map')</div>
                   <div className="mb-6"><span className="text-white/30">&gt;</span> Matrix AI isolating root cause...</div>
                   
                   <div className="bg-white/5 p-4 border-l-2 border-[var(--accent)]">
                     <span className="text-[var(--accent)] mb-2 block">Verified Fix Found:</span>
                     <span className="text-white">Pull Request #402 generated.</span>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 p-6 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-center text-xs text-[var(--text-muted)] uppercase tracking-widest">
        <div>Matrix AI Engine</div>
        <div className="flex gap-8 mt-4 md:mt-0">
          <span>Free</span>
          <span>Pro</span>
          <span>Research</span>
          <span>Enterprise</span>
        </div>
      </footer>
    </div>
  );
}
