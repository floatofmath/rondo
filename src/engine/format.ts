function clock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Counts down in whole seconds, showing 0:00 only at zero, then overrun as `+m:ss`. */
export function formatRemaining(remainingSeconds: number): string {
  if (remainingSeconds > 0) return clock(Math.ceil(remainingSeconds));
  const over = Math.floor(-remainingSeconds);
  return over === 0 ? '0:00' : `+${clock(over)}`;
}

export function formatDuration(seconds: number): string {
  return clock(Math.round(seconds));
}
