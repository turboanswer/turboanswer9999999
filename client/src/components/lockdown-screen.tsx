import { useEffect, useRef, useState } from 'react';
import { getAudioContext, primeAudioContext, isUnlocked } from '@/lib/audio-manager';

function makeReverb(ctx: AudioContext, duration = 4, decay = 2.5): ConvolverNode {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  const node = ctx.createConvolver();
  node.buffer = impulse;
  return node;
}

function buildHorrorAlarm(ctx: AudioContext): () => void {
  const dest = ctx.destination;

  // Master
  const master = ctx.createGain();
  master.gain.value = 0.75;
  master.connect(dest);

  // Reverb send for cavernous depth
  const reverb = makeReverb(ctx, 5, 2.2);
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.45;
  reverb.connect(reverbGain);
  reverbGain.connect(master);

  function wire(node: AudioNode) {
    node.connect(master);
    node.connect(reverb);
  }

  // ── Layer 1: Deep horror drone — two slightly detuned low oscillators ──
  // Creates that classic horror "BRAAAM" / dread sound
  const droneA = ctx.createOscillator();
  droneA.type = 'sine';
  droneA.frequency.value = 58;
  const droneAGain = ctx.createGain();
  droneAGain.gain.value = 0.8;
  droneA.connect(droneAGain);
  droneAGain.connect(master);
  droneA.start();

  const droneB = ctx.createOscillator();
  droneB.type = 'sine';
  droneB.frequency.value = 61.5; // slightly detuned — creates beating/unease
  const droneBGain = ctx.createGain();
  droneBGain.gain.value = 0.6;
  droneB.connect(droneBGain);
  droneBGain.connect(reverb);
  droneB.start();

  // ── Layer 2: Slow warbling horror alarm tone ──
  // Rises painfully slowly from 90Hz to 360Hz over 10 seconds, then falls back
  const wail = ctx.createOscillator();
  wail.type = 'triangle';
  wail.frequency.value = 90;
  const wailGain = ctx.createGain();
  wailGain.gain.value = 0.65;
  wail.connect(wailGain);
  wire(wailGain);
  wail.start();

  const wail2 = ctx.createOscillator();
  wail2.type = 'triangle';
  wail2.frequency.value = 88; // slight detune for horror wobble
  const wail2Gain = ctx.createGain();
  wail2Gain.gain.value = 0.45;
  wail2.connect(wail2Gain);
  wire(wail2Gain);
  wail2.start();

  const RISE = 10.0;  // 10 seconds to rise — uncomfortably slow
  const HOLD = 2.5;   // linger at the top
  const FALL = 8.0;   // 8 seconds to fall
  const GAP  = 1.5;   // brief silence before next cycle
  const CYCLE = RISE + HOLD + FALL + GAP;

  for (let i = 0; i < 30; i++) {
    const t = ctx.currentTime + i * CYCLE;
    // Silence in gap
    wailGain.gain.setValueAtTime(0, t);
    wail2Gain.gain.setValueAtTime(0, t);
    // Fade in and rise
    wailGain.gain.linearRampToValueAtTime(0.65, t + 0.8);
    wail2Gain.gain.linearRampToValueAtTime(0.45, t + 0.8);
    wail.frequency.setValueAtTime(90, t);
    wail2.frequency.setValueAtTime(88, t);
    wail.frequency.exponentialRampToValueAtTime(360, t + RISE);
    wail2.frequency.exponentialRampToValueAtTime(355, t + RISE);
    // Hold
    wail.frequency.setValueAtTime(360, t + RISE);
    wail2.frequency.setValueAtTime(355, t + RISE);
    // Fall
    wail.frequency.exponentialRampToValueAtTime(90, t + RISE + HOLD + FALL);
    wail2.frequency.exponentialRampToValueAtTime(88, t + RISE + HOLD + FALL);
    // Fade out at end of fall
    wailGain.gain.setValueAtTime(0.65, t + RISE + HOLD + FALL - 0.8);
    wailGain.gain.linearRampToValueAtTime(0, t + RISE + HOLD + FALL);
    wail2Gain.gain.setValueAtTime(0.45, t + RISE + HOLD + FALL - 0.8);
    wail2Gain.gain.linearRampToValueAtTime(0, t + RISE + HOLD + FALL);
  }

  // ── Layer 3: Sub-bass rumble — physical dread ──
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 28;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.7;
  sub.connect(subGain);
  subGain.connect(master);
  sub.start();

  // ── Layer 4: High eerie whistle — barely audible discomfort ──
  const whistle = ctx.createOscillator();
  whistle.type = 'sine';
  whistle.frequency.value = 2800;
  const whistleGain = ctx.createGain();
  whistleGain.gain.value = 0.06;
  whistle.connect(whistleGain);
  wire(whistleGain);
  whistle.start();

  // ── LFO: slowly tremble the high whistle pitch ──
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.2;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 40;
  lfo.connect(lfoDepth);
  lfoDepth.connect(whistle.frequency);
  lfo.start();

  return () => {
    [droneA, droneB, wail, wail2, sub, whistle, lfo].forEach(o => {
      try { o.stop(); } catch {}
    });
    master.disconnect();
  };
}

export default function LockdownScreen() {
  const [needsClick, setNeedsClick] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const startedRef = useRef(false);

  function tryStartAlarm() {
    if (startedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') {
      setNeedsClick(true);
      return;
    }
    startedRef.current = true;
    setNeedsClick(false);
    stopRef.current = buildHorrorAlarm(ctx);
  }

  function handleClick() {
    if (!isUnlocked()) {
      primeAudioContext();
      // Wait a tick for context to resume
      setTimeout(() => {
        const ctx = getAudioContext();
        if (ctx) {
          ctx.resume().then(() => {
            startedRef.current = false;
            tryStartAlarm();
          });
        }
      }, 100);
    }
  }

  useEffect(() => {
    // Try immediately — works if user already interacted with the app
    tryStartAlarm();

    // Fallback: retry on any interaction
    const retry = () => {
      startedRef.current = false;
      tryStartAlarm();
    };
    window.addEventListener('click', retry, { once: true });
    window.addEventListener('keydown', retry, { once: true });
    window.addEventListener('touchstart', retry, { once: true });

    return () => {
      window.removeEventListener('click', retry);
      window.removeEventListener('keydown', retry);
      window.removeEventListener('touchstart', retry);
      stopRef.current?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: '#8b0000' }}
      onClick={needsClick ? handleClick : undefined}
    >
      <div className="flex flex-col items-center text-center px-8 max-w-xl mx-auto gap-8">

        <div style={{ fontSize: '5rem', lineHeight: 1 }}>⚠</div>

        <h1
          className="font-black uppercase tracking-widest"
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            color: '#ffffff',
            textShadow: '0 0 40px rgba(0,0,0,0.8)',
            lineHeight: 1.1,
          }}
        >
          System<br />Lockdown
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem', lineHeight: 1.7 }}>
          TurboAnswer is currently offline. Our team has been notified and is working to restore service.
        </p>

        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', letterSpacing: '0.15em' }}>
          support@turboanswer.it.com
        </p>

        {needsClick && (
          <button
            onClick={handleClick}
            style={{
              marginTop: '1rem',
              padding: '0.6rem 1.6rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              cursor: 'pointer',
            }}
          >
            ▶ ENABLE SOUND
          </button>
        )}
      </div>
    </div>
  );
}
