/**
 * useAuthDeepLink — listen for `auth:deep-link` events emitted by
 * the Rust deep-link bridge in `src-tauri/src/lib.rs`. The OS routes
 * `careeros://auth/callback#jwt=…` to the running app; the Rust
 * setup re-emits the URL string onto this event channel so we can
 * subscribe with the stock `@tauri-apps/api/event` listener (no
 * extra `@tauri-apps/plugin-deep-link` JS dep needed).
 *
 * Boot path:
 *
 *   1. App mounts → `hydrateAuth()` reads the Keychain and refreshes
 *      `/me` if a JWT is already there.
 *   2. We listen for new deep-link events. When one arrives:
 *        - parse the fragment to extract the JWT
 *        - call `completeSignIn(jwt)` on the auth slice — that
 *          persists the JWT to Keychain + fetches `/me`
 *        - toast the user so the sign-in feels acknowledged.
 *   3. On unmount, drop the listener (HMR-safe).
 *
 * We mount this from `DashboardApp` (single root component) so the
 * listener is global. Mounting per-route would risk missing the
 * event if the user is mid-navigation when the deep-link arrives.
 */
import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useAppStore } from "../store";
import { useToast } from "../primitives";
import { parseDeepLink } from "../lib/auth";

export function useAuthDeepLink(): void {
  const completeSignIn = useAppStore((s) => s.completeSignIn);
  const hydrateAuth = useAppStore((s) => s.hydrateAuth);
  const toast = useToast();

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let cancelled = false;

    // Boot hydration — derives `signed-in` / `signed-out` from the
    // Keychain. Fire-and-forget; the slice tracks status itself.
    void hydrateAuth();

    void listen<string>("auth:deep-link", async (event) => {
      const url = event.payload;
      if (typeof url !== "string") return;
      const jwt = parseDeepLink(url);
      if (!jwt) {
        // The OS routed us a `careeros://` URL we don't recognise —
        // ignore. Could happen if a future feature uses the same
        // scheme for something else.
        // eslint-disable-next-line no-console
        console.warn("[auth] ignoring deep-link without JWT:", url);
        return;
      }
      await completeSignIn(jwt);
      toast.success("Connecté à Career OS.");
    }).then((fn) => {
      if (cancelled) {
        // Mount → unmount race during HMR. Drop the freshly-bound
        // listener immediately so we don't double-fire.
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
    // We only want this to mount once at app boot — not re-bind on
    // every store-driven re-render. Slice action references are
    // stable across renders so a single bind is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
