import { useEffect } from 'react';
import { useAppStore } from '../store';

/**
 * Reflect the user's theme preference onto the document root so CSS
 * tokens swap globally.
 *
 *  - theme="light" → html[data-theme="light"]
 *  - theme="dark"  → html[data-theme="dark"]
 *  - theme="system" → no attribute; tokens.css falls through to
 *                     `prefers-color-scheme: dark` media query
 *
 * Mount this once near the root of the dashboard window. It re-applies
 * whenever the theme changes.
 */
export function useApplyAppearance() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);
}
