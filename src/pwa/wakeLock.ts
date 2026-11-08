/**
 * Holds the screen on until the returned function is called. iOS drops the lock whenever the app
 * is hidden, so it is requested again each time the app becomes visible.
 */
export function holdWakeLock(): () => void {
  let sentinel: WakeLockSentinel | undefined;
  let released = false;

  const acquire = async () => {
    if (released || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    if (sentinel && !sentinel.released) return;
    try {
      const next = await navigator.wakeLock.request('screen');
      if (released) void next.release();
      else sentinel = next;
    } catch (error) {
      console.warn('Wake lock unavailable', error);
    }
  };

  const onVisibilityChange = () => void acquire();
  document.addEventListener('visibilitychange', onVisibilityChange);
  void acquire();

  return () => {
    released = true;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    void sentinel?.release().catch(() => undefined);
  };
}
