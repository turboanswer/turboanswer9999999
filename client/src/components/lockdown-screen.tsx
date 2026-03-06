import { useEffect, useRef, useState } from 'react';
import { AlertOctagon, Volume2, VolumeX } from 'lucide-react';

function makeDistortion(amount: number): Float32Array {
  const n = 512;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function buildAlarm(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);

  // ── Compressor to maximise loudness ──
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -3;
  comp.knee.value = 0;
  comp.ratio.value = 20;
  comp.attack.value = 0.001;
  comp.release.value = 0.05;
  comp.connect(master);

  // ── Distortion chain ──
  const dist = ctx.createWaveShaper();
  dist.curve = makeDistortion(500);
  dist.oversample = '4x';
  dist.connect(comp);

  const distGain = ctx.createGain();
  distGain.gain.value = 0.7;
  distGain.connect(dist);

  // ── Air-raid siren: slow rising/falling sweep ──
  // Psychologically the most terrifying sound - associated with imminent catastrophe
  const siren = ctx.createOscillator();
  siren.type = 'sawtooth';
  siren.frequency.value = 200;
  const sirenGain = ctx.createGain();
  sirenGain.gain.value = 1.0;
  siren.connect(sirenGain);
  sirenGain.connect(distGain);
  sirenGain.connect(comp); // also direct, unprocessed
  siren.start();

  // Second detuned siren for beating/wobble
  const siren2 = ctx.createOscillator();
  siren2.type = 'sawtooth';
  siren2.frequency.value = 198;
  const siren2Gain = ctx.createGain();
  siren2Gain.gain.value = 0.7;
  siren2.connect(siren2Gain);
  siren2Gain.connect(distGain);
  siren2.start();

  // ── Emergency broadcast two-tone blasts layered on top ──
  // US Emergency Alert System uses 853 Hz and 960 Hz
  const eas1 = ctx.createOscillator();
  eas1.type = 'square';
  eas1.frequency.value = 853;
  const eas1Gain = ctx.createGain();
  eas1Gain.gain.value = 0;
  eas1.connect(eas1Gain);
  eas1Gain.connect(distGain);
  eas1.start();

  const eas2 = ctx.createOscillator();
  eas2.type = 'square';
  eas2.frequency.value = 960;
  const eas2Gain = ctx.createGain();
  eas2Gain.gain.value = 0;
  eas2.connect(eas2Gain);
  eas2Gain.connect(distGain);
  eas2.start();

  // ── Deep bass rumble for physical dread ──
  const bass = ctx.createOscillator();
  bass.type = 'square';
  bass.frequency.value = 48;
  const bassGain = ctx.createGain();
  bassGain.gain.value = 0.45;
  bass.connect(bassGain);
  bassGain.connect(comp);
  bass.start();

  // ── High shriek that cuts through ──
  const shriek = ctx.createOscillator();
  shriek.type = 'square';
  shriek.frequency.value = 3200;
  const shriekGain = ctx.createGain();
  shriekGain.gain.value = 0;
  shriek.connect(shriekGain);
  shriekGain.connect(distGain);
  shriek.start();

  // ── Scheduler: air-raid wail pattern ──
  // Rise over 6s from 220→880, hold 1s, fall over 5s from 880→220, repeat
  const RISE = 6.0;
  const HOLD = 1.0;
  const FALL = 5.0;
  const CYCLE = RISE + HOLD + FALL;

  function scheduleWail(startTime: number) {
    const t = startTime;
    // Rise
    siren.frequency.setValueAtTime(220, t);
    siren.frequency.exponentialRampToValueAtTime(880, t + RISE);
    siren2.frequency.setValueAtTime(218, t);
    siren2.frequency.exponentialRampToValueAtTime(875, t + RISE);
    // Hold at top
    siren.frequency.setValueAtTime(880, t + RISE);
    siren2.frequency.setValueAtTime(875, t + RISE);
    siren.frequency.setValueAtTime(880, t + RISE + HOLD);
    siren2.frequency.setValueAtTime(875, t + RISE + HOLD);
    // Fall
    siren.frequency.exponentialRampToValueAtTime(220, t + RISE + HOLD + FALL);
    siren2.frequency.exponentialRampToValueAtTime(218, t + RISE + HOLD + FALL);
  }

  // Schedule multiple cycles ahead
  for (let i = 0; i < 20; i++) {
    scheduleWail(ctx.currentTime + i * CYCLE);
  }

  // ── Scheduler: EAS two-tone bursts every 0.5s (layered on wail) ──
  let easStart = ctx.currentTime;
  function scheduleEAS(t: number) {
    // 853 Hz for 0.25s
    eas1Gain.gain.setValueAtTime(0.5, t);
    eas1Gain.gain.setValueAtTime(0, t + 0.25);
    // 960 Hz for 0.25s
    eas2Gain.gain.setValueAtTime(0, t);
    eas2Gain.gain.setValueAtTime(0.5, t + 0.25);
    eas2Gain.gain.setValueAtTime(0, t + 0.5);
  }

  for (let i = 0; i < 400; i++) {
    scheduleEAS(easStart + i * 0.5);
  }

  // ── Shriek bursts every 3 cycles at the peak ──
  for (let i = 0; i < 20; i++) {
    const peakTime = ctx.currentTime + i * CYCLE + RISE;
    shriekGain.gain.setValueAtTime(0, peakTime);
    shriekGain.gain.linearRampToValueAtTime(0.3, peakTime + 0.1);
    shriekGain.gain.linearRampToValueAtTime(0, peakTime + HOLD);
  }

  return [siren, siren2, eas1, eas2, bass, shriek];
}

