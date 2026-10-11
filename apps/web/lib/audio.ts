// Audio alert generator using Web Audio API (Zero external assets needed)

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function isAudioContextRunning(): boolean {
  return audioCtx !== null && audioCtx.state === 'running';
}

export async function enableAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  // Play a brief, gentle confirmation chime
  playTone(880, 0.08, 'sine');
  return ctx.state === 'running';
}

export function playNewOrderAlert() {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;

  // Modern two-tone kitchen chime (Ding-Dong at 587.33Hz D5 -> 880Hz A5)
  playToneAt(587.33, now, 0.25, 'triangle', 0.3);
  playToneAt(880.0, now + 0.18, 0.45, 'triangle', 0.4);
}

export function playOrderReadyAlert() {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  // High cheerful triple chime for Waiters (E5 -> G#5 -> B5)
  playToneAt(659.25, now, 0.15, 'sine', 0.25);
  playToneAt(830.61, now + 0.12, 0.15, 'sine', 0.25);
  playToneAt(987.77, now + 0.24, 0.35, 'sine', 0.35);
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine') {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  playToneAt(freq, ctx.currentTime, duration, type, 0.2);
}

function playToneAt(
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  gainLevel = 0.2,
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}
