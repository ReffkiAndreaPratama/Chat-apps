import { useCallback, useRef } from "react";

/**
 * Hook untuk memainkan notification sound saat ada pesan baru.
 * Menggunakan Web Audio API untuk generate sound tanpa file external.
 */
export function useNotificationSound() {
  const audioCtxRef = useRef(null);
  const lastPlayRef = useRef(0);

  const play = useCallback(() => {
    // Throttle: max 1 sound per 2 seconds
    const now = Date.now();
    if (now - lastPlayRef.current < 2000) return;
    lastPlayRef.current = now;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant notification tone
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.05); // C#6
      oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.1); // E6

      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (err) {
      // Silently fail - audio not critical
    }
  }, []);

  return play;
}
