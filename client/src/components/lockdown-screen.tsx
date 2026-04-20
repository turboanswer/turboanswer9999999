import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

// ── Scenario definitions ────────────────────────────────────────────────────
export type LockdownScenario = 'system_failure' | 'security_breach' | 'public_safety' | 'malfunction';

export const SCENARIOS: Record<LockdownScenario, { label: string; heading: string; body: string; voice: string }> = {
  system_failure: {
    label: 'Critical System Failure',
    heading: 'System Lockdown',
    body: 'TurboAnswer has experienced a brutal hack and catastrophic system malfunction. Critical security breach detected. Emergency protocols have been activated.',
    voice:
      'Warning. TurboAnswer has experienced a brutal hack, and catastrophic system malfunction. ' +
      'Critical security breach detected. All systems are now offline. ' +
      'Emergency protocols have been activated. Our engineers are responding. Please stand by.',
  },
  security_breach: {
    label: 'Security Breach / Hijack',
    heading: 'Security Breach Detected',
    body: 'TurboAnswer has been hijacked by an unauthorized party. All systems have been locked down. A full security investigation is underway. Law enforcement has been notified.',
    voice:
      'Attention. TurboAnswer has been hijacked by an unauthorized party. ' +
      'All systems have been locked down immediately. ' +
      'A full security investigation is now underway. ' +
      'Law enforcement has been notified and is actively responding. ' +
      'Do not attempt to access this platform until further notice.',
  },
  public_safety: {
    label: 'Threat to Public Safety',
    heading: 'Public Safety Alert',
    body: 'A credible threat to public safety has been detected through this platform. All services have been immediately suspended. Relevant authorities have been contacted and are responding. If you are in danger, call 911 now.',
    voice:
      'Critical public safety alert. ' +
      'Threatening content has been detected on this platform. ' +
      'All services have been immediately suspended. ' +
      'Relevant law enforcement authorities have been contacted and are actively responding. ' +
      'If you or someone you know is in immediate danger, ' +
      'call nine one one immediately. Do not delay.',
  },
  malfunction: {
    label: 'System Malfunction',
    heading: 'System Malfunction',
    body: 'TurboAnswer is experiencing a critical operational failure across all services. Emergency response teams have been deployed. Service restoration is underway.',
    voice:
      'System malfunction detected. ' +
      'TurboAnswer is experiencing a critical operational failure across all services. ' +
      'Emergency response teams have been deployed. ' +
      'Service restoration is currently underway. ' +
      'We apologize for the disruption and ask for your patience.',
  },
};

// ── Audio reverb helper ────────────────────────────────────────────────────
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

