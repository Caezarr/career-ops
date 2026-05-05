import { useEffect } from "react";
import { subscribeJobTeaserAuth } from "../lib/jobteaser";

/**
 * Mount once per dashboard window. Listens for the
 * `jobteaser-auth-complete` Tauri event emitted by the Rust handler
 * after a successful SSO roundtrip, and inserts the IngestSource row
 * (or clears the lastError on an existing row).
 *
 * No state of our own — `subscribeJobTeaserAuth` already coordinates
 * with the Zustand store directly.
 */
export function useJobTeaserAuthListener(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const off = await subscribeJobTeaserAuth();
        if (cancelled) {
          off();
        } else {
          unlisten = off;
        }
      } catch (e) {
        console.warn("Failed to mount Job Teaser auth listener:", e);
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}
