import { useEffect } from "react";

/**
 * Hook untuk auto-resize textarea berdasarkan konten.
 * Textarea akan grow/shrink sesuai jumlah baris text.
 */
export function useAutoResize(ref, value) {
  useEffect(() => {
    const el = ref?.current;
    if (!el) return;

    // Reset height to auto to get correct scrollHeight
    el.style.height = "auto";
    // Set to scrollHeight (capped by max-height in CSS)
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [ref, value]);
}
