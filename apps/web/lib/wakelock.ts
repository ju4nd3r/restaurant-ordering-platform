// Screen Wake Lock API utility to prevent staff tablets/screens from sleeping

let wakeLockSentinel: any = null;

export async function requestWakeLock(): Promise<boolean> {
  if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
    return false;
  }

  try {
    wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
    return true;
  } catch (err) {
    console.warn('Wake Lock request failed:', err);
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (err) {
      console.warn('Wake Lock release failed:', err);
    } finally {
      wakeLockSentinel = null;
    }
  }
}

export function isWakeLockActive(): boolean {
  return wakeLockSentinel !== null;
}