// ── Horror alarm synthesizer ───────────────────────────────────────────────
function buildHorrorAlarm(ctx: AudioContext): () => void {
  const master = ctx.createGain();
  master.gain.value = 0.75;
  master.connect(ctx.destination);

  const reverb = makeReverb(ctx, 5, 2.2);
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.4;
  reverb.connect(reverbGain);
  reverbGain.connect(master);

  function wire(node: AudioNode) { node.connect(master); node.connect(reverb); }

  const droneA = ctx.createOscillator();
  droneA.type = 'sine'; droneA.frequency.value = 58;
  const droneAGain = ctx.createGain(); droneAGain.gain.value = 0.8;
  droneA.connect(droneAGain); droneAGain.connect(master); droneA.start();

  const droneB = ctx.createOscillator();
  droneB.type = 'sine'; droneB.frequency.value = 61.5;
  const droneBGain = ctx.createGain(); droneBGain.gain.value = 0.55;
  droneB.connect(droneBGain); droneBGain.connect(reverb); droneB.start();

  const sub = ctx.createOscillator();
  sub.type = 'sine'; sub.frequency.value = 28;
  const subGain = ctx.createGain(); subGain.gain.value = 0.65;
  sub.connect(subGain); subGain.connect(master); sub.start();

  const wail = ctx.createOscillator();
  wail.type = 'triangle'; wail.frequency.value = 90;
  const wailGain = ctx.createGain(); wailGain.gain.value = 0;
  wail.connect(wailGain); wire(wailGain); wail.start();

  const wail2 = ctx.createOscillator();
  wail2.type = 'triangle'; wail2.frequency.value = 88;
  const wail2Gain = ctx.createGain(); wail2Gain.gain.value = 0;
  wail2.connect(wail2Gain); wire(wail2Gain); wail2.start();

  const RISE = 10, HOLD = 2.5, FALL = 8, GAP = 2, CYCLE = RISE + HOLD + FALL + GAP;
  for (let i = 0; i < 30; i++) {
    const t = ctx.currentTime + i * CYCLE;
    wailGain.gain.setValueAtTime(0, t);
    wail2Gain.gain.setValueAtTime(0, t);
    wailGain.gain.linearRampToValueAtTime(0.65, t + 1.2);
    wail2Gain.gain.linearRampToValueAtTime(0.45, t + 1.2);
    wail.frequency.setValueAtTime(90, t);
    wail2.frequency.setValueAtTime(88, t);
    wail.frequency.exponentialRampToValueAtTime(360, t + RISE);
    wail2.frequency.exponentialRampToValueAtTime(355, t + RISE);
    wail.frequency.setValueAtTime(360, t + RISE);
    wail2.frequency.setValueAtTime(355, t + RISE);
    wail.frequency.exponentialRampToValueAtTime(90, t + RISE + HOLD + FALL);
    wail2.frequency.exponentialRampToValueAtTime(88, t + RISE + HOLD + FALL);
    wailGain.gain.setValueAtTime(0.65, t + RISE + HOLD + FALL - 1.0);
    wailGain.gain.linearRampToValueAtTime(0, t + RISE + HOLD + FALL);
    wail2Gain.gain.setValueAtTime(0.45, t + RISE + HOLD + FALL - 1.0);
    wail2Gain.gain.linearRampToValueAtTime(0, t + RISE + HOLD + FALL);
  }

  const whistle = ctx.createOscillator();
  whistle.type = 'sine'; whistle.frequency.value = 2800;
  const whistleGain = ctx.createGain(); whistleGain.gain.value = 0.055;
  whistle.connect(whistleGain); wire(whistleGain); whistle.start();

  const lfo = ctx.createOscillator();
  lfo.type = 'sine'; lfo.frequency.value = 0.18;
  const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 45;
  lfo.connect(lfoDepth); lfoDepth.connect(whistle.frequency); lfo.start();

  return () => {
    [droneA, droneB, sub, wail, wail2, whistle, lfo].forEach(o => { try { o.stop(); } catch {} });
    try { master.disconnect(); } catch {}
    try { ctx.close(); } catch {}
  };
}

// ── Pick the deepest male voice available ──────────────────────────────────
const FEMALE_NAMES = /female|samantha|victoria|karen|moira|tessa|fiona|veena|susan|allison|ava|evelyn|sara|siri|zira|cortana|hazel|kate|serena|amelie|anna|laura|alice|nora|sarah|joana|helena|sandy|ellen/i;
const MALE_PRIORITY = /google uk english male|google us english|microsoft david|microsoft mark|microsoft james|microsoft richard|daniel|fred|thomas|alex|oliver|bruce|albert|ralph|aaron|arthur|lee|rishi|luca|reed/i;

function pickMaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  // Priority 1: explicitly named male voices
  const priority = voices.find(v => MALE_PRIORITY.test(v.name) && !FEMALE_NAMES.test(v.name));
  if (priority) return priority;
  // Priority 2: any voice with "male" in name
  const namedMale = voices.find(v => /\bmale\b/i.test(v.name));
  if (namedMale) return namedMale;
  // Priority 3: any English voice that isn't on the female list
  const english = voices.find(v => /^en[-_]/i.test(v.lang) && !FEMALE_NAMES.test(v.name));
  if (english) return english;
  // Fallback: any voice that isn't on the female list
  return voices.find(v => !FEMALE_NAMES.test(v.name)) || voices[0] || null;
}

