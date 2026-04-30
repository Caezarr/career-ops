/**
 * Synthesise a short two-tone "ding" via the Web Audio API. Avoids
 * shipping an audio asset and avoids the "click before sound plays"
 * issue you get from <audio> elements.
 *
 * The function is sync-call-safe: it lazily creates an AudioContext on
 * first use and reuses it. macOS browsers gate AudioContext on a user
 * gesture — calling this from a click/keystroke handler works; calling
 * it on page load or from a setTimeout will be silently ignored by the
 * browser (the context starts in `suspended` state and we resume it).
 *
 * Designed for low intrusion: peak gain ~0.18, total length ~250 ms.
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === 'suspended') {
    // Best-effort resume — succeeds when called from a user gesture.
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/**
 * Play the toast/notification "ding". `volume` is a multiplier in [0, 1]
 * applied on top of the baseline gain. Fails silently if Web Audio is
 * unavailable or the context is still suspended.
 */
export function playNotificationDing(volume = 1): void {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18 * volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  gain.connect(ac.destination);

  // Two stacked oscillators — perfect-fifth interval reads as a "ding"
  // rather than a beep. Keep them brief so they don't overlap with the
  // toast's slide-in animation.
  const osc1 = ac.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now); // A5
  osc1.connect(gain);
  osc1.start(now);
  osc1.stop(now + 0.25);

  const osc2 = ac.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1318.51, now + 0.06); // E6
  osc2.connect(gain);
  osc2.start(now + 0.06);
  osc2.stop(now + 0.25);
}
