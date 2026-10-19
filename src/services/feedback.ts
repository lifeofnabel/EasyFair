/** Tiny haptic tick where the platform supports it (Android). iOS Safari has no vibration API; it is skipped silently. */
export function tap(strong = false): void {
  try { navigator.vibrate?.(strong ? [18, 40, 18] : 12); } catch { /* not supported */ }
}
