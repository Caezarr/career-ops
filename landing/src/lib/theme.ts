/**
 * Theme system — light + dark + system preference.
 *
 * Order of precedence on first paint:
 *   1. localStorage value (user explicitly toggled before)
 *   2. `prefers-color-scheme` media query (system setting)
 *   3. Fallback to dark (the brand default)
 *
 * The actual swap happens by setting `data-theme` on <html>. The
 * tokens.css file maps the attribute to the right palette; nothing
 * else needs to know about themes.
 *
 * To avoid a flash-of-wrong-theme on first load, the resolution
 * runs synchronously in a tiny inline script in index.html BEFORE
 * the React bundle hydrates. The hook here only handles user
 * toggles after hydration.
 */
import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "careeros-theme";

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* Storage may be blocked (private mode) — graceful */
    }
  }, [theme]);

  // Sync with system pref changes ONLY when the user hasn't made an
  // explicit choice (i.e. nothing in localStorage). Once they toggle
  // we respect their choice forever.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? "light" : "dark");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}
