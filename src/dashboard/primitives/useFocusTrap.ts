import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    lastFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    const container = containerRef.current;
    if (!container) return;

    // Auto-focus first focusable element.
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables[0];
    if (first) {
      // Defer one tick so animations settle.
      window.setTimeout(() => first.focus(), 0);
    } else {
      container.setAttribute("tabindex", "-1");
      window.setTimeout(() => container.focus(), 0);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab" || !container) return;
      const f = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("data-focus-trap-skip"));
      if (f.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = f[0];
      const lastEl = f[f.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Restore focus to the previously focused element.
      const prev = lastFocusedRef.current;
      if (prev && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [active]);

  return containerRef;
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add("ds-no-scroll");
    return () => {
      document.body.classList.remove("ds-no-scroll");
    };
  }, [active]);
}
