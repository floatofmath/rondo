import type { CueEvent } from '../engine/run';

interface Note {
  frequency: number;
  at: number;
  duration: number;
}

// Generated tones (D8). Each cue has its own shape so it can be told apart without looking.
const CUES: Record<CueEvent, Note[]> = {
  halfTime: [{ frequency: 660, at: 0, duration: 0.25 }],
  oneMinute: [
    { frequency: 660, at: 0, duration: 0.16 },
    { frequency: 660, at: 0.24, duration: 0.16 },
  ],
  stepEnd: [
    { frequency: 880, at: 0, duration: 0.18 },
    { frequency: 660, at: 0.2, duration: 0.3 },
  ],
  routineEnd: [
    { frequency: 523, at: 0, duration: 0.16 },
    { frequency: 659, at: 0.16, duration: 0.16 },
    { frequency: 784, at: 0.32, duration: 0.16 },
    { frequency: 1047, at: 0.48, duration: 0.45 },
  ],
};

const VOLUME = 0.5;

let context: AudioContext | undefined;

/**
 * Creates or resumes the audio context. iOS only allows this inside a user gesture, and suspends
 * the context whenever the app goes to the background, so it runs on every tap.
 */
function unlock(): void {
  if (!context) {
    if (typeof AudioContext === 'undefined') return;
    context = new AudioContext();
    // A silent buffer played inside the gesture is what fully unlocks output on iOS.
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, context.sampleRate);
    source.connect(context.destination);
    source.start();
  }
  if (context.state !== 'running') void context.resume().catch(() => undefined);
}

export function installAudioUnlock(): void {
  for (const event of ['pointerdown', 'touchend', 'click']) {
    window.addEventListener(event, unlock, { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && context && context.state !== 'running') {
      void context.resume().catch(() => undefined);
    }
  });
}

function schedule(ctx: AudioContext, notes: Note[]): void {
  const start = ctx.currentTime + 0.02;
  for (const { frequency, at, duration } of notes) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    // Short ramps avoid clicks at the edges of each note.
    gain.gain.setValueAtTime(0, start + at);
    gain.gain.linearRampToValueAtTime(VOLUME, start + at + 0.01);
    gain.gain.setValueAtTime(VOLUME, start + at + duration - 0.03);
    gain.gain.linearRampToValueAtTime(0, start + at + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start + at);
    oscillator.stop(start + at + duration);
  }
}

export function playCue(cue: CueEvent): void {
  const ctx = context;
  if (!ctx) return;
  const notes = CUES[cue];
  if (ctx.state === 'running') {
    schedule(ctx, notes);
    return;
  }
  void ctx
    .resume()
    .then(() => schedule(ctx, notes))
    .catch(() => undefined);
}
