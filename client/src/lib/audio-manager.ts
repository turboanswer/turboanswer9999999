let _ctx: AudioContext | null = null;
let _unlocked = false;

export function primeAudioContext(): void {
  if (_unlocked) return;
  try {
    if (!_ctx) _ctx = new AudioContext();
    if (_ctx.state === 'suspended') {
      _ctx.resume().then(() => { _unlocked = true; }).catch(() => {});
    } else if (_ctx.state === 'running') {
      _unlocked = true;
    }
  } catch {}
}

export function getAudioContext(): AudioContext | null {
  return _ctx;
}

export function isUnlocked(): boolean {
  return _unlocked && _ctx?.state === 'running';
}
