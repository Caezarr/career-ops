import { useEffect } from 'react';
import { useAppStore } from '../store';

/**
 * Reflect the user's appearance preferences (theme / fontSize / accent)
 * onto the document root so CSS tokens swap globally.
 *
 *  - theme="light" → html[data-theme="light"]
 *  - theme="dark"  → html[data-theme="dark"]
 *  - theme="system" → no attribute; tokens.css falls through to
 *                     `prefers-color-scheme: dark` media query
 *
 *  - accent goes on html[data-accent]
 *  - fontSize goes on the dashboard-root subtree via data-density (we
 *    don't put it on <html> because the Copilot overlay window has its
 *    own typography scale).
 *
 * Mount this once near the root of the dashboard window. It re-applies
 * whenever the slice changes and tears down its prefers-color-scheme
 * listener on unmount.
 */
export function useApplyAppearance() {
  const theme = useAppStore((s) => s.theme);
  const fontSize = useAppStore((s) => s.fontSize);
  const accent = useAppStore((s) => s.accent);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    if (accent === 'indigo') {
      // Indigo is the default — keep <html> clean rather than tagging it.
      root.removeAttribute('data-accent');
    } else {
      root.setAttribute('data-accent', accent);
    }
    // density density on .dashboard-root — pick the first match in case the
    // page has more than one root (Copilot overlay opens in a separate
    // window so this should always be exactly one in the dashboard window).
    const dashboards = document.querySelectorAll<HTMLElement>('.dashboard-root');
    dashboards.forEach((el) => el.setAttribute('data-density', fontSize));
  }, [theme, accent, fontSize]);
}