// ── Component ──────────────────────────────────────────────────────────────
interface Props { scenario?: string; }

export default function LockdownScreen({ scenario = 'system_failure' }: Props) {
  const sc = (SCENARIOS[scenario as LockdownScenario] ?? SCENARIOS.system_failure);
  const { user } = useAuth();
  const isAdmin = !!(user as any)?.isEmployee;

  // Admin-only: fetch full lockdown details (who/why/when)
  const { data: details } = useQuery<{
    active: boolean;
    scenario: string | null;
    activatedBy: string | null;
    activatedAt: string | null;
    reason: string | null;
  }>({
    queryKey: ['/api/admin/lockdown/details'],
    enabled: isAdmin,
    refetchInterval: 15000,
  });

  const playingRef   = useRef(false);
  const stopRef      = useRef<(() => void) | null>(null);
  const ttsActive    = useRef(false);   // true while any chunk is speaking
  const ttsEnabled   = useRef(false);   // true once user gesture has unlocked TTS
  const chunkIdxRef  = useRef(0);
  const chunksRef    = useRef<string[]>([]);
  const loopTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [soundActive, setSoundActive] = useState(false);

  // ── Split voice text into short sentences (each << Chrome's 15s limit) ──
  function getChunks(): string[] {
    // Split on sentence-ending punctuation + whitespace
    return sc.voice
      .split(/(?<=[.!?,])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // ── Speak a single chunk by index, then chain to the next ────────────────
  function speakChunk(idx: number) {
    if (!window.speechSynthesis) return;
    const chunks = chunksRef.current;

    // All chunks done → pause then loop
    if (idx >= chunks.length) {
      ttsActive.current = false;
      loopTimer.current = setTimeout(() => speakAll(false), 6000);
      return;
    }

    const utt = new SpeechSynthesisUtterance(chunks[idx]);
    utt.rate   = 0.72;   // slightly faster = less likely to hit 15s cutoff
    utt.pitch  = 0.0;
    utt.volume = 1.0;
    const voice = pickMaleVoice();
    if (voice) utt.voice = voice;

    utt.onstart = () => { ttsActive.current = true; };
    utt.onend   = () => { speakChunk(idx + 1); };
    utt.onerror = (e: any) => {
      // "interrupted" means we cancelled it ourselves — don't retry
      if (e?.error === 'interrupted') return;
      // Any other error: wait a beat then retry the same chunk
      setTimeout(() => speakChunk(idx), 800);
    };

    try { window.speechSynthesis.resume(); } catch {}
    window.speechSynthesis.speak(utt);
  }

  // speakAll: kick off a full announcement from the beginning
  // fromGesture=true → called synchronously inside a user event (no cancel allowed)
  // fromGesture=false → safe to cancel first
  function speakAll(fromGesture: boolean) {
    if (!window.speechSynthesis) return;
    if (ttsActive.current) return;

    chunksRef.current = getChunks();
    chunkIdxRef.current = 0;

    if (!fromGesture) {
      try { window.speechSynthesis.cancel(); } catch {}
      setTimeout(() => speakChunk(0), 50);
    } else {
      // Inside gesture: no cancel, just speak directly
      try { window.speechSynthesis.resume(); } catch {}
      speakChunk(0);
    }
  }

  function stopTTS() {
    ttsActive.current = false;
    if (loopTimer.current) { clearTimeout(loopTimer.current); loopTimer.current = null; }
    try { window.speechSynthesis?.cancel(); } catch {}
  }

  // ── Audio ──────────────────────────────────────────────────────────────
  async function attemptPlay() {
    if (playingRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      if (ctx.state === 'running') {
        playingRef.current = true;
        stopRef.current = buildHorrorAlarm(ctx);
        setSoundActive(true);
      } else {
        try { ctx.close(); } catch {}
      }
    } catch {}
  }

  // handleUserGesture: must stay synchronous inside the gesture event so
  // Chrome recognises speak() as gesture-triggered
  function handleUserGesture() {
    // ── Voice ──────────────────────────────────────────────────────────────
    if (!ttsEnabled.current) {
      ttsEnabled.current = true;
      speakAll(true);   // fromGesture=true — no cancel, direct speak
    }
    // ── Audio ──────────────────────────────────────────────────────────────
    if (!playingRef.current) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctx.resume().then(() => {
          if (!playingRef.current && ctx.state === 'running') {
            playingRef.current = true;
            stopRef.current = buildHorrorAlarm(ctx);
            setSoundActive(true);
          }
        }).catch(() => {});
      } catch {}
    }
  }

  useEffect(() => {
    // Try voice immediately — works on Firefox/Safari without gesture
    const tryVoiceImmediate = () => {
      if (!window.speechSynthesis) return;
      const go = () => { ttsEnabled.current = true; speakAll(false); };
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', go, { once: true });
      } else {
        go();
      }
    };
    tryVoiceImmediate();

    // Try audio immediately — silently fails on Chrome until user clicks
    attemptPlay();
    const t1 = setTimeout(() => { if (!playingRef.current) attemptPlay(); }, 500);
    const t2 = setTimeout(() => { if (!playingRef.current) attemptPlay(); }, 1500);

    const onInteract = () => handleUserGesture();
    document.addEventListener('click',     onInteract);
    document.addEventListener('mousedown', onInteract);
    document.addEventListener('touchend',  onInteract);
    document.addEventListener('keydown',   onInteract);

    // Tab return — no gesture available, use forceRestart path
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Restart audio
        try { stopRef.current?.(); } catch {}
        stopRef.current = null; playingRef.current = false; setSoundActive(false);
        attemptPlay();
        // Restart TTS (non-gesture path is fine here)
        ttsActive.current = false;
        ttsEnabled.current = false;   // reset so next gesture triggers again
        if (loopTimer.current) clearTimeout(loopTimer.current);
        speakAll(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(t1); clearTimeout(t2);
      document.removeEventListener('click',     onInteract);
      document.removeEventListener('mousedown', onInteract);
      document.removeEventListener('touchend',  onInteract);
      document.removeEventListener('keydown',   onInteract);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      try { stopRef.current?.(); } catch {}
      stopTTS();
    };
  }, [scenario]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a0000 0%, #000000 60%)' }}
      onClick={handleUserGesture}
    >
      <style>{`
        @keyframes tearDrip { 0%{opacity:0;transform:scaleY(0.2) translateY(0)} 20%{opacity:0.9} 80%{opacity:0.7} 100%{opacity:0;transform:scaleY(1.2) translateY(18px)} }
        @keyframes tearDrip2 { 0%{opacity:0;transform:scaleY(0.2) translateY(0)} 15%{opacity:0.8} 85%{opacity:0.5} 100%{opacity:0;transform:scaleY(1.4) translateY(22px)} }
        @keyframes redPulse { 0%,100%{opacity:0.25} 50%{opacity:0.55} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes blinkDot { 0%,49%{opacity:1} 50%,100%{opacity:0} }
      `}</style>

      {/* Scanline overlay for CRT/emergency feel */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', background:'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)' }} />

      {/* Top emergency bar */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:10, padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(180,0,0,0.12)', borderBottom:'1px solid rgba(180,0,0,0.3)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ display:'inline-block', width:'8px', height:'8px', borderRadius:'50%', background:'#cc0000', animation:'blinkDot 1s step-end infinite' }} />
          <span style={{ fontFamily:'monospace', fontSize:'0.65rem', color:'rgba(200,0,0,0.8)', letterSpacing:'0.2em', textTransform:'uppercase' }}>Emergency Alert System — TurboAnswer Platform</span>
        </div>
        <span style={{ fontFamily:'monospace', fontSize:'0.6rem', color:'rgba(180,0,0,0.5)', letterSpacing:'0.15em' }}>INCIDENT ACTIVE</span>
      </div>

      {/* Admin-only diagnostics overlay (visible only to support@turboanswer.it.com / employees) */}
      {isAdmin && details?.active && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: 44, left: 12, zIndex: 11,
            maxWidth: 'min(420px, 90vw)',
            background: 'rgba(20, 0, 0, 0.85)',
            border: '1px solid rgba(255,80,80,0.4)',
            borderRadius: 6,
            padding: '10px 14px',
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            color: '#ffb0b0',
            lineHeight: 1.5,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ color: '#ff6060', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>
            ▲ ADMIN DIAGNOSTICS
          </div>
          <div><span style={{ opacity: 0.6 }}>Scenario:</span> {details.scenario}</div>
          <div><span style={{ opacity: 0.6 }}>Activated by:</span> {details.activatedBy || 'unknown'}</div>
          <div>
            <span style={{ opacity: 0.6 }}>When:</span>{' '}
            {details.activatedAt ? new Date(details.activatedAt).toLocaleString() : '—'}
          </div>
          {details.reason && (
            <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px dashed rgba(255,80,80,0.25)' }}>
              <span style={{ opacity: 0.6 }}>Reason:</span> {details.reason}
            </div>
          )}
        </div>
      )}

      {/* Robot SVG */}
      <svg
        viewBox="0 0 420 340"
        style={{ width: 'min(400px, 78vw)', marginBottom: '1.5rem', overflow: 'visible', position:'relative', zIndex:1 }}
        aria-hidden="true"
      >
        {/* Floor shadow */}
        <ellipse cx="210" cy="330" rx="130" ry="10" fill="rgba(200,0,0,0.07)" />

        <g transform="rotate(28, 210, 200)">
          {/* Legs */}
          <rect x="148" y="258" width="30" height="72" rx="7" fill="#1c1c1c" stroke="#333" strokeWidth="1.5" transform="rotate(-18, 163, 294)" />
          <rect x="148" y="322" width="30" height="14" rx="4" fill="#222" stroke="#3a3a3a" strokeWidth="1.5" transform="rotate(-18, 163, 329)" />
          <rect x="182" y="260" width="30" height="72" rx="7" fill="#1c1c1c" stroke="#333" strokeWidth="1.5" transform="rotate(22, 197, 296)" />
          <rect x="182" y="324" width="30" height="14" rx="4" fill="#222" stroke="#3a3a3a" strokeWidth="1.5" transform="rotate(22, 197, 331)" />
          {/* Hip joints */}
          <circle cx="162" cy="262" r="9" fill="#131313" stroke="#333" strokeWidth="1.5" />
          <circle cx="198" cy="264" r="9" fill="#131313" stroke="#333" strokeWidth="1.5" />

          {/* Torso */}
          <rect x="130" y="155" width="100" height="108" rx="12" fill="#181818" stroke="#353535" strokeWidth="2" />
          {/* Open chest panel */}
          <rect x="136" y="165" width="82" height="86" rx="5" fill="#040c04" stroke="#1a3a1a" strokeWidth="1" />
          {/* Circuit traces */}
          <line x1="146" y1="178" x2="208" y2="178" stroke="#00bb4d" strokeWidth="1.2" opacity="0.65" />
          <line x1="146" y1="188" x2="190" y2="188" stroke="#00bb4d" strokeWidth="1" opacity="0.45" />
          <line x1="158" y1="178" x2="158" y2="238" stroke="#00bb4d" strokeWidth="1" opacity="0.55" />
          <line x1="178" y1="188" x2="178" y2="235" stroke="#00bb4d" strokeWidth="1" opacity="0.38" />
          <line x1="195" y1="178" x2="195" y2="220" stroke="#00bb4d" strokeWidth="1" opacity="0.48" />
          <rect x="165" y="198" width="22" height="14" rx="2" fill="#001a00" stroke="#00bb4d" strokeWidth="1" opacity="0.65" />
          <circle cx="158" cy="178" r="3.5" fill="#00bb4d" opacity="0.85" />
          <circle cx="178" cy="188" r="3.5" fill="#00bb4d" opacity="0.65" />
          <circle cx="195" cy="178" r="3" fill="#00bb4d" opacity="0.75" />
          {/* Damaged indicator — red */}
          <circle cx="200" cy="215" r="5" fill="#cc0000" opacity="0.9" />
          <circle cx="200" cy="215" r="8" fill="none" stroke="#cc0000" strokeWidth="1" opacity="0.3" style={{animation:'redPulse 1.8s ease-in-out infinite'}} />

          {/* Arms */}
          <rect x="52" y="148" width="78" height="24" rx="9" fill="#1c1c1c" stroke="#333" strokeWidth="1.5" transform="rotate(-30, 130, 160)" />
          <rect x="40" y="138" width="18" height="24" rx="6" fill="#222" stroke="#3a3a3a" strokeWidth="1.5" transform="rotate(-30, 49, 150)" />
          <rect x="230" y="158" width="78" height="24" rx="9" fill="#1c1c1c" stroke="#333" strokeWidth="1.5" transform="rotate(18, 230, 170)" />
          <rect x="304" y="160" width="18" height="24" rx="6" fill="#222" stroke="#3a3a3a" strokeWidth="1.5" transform="rotate(18, 313, 172)" />
          {/* Shoulder joints */}
          <circle cx="130" cy="162" r="11" fill="#131313" stroke="#3a3a3a" strokeWidth="1.5" />
          <circle cx="230" cy="170" r="11" fill="#131313" stroke="#3a3a3a" strokeWidth="1.5" />

          {/* Neck */}
          <rect x="153" y="144" width="28" height="14" rx="5" fill="#181818" stroke="#333" strokeWidth="1.5" />

          {/* Head */}
          <rect x="133" y="80" width="94" height="68" rx="12" fill="#181818" stroke="#353535" strokeWidth="2" />
          {/* Eye visor bar */}
          <rect x="142" y="98" width="76" height="22" rx="6" fill="#180000" stroke="#2a0000" strokeWidth="1" />
          {/* Left eye — dead/off */}
          <rect x="146" y="101" width="22" height="16" rx="4" fill="#1a0000" opacity="0.6" />
          {/* Right eye — glowing red */}
          <rect x="192" y="101" width="22" height="16" rx="4" fill="#5a0000" opacity="0.9" />
          <rect x="196" y="104" width="14" height="10" rx="2" fill="#cc0000" opacity="0.7" />
          {/* Right eye glow */}
          <rect x="192" y="101" width="22" height="16" rx="4" fill="none" stroke="#ff2200" strokeWidth="1" opacity="0.5" style={{animation:'redPulse 2s ease-in-out infinite'}} />

          {/* RED TEARS — left eye (dim, barely alive) */}
          <ellipse cx="157" cy="120" rx="2.5" ry="4" fill="#8b0000" opacity="0.7" style={{animation:'tearDrip 3.2s ease-in 1.4s infinite'}} />
          <ellipse cx="155" cy="128" rx="1.8" ry="3" fill="#8b0000" opacity="0.5" style={{animation:'tearDrip 3.2s ease-in 2.1s infinite'}} />
          {/* RED TEARS — right eye (brighter, active) */}
          <ellipse cx="203" cy="119" rx="3" ry="5" fill="#cc0000" opacity="0.85" style={{animation:'tearDrip 2.8s ease-in 0s infinite'}} />
          <ellipse cx="206" cy="127" rx="2" ry="3.5" fill="#cc0000" opacity="0.65" style={{animation:'tearDrip2 2.8s ease-in 0.7s infinite'}} />
          <ellipse cx="201" cy="130" rx="1.5" ry="2.5" fill="#aa0000" opacity="0.5" style={{animation:'tearDrip2 3.5s ease-in 1.8s infinite'}} />

          {/* Mouth — flat grim line */}
          <rect x="155" y="130" width="50" height="8" rx="3" fill="#101010" stroke="#2a2a2a" strokeWidth="1" />
          <line x1="165" y1="130" x2="165" y2="138" stroke="#181818" strokeWidth="1.5" />
          <line x1="175" y1="130" x2="175" y2="138" stroke="#181818" strokeWidth="1.5" />
          <line x1="185" y1="130" x2="185" y2="138" stroke="#181818" strokeWidth="1.5" />
          <line x1="195" y1="130" x2="195" y2="138" stroke="#181818" strokeWidth="1.5" />

          {/* Antenna — bent/broken */}
          <line x1="180" y1="80" x2="176" y2="58" stroke="#333" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="176" y1="58" x2="160" y2="44" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="160" cy="43" r="5" fill="#222" stroke="#444" strokeWidth="1.5" />
          {/* Broken antenna spark */}
          <circle cx="176" cy="58" r="3" fill="#cc0000" opacity="0.6" style={{animation:'blinkDot 0.9s step-end infinite'}} />
        </g>

        {/* Electric bolt — outside rotation */}
        <g>
          <polyline points="108,188 88,205 112,216 85,238 114,234 92,262" stroke="#FFD700" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.12" />
          <polyline points="108,188 88,205 112,216 85,238 114,234 92,262" stroke="#FFD700" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.3" />
          <polyline points="108,188 88,205 112,216 85,238 114,234 92,262" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
          <polyline points="108,188 88,205 112,216 85,238 114,234 92,262" stroke="#FFD700" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.75" />
          <line x1="88" y1="205" x2="72" y2="196" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <line x1="88" y1="205" x2="74" y2="218" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
          <line x1="85" y1="238" x2="66" y2="232" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <line x1="85" y1="238" x2="70" y2="250" stroke="#FFE066" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
          <line x1="92" y1="262" x2="76" y2="270" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
          <circle cx="70" cy="196" r="2.5" fill="#FFD700" opacity="0.9" />
          <circle cx="63" cy="233" r="2" fill="#FFE066" opacity="0.8" />
          <circle cx="74" cy="271" r="2.5" fill="#FFD700" opacity="0.7" />
        </g>
      </svg>

      {/* Tap to unmute prompt — shown until audio starts */}
      {!soundActive && (
        <div style={{ position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)', zIndex:2, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'999px', padding:'8px 20px', display:'flex', alignItems:'center', gap:'8px', backdropFilter:'blur(8px)', animation:'redPulse 2s ease-in-out infinite' }}>
          <span style={{ fontSize:'1rem' }}>🔇</span>
          <span style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.78rem', letterSpacing:'0.08em' }}>Tap anywhere to activate sound</span>
        </div>
      )}

      {/* Text block */}
      <div className="flex flex-col items-center text-center px-8 max-w-lg mx-auto gap-4" style={{ position:'relative', zIndex:1 }}>
        {/* Scenario label */}
        <div style={{ fontFamily:'monospace', fontSize:'0.65rem', color:'rgba(200,0,0,0.7)', letterSpacing:'0.25em', textTransform:'uppercase', padding:'4px 12px', border:'1px solid rgba(180,0,0,0.3)', borderRadius:'3px' }}>
          {(SCENARIOS[scenario as LockdownScenario] ?? SCENARIOS.system_failure).label}
        </div>

        <h1
          className="font-black uppercase tracking-widest"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', color: '#ffffff', lineHeight: 1.1, textShadow: '0 0 40px rgba(200,0,0,0.5)' }}
        >
          {sc.heading}
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.75, maxWidth: '420px' }}>
          {sc.body}
        </p>

        {/* Divider */}
        <div style={{ width:'100%', maxWidth:'320px', height:'1px', background:'linear-gradient(90deg, transparent, rgba(180,0,0,0.4), transparent)' }} />

        <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.72rem', letterSpacing: '0.14em', fontFamily: 'monospace' }}>
          support@turboanswer.it.com &nbsp;·&nbsp; 866-467-7269
        </p>
      </div>
    </div>
  );
}
