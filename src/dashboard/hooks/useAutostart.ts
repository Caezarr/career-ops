import { useEffect, useRef } from 'react';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { useAppStore } from '../store';

/**
 * Reflect the user's "Start on login" preference onto the OS LaunchAgent
 * managed by tauri-plugin-autostart.
 *
 *  - On first mount, sync the OS state into our local flag so a previous
 *    install survives a reset of the persisted store.
 *  - On every flag change, reconcile: if the flag says ON and the OS says
 *    OFF, call enable(); the inverse calls disable(). Identical state is
 *    a no-op.
 *
 * The plugin is async; we ignore errors silently (logged to console) so a
 * failed reconcile doesn't crash the dashboard. The next toggle retries.
 */
export function useAutostart() {
  const enabled = useAppStore((s) => s.preferences.startOnLogin);
  const setPreference = useAppStore((s) => s.setPreference);
  const didInitialSync = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const osEnabled = await isEnabled();
        // First mount: align the local flag to OS truth without re-writing
        // the LaunchAgent. A user who deleted the agent in System Settings
        // shouldn't see "Start on login" stuck ON.
        if (!didInitialSync.current) {
          didInitialSync.current = true;
          if (cancelled) return;
          if (osEnabled !== enabled) {
            setPreference('startOnLogin', osEnabled);
          }
          return;
        }
        if (cancelled) return;
        if (enabled && !osEnabled) await enable();
        else if (!enabled && osEnabled) await disable();
      } catch (e) {
        // Silent fail — the plugin throws on permission issues. Surface
        // through a toast next time we wire one in.
        console.warn('[autostart] reconcile failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, setPreference]);
}
