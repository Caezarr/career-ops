/**
 * `useReveal` — IntersectionObserver-driven fade-in for scroll-triggered
 * animations. Returns a ref + a boolean. Stick the ref on the element
 * you want to animate; the boolean flips to `true` the first time the
 * element crosses the viewport threshold and stays true forever
 * after (one-shot animation, no flicker on scroll-back).
 *
 * Usage:
 *   const { ref, shown } = useReveal();
 *   <section ref={ref} className={shown ? "reveal reveal--shown" : "reveal"}>
 *
 * The CSS lives in landing.css under `.reveal`.
 */
import { useEffect, useRef, useState } from "react";

export interface UseRevealOptions {
  /** When the element should be considered "in view", as a 0..1
   *  fraction of its height visible. Default 0.15 = 15% visible. */
  threshold?: number;
  /** Pixel margin around the viewport — negative shrinks the
   *  trigger (fires later), positive enlarges (fires earlier).
   *  Default "0px 0px -80px 0px" = fires when the top is 80px
   *  before the actual viewport bottom. */
  rootMargin?: string;
}

export function useReveal<T extends HTMLElement = HTMLElement>(
  options: UseRevealOptions = {},
): { ref: React.RefObject<T | null>; shown: boolean } {
  const { threshold = 0.15, rootMargin = "0px 0px -80px 0px" } = options;
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respect reduced-motion users by skipping straight to "shown".
    if (typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  return { ref, shown };
}