export default function LockdownScreen() {
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startedRef = useRef(false);
  const oscsRef = useRef<OscillatorNode[]>([]);

  function startAudio() {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const go = () => {
        oscsRef.current = buildAlarm(ctx);
        setAudioBlocked(false);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(go).catch(() => setAudioBlocked(true));
      } else {
        go();
      }
    } catch {
      setAudioBlocked(true);
    }
  }

  useEffect(() => {
    // Try immediately (works in some browsers)
    try {
      const testCtx = new AudioContext();
      if (testCtx.state === 'running') {
        testCtx.close();
        startAudio();
      } else {
        testCtx.close();
        setAudioBlocked(true);
      }
    } catch {
      setAudioBlocked(true);
    }

    // Also listen for first interaction
    const onInteract = () => {
      startAudio();
      document.removeEventListener('click', onInteract);
      document.removeEventListener('keydown', onInteract);
      document.removeEventListener('touchstart', onInteract);
    };
    document.addEventListener('click', onInteract);
    document.addEventListener('keydown', onInteract);
    document.addEventListener('touchstart', onInteract);

    return () => {
      document.removeEventListener('click', onInteract);
      document.removeEventListener('keydown', onInteract);
      document.removeEventListener('touchstart', onInteract);
      oscsRef.current.forEach(o => { try { o.stop(); } catch {} });
      audioCtxRef.current?.close();
    };
  }, []);

  function toggleMute() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (muted) {
      ctx.resume();
      setMuted(false);
    } else {
      ctx.suspend();
      setMuted(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none cursor-pointer"
      style={{ background: '#0a0000' }}
      onClick={() => { if (audioBlocked) startAudio(); }}
    >
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-2xl mx-auto">

        <AlertOctagon
          className="w-28 h-28 mb-6"
          style={{ color: '#dc2626' }}
        />

        <div
          className="font-mono text-xs tracking-[0.4em] mb-4 uppercase"
          style={{ color: '#ef4444', opacity: 0.75 }}
        >
          ⚠ &nbsp; Error Code: SYS-CRITICAL-001 &nbsp; ⚠
        </div>

        <h1
          className="font-black uppercase tracking-widest mb-6"
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            color: '#ffffff',
            textShadow: '0 0 30px rgba(220,38,38,0.7), 0 0 60px rgba(220,38,38,0.3)',
            lineHeight: 1.1,
          }}
        >
          Critical System<br />Malfunction
        </h1>

        <div
          className="w-40 h-px mx-auto mb-8"
          style={{ background: 'linear-gradient(to right, transparent, #dc2626, transparent)' }}
        />

        <p
          className="text-lg font-light mb-4 leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.8)' }}
        >
          We sincerely apologize. TurboAnswer has experienced a critical system failure and is temporarily unavailable.
        </p>
        <p
          className="text-base font-light mb-10"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          Our engineering team has been notified and is working to restore service as quickly as possible. We appreciate your patience.
        </p>

        <div
          className="flex items-center gap-3 px-6 py-3 rounded-full border font-mono text-sm tracking-widest uppercase mb-6"
          style={{
            background: 'rgba(220,38,38,0.08)',
            borderColor: 'rgba(220,38,38,0.3)',
            color: '#ef4444',
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: '#dc2626' }} />
          Service Interrupted — Restoration In Progress
        </div>

        {audioBlocked && (
          <div
            className="font-mono text-xs tracking-widest uppercase px-5 py-2.5 rounded border cursor-pointer"
            style={{ background: 'rgba(220,38,38,0.12)', borderColor: 'rgba(220,38,38,0.4)', color: '#fca5a5' }}
            onClick={(e) => { e.stopPropagation(); startAudio(); }}
          >
            ▶ &nbsp; Click to Enable Alarm
          </div>
        )}

        <p className="mt-8 text-sm font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
          support@turboanswer.it.com
        </p>
      </div>

      {/* Mute toggle — bottom right */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
        className="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-2 rounded font-mono text-xs transition-opacity opacity-30 hover:opacity-70"
        style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
      >
        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        {muted ? 'unmute' : 'mute'}
      </button>
    </div>
  );
}
