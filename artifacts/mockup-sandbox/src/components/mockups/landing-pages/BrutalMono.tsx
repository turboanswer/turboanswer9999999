import React, { useEffect, useRef } from "react";
import "./_group.css";

export function BrutalMono() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll('.scroll-reveal');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.85) {
          el.classList.add('opacity-100', 'translate-y-0');
          el.classList.remove('opacity-0', 'translate-y-12');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    setTimeout(handleScroll, 100); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="brutal-mono-page relative w-full" ref={containerRef}>
      {/* Background Grid */}
      <div className="fixed inset-0 brutal-grid pointer-events-none z-0"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 p-6 flex justify-between items-center mix-blend-difference bg-black/50 backdrop-blur-sm border-b-2 border-white/10">
        <div className="font-display text-2xl tracking-tighter uppercase text-white flex items-center gap-3">
          <div className="w-6 h-6 bg-[#ff003c]"></div>
          TurboAnswer
        </div>
        <div className="hidden md:flex gap-8 text-sm uppercase tracking-widest font-bold">
          <a href="#" className="hover:text-[#ff003c] transition-colors">Engine: Matrix AI</a>
          <a href="#" className="hover:text-[#ff003c] transition-colors">Pro</a>
          <a href="#" className="hover:text-[#ff003c] transition-colors">Enterprise</a>
        </div>
        <button className="bg-white text-black px-6 py-2 uppercase text-sm font-bold brutal-border brutal-shadow hover:bg-[#ff003c] hover:text-white hover:border-[#ff003c]">
          Start Free
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center items-center px-4 pt-20 z-10">
        <div className="max-w-[90vw] mx-auto w-full text-center">
          <h1 className="font-display text-[15vw] md:text-[12vw] leading-none mb-12 flex flex-col items-center">
            <span className="block text-white">Ask once.</span>
            <span className="block text-[#ff003c]">Know forever.</span>
          </h1>
          
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-6 justify-center mt-16">
            <button className="bg-[#ff003c] text-white px-10 py-5 uppercase text-lg font-bold brutal-border-accent brutal-shadow w-full sm:w-auto">
              Initialize Matrix AI
            </button>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute bottom-10 left-10 text-xs uppercase tracking-widest opacity-0 animate-reveal delay-400 text-white/50">
          [ STATUS: VERIFIED ]
        </div>
        <div className="absolute bottom-10 right-10 text-xs uppercase tracking-widest opacity-0 animate-reveal delay-400 text-white/50 text-right">
          NO GUESSES. <br/>
          JUST CITED TRUTH.
        </div>
      </section>

      {/* Proof / Demo Section */}
      <section className="min-h-screen py-32 px-4 z-10 relative bg-white text-black border-t-4 border-[#ff003c]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <div className="scroll-reveal opacity-0 translate-y-12 transition-all duration-700 ease-out">
              <h2 className="font-display text-6xl md:text-8xl mb-8">
                THE STACK<br/>TRACE<br/>SURGEON
              </h2>
              <p className="text-xl md:text-2xl mb-8 leading-relaxed">
                Paste the error. Paste the repo URL. We open a PR with the fix. Verified by Matrix AI.
              </p>
              <ul className="space-y-4 font-bold uppercase tracking-widest mb-12">
                <li className="flex items-center gap-4 border-b-2 border-black pb-4">
                  <span className="text-[#ff003c] text-2xl">01</span> CITED SOURCES ONLY
                </li>
                <li className="flex items-center gap-4 border-b-2 border-black pb-4">
                  <span className="text-[#ff003c] text-2xl">02</span> CONFIDENCE RATING ATTACHED
                </li>
                <li className="flex items-center gap-4 border-b-2 border-black pb-4">
                  <span className="text-[#ff003c] text-2xl">03</span> AUTOMATIC VERIFICATION
                </li>
              </ul>
            </div>

            <div className="scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-200 ease-out">
              <div className="bg-black text-white p-1 brutal-shadow">
                <div className="border-2 border-white/20 p-8 h-[600px] flex flex-col relative">
                  <div className="flex justify-between items-center mb-8 border-b-2 border-white/20 pb-4">
                    <span className="uppercase text-xs tracking-widest text-[#ff003c]">Terminal</span>
                    <span className="uppercase text-xs tracking-widest">Active</span>
                  </div>
                  
                  <div className="flex-1 font-mono text-sm sm:text-base leading-relaxed">
                    <div className="text-white/50 mb-2">&gt; Identifying bug in src/auth.ts...</div>
                    <div className="text-[#ff003c] mb-6">Error: Null pointer exception in token validation.</div>
                    <div className="text-white/50 mb-2">&gt; Matrix AI cross-referencing...</div>
                    <div className="text-white mb-2">[VERIFIED FIX FOUND] Confidence: 99.8%</div>
                    <div className="text-white/50 mb-2">&gt; Generating PR...</div>
                    <div className="bg-white/10 p-4 border border-white/20 mt-4">
                      PR #402: Fix null pointer in auth token validation<br/>
                      <a href="#" className="text-[#ff003c] underline mt-2 inline-block">Review changes</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Manifesto / Footer */}
      <section className="py-40 px-4 bg-black text-white text-center z-10 relative">
        <h2 className="font-display text-5xl md:text-7xl mb-12 uppercase scroll-reveal opacity-0 translate-y-12 transition-all duration-700 ease-out">
          Death to Hallucinations.
        </h2>
        <div className="max-w-2xl mx-auto scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-200 ease-out">
          <p className="text-xl mb-16 text-white/70">
            TurboAnswer is for professionals who cannot afford to be wrong.
          </p>
          <button className="bg-white text-black px-12 py-6 uppercase text-xl font-bold brutal-border brutal-shadow hover:bg-[#ff003c] hover:text-white hover:border-[#ff003c] transition-colors inline-block w-full sm:w-auto">
            Start Free
          </button>
        </div>
      </section>

    </div>
  );
}
