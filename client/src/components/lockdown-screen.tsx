import { useEffect, useRef } from 'react';
import { AlertOctagon } from 'lucide-react';

function makeDistortionCurve(amount: number): Float32Array {
  const samples = 512;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

export default function LockdownScreen() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    stopRef.current = false;

    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    audioCtxRef.current = ctx;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // ── Master chain: distortion → compressor → master gain ──
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.92, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -6;
    compressor.knee.value = 0;
    compressor.ratio.value = 20;
    compressor.attack.value = 0.001;
    compressor.release.value = 0.05;
    compressor.connect(masterGain);

    const distortion = ctx.createWaveShaper();
    distortion.curve = makeDistortionCurve(600);
    distortion.oversample = '4x';
    distortion.connect(compressor);

    const distortionGain = ctx.createGain();
    distortionGain.gain.value = 0.6;
    distortionGain.connect(distortion);

    // ── Layer 1: Main siren sweep oscillator ──
    const siren = ctx.createOscillator();
    siren.type = 'sawtooth';
    siren.frequency.value = 440;
    const sirenGain = ctx.createGain();
    sirenGain.gain.value = 1.0;
    siren.connect(sirenGain);
    sirenGain.connect(distortionGain);
    sirenGain.connect(compressor);
    siren.start();

    // ── Layer 2: Secondary siren (slightly detuned for beating effect) ──
    const siren2 = ctx.createOscillator();
    siren2.type = 'sawtooth';
    siren2.frequency.value = 437;
    const siren2Gain = ctx.createGain();
    siren2Gain.gain.value = 0.8;
    siren2.connect(siren2Gain);
    siren2Gain.connect(distortionGain);
    siren2.start();

    // ── Layer 3: Low horror rumble ──
    const rumble = ctx.createOscillator();
    rumble.type = 'square';
    rumble.frequency.value = 55;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.5;
    rumble.connect(rumbleGain);
    rumbleGain.connect(compressor);
    rumble.start();

    // ── Layer 4: High-freq screech ──
    const screech = ctx.createOscillator();
    screech.type = 'square';
    screech.frequency.value = 2800;
    const screechGain = ctx.createGain();
    screechGain.gain.value = 0;
    screech.connect(screechGain);
    screechGain.connect(distortionGain);
    screech.start();

    // ── Layer 5: White noise via buffer ──
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseBandpass = ctx.createBiquadFilter();
    noiseBandpass.type = 'bandpass';
    noiseBandpass.frequency.value = 1200;
    noiseBandpass.Q.value = 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noise.connect(noiseBandpass);
    noiseBandpass.connect(noiseGain);
    noiseGain.connect(compressor);
    noise.start();

    const allOscs = [siren, siren2, rumble, screech];

    // ── Alarm pattern scheduler ──
    // Pattern: rapid 2-tone wail cycling every 0.55s
    // HIGH (1400→800 sweep) for 0.35s, LOW burst for 0.2s, repeat
    let nextEvent = ctx.currentTime;
    let cycle = 0;

    function scheduleChunk() {
      if (stopRef.current || ctx.state === 'closed') return;

      const t = nextEvent;
      const WAIL_DUR = 0.35;
      const DROP_DUR = 0.20;
      const TOTAL = WAIL_DUR + DROP_DUR;

      if (cycle % 4 === 0) {
        // Every 4 cycles: screech burst for terror
        screechGain.gain.setValueAtTime(0, t);
        screechGain.gain.linearRampToValueAtTime(0.35, t + 0.03);
        screechGain.gain.linearRampToValueAtTime(0, t + 0.12);
        noiseGain.gain.setValueAtTime(0.3, t);
        noiseGain.gain.linearRampToValueAtTime(0, t + 0.15);
      }

      // Wail phase: sweep from 1450Hz down to 700Hz aggressively
      siren.frequency.setValueAtTime(1450, t);
      siren.frequency.exponentialRampToValueAtTime(700, t + WAIL_DUR);
      siren2.frequency.setValueAtTime(1380, t);
      siren2.frequency.exponentialRampToValueAtTime(660, t + WAIL_DUR);
      sirenGain.gain.setValueAtTime(1.0, t);
      sirenGain.gain.setValueAtTime(1.0, t + WAIL_DUR);
      siren2Gain.gain.setValueAtTime(0.8, t);

      // Drop/cut phase
      siren.frequency.setValueAtTime(420, t + WAIL_DUR);
      siren.frequency.exponentialRampToValueAtTime(1450, t + TOTAL);
      siren2.frequency.setValueAtTime(400, t + WAIL_DUR);
      siren2.frequency.exponentialRampToValueAtTime(1380, t + TOTAL);

      // Clipping chop: sharp volume cuts for distorted stutter effect
      if (cycle % 2 === 1) {
        sirenGain.gain.setValueAtTime(1.0, t + WAIL_DUR * 0.3);
        sirenGain.gain.setValueAtTime(0.1, t + WAIL_DUR * 0.35);
        sirenGain.gain.setValueAtTime(1.0, t + WAIL_DUR * 0.4);
        sirenGain.gain.setValueAtTime(0.1, t + WAIL_DUR * 0.45);
        sirenGain.gain.setValueAtTime(1.0, t + WAIL_DUR * 0.5);
      }

      // Rumble pulse
      rumbleGain.gain.setValueAtTime(0.6, t);
      rumbleGain.gain.setValueAtTime(0.2, t + WAIL_DUR);
      rumbleGain.gain.setValueAtTime(0.6, t + TOTAL);

      nextEvent += TOTAL;
      cycle++;

      // Schedule next chunk ~100ms before it's needed
      const delay = Math.max(0, (nextEvent - ctx.currentTime - 0.1) * 1000);
      setTimeout(scheduleChunk, delay);
    }

    scheduleChunk();

    return () => {
      stopRef.current = true;
      allOscs.forEach(o => { try { o.stop(); } catch {} });
      try { noise.stop(); } catch {}
      ctx.close();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at center, #1a0000 0%, #000000 70%)',
        animation: 'lockdownPulse 0.55s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes lockdownPulse {
          0%, 100% { background: radial-gradient(ellipse at center, #1a0000 0%, #000000 70%); }
          50% { background: radial-gradient(ellipse at center, #350000 0%, #050000 70%); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes flicker {
          0%, 89%, 91%, 94%, 96%, 100% { opacity: 1; }
          90% { opacity: 0.4; }
          95% { opacity: 0.6; }
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px #dc2626); }
          50% { transform: scale(1.12); filter: drop-shadow(0 0 50px #ef4444) drop-shadow(0 0 100px #991b1b); }
        }
        @keyframes textGlitch {
          0%, 100% { transform: translate(0); clip-path: none; }
          20% { transform: translate(-3px, 1px); clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%); }
          40% { transform: translate(2px, -1px); clip-path: none; }
          60% { transform: translate(-1px, 2px); clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%); }
          80% { transform: translate(1px, 0); clip-path: none; }
        }
        @keyframes redFlash {
          0%, 60%, 100% { opacity: 0; }
          30% { opacity: 0.15; }
        }
      `}</style>

      {/* Red flash overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: '#ff0000', animation: 'redFlash 0.55s ease-in-out infinite' }}
      />

      {/* CRT scanlines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ animation: 'flicker 3s infinite' }}>
        <div
          className="absolute left-0 right-0 h-40 opacity-8"
          style={{
            background: 'linear-gradient(transparent, rgba(220,38,38,0.5), transparent)',
            animation: 'scanline 1.1s linear infinite',
          }}
        />
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="absolute left-0 right-0"
            style={{ top: `${(i / 60) * 100}%`, height: '1px', background: 'rgba(0,0,0,0.4)' }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-2xl mx-auto">
        <div style={{ animation: 'iconPulse 0.55s ease-in-out infinite' }}>
          <AlertOctagon className="w-28 h-28 mb-6" style={{ color: '#dc2626' }} />
        </div>

        <div className="font-mono text-xs tracking-[0.4em] mb-3 uppercase" style={{ color: '#ef4444', opacity: 0.8 }}>
          ⚠ CRITICAL SYSTEM FAILURE ⚠
        </div>

        <h1
          className="font-black uppercase tracking-widest mb-6"
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            color: '#ffffff',
            textShadow: '0 0 20px #ff0000, 0 0 40px rgba(220,38,38,0.9), 0 0 80px rgba(220,38,38,0.5)',
            lineHeight: 1.1,
            letterSpacing: '0.05em',
            animation: 'textGlitch 2.5s infinite',
          }}
        >
          Critical System<br />Malfunction
        </h1>

        <div className="w-32 h-px mx-auto mb-8"
          style={{ background: 'linear-gradient(to right, transparent, #dc2626, transparent)' }} />

        <p className="text-lg font-light mb-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
          We sincerely apologize. TurboAnswer has experienced a critical system failure and is temporarily unavailable.
        </p>
        <p className="text-base font-light mb-12" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Our engineering team has been notified and is working to restore service as quickly as possible. We appreciate your patience.
        </p>

        <div
          className="flex items-center gap-3 px-6 py-3 rounded-full border font-mono text-sm tracking-widest uppercase"
          style={{
            background: 'rgba(220,38,38,0.1)',
            borderColor: 'rgba(220,38,38,0.4)',
            color: '#ef4444',
          }}
        >
          <span className="w-2 h-2 rounded-full"
            style={{ background: '#dc2626', boxShadow: '0 0 10px #dc2626', animation: 'iconPulse 0.55s ease-in-out infinite' }}
          />
          Service Interrupted — Restoration In Progress
        </div>

        <p className="mt-10 text-sm font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
          support@turboanswer.it.com
        </p>
      </div>
    </div>
  );
}
