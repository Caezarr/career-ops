/**
 * Auth slice (Phase 1B). Tracks the magic-link sign-in state.
 *
 * Why a slice rather than just `lib/auth.ts` direct calls?
 *  - Settings → Account needs reactive subscription so the UI flips
 *    instantly when sign-in completes (deep-link arrives) without
 *    a manual refresh.
 *  - The header badge / billing card both want the same `email +
 *    license` view; a single slice keeps that consistent.
 *
 * What we deliberately DON'T persist:
 *  - The JWT itself — that lives in the macOS Keychain only
 *    (`secret.auth_jwt`). The slice only mirrors *whether* a session
 *    exists + the resolved profile. On reload, `hydrateAuth()`
 *    re-derives state from the Keychain + a `/me` call.
 *  - Last-sync timestamps / token expiry — derived from the JWT
 *    itself, no point caching.
 *
 * State machine:
 *
 *     unknown ─(boot)──► signed-out
 *                       │
 *                       │ requestMagicLink()
 *                       ▼
 *                    requesting ─(success)─► awaiting-link
 *                       │                         │
 *                       │                  (deep-link arrives)
 *                       │                         ▼
 *                       │                     signed-in
 *                       │                         │
 *                       └──── signOut() ◄─────────┘
 */
import type { StateCreator } from "zustand";
import {
  AuthError,
  clearJwt,
  fetchMe,
  readJwt,
  requestMagicLink,
  writeJwt,
  type LicenseStatus,
  type MeResponse,
} from "../../lib/auth";

export type AuthStatus =
  | "unknown" // Pre-hydration — UI should show a spinner
  | "signed-out" // No JWT in the Keychain
  | "requesting" // POST /auth/request in flight
  | "awaiting-link" // Email sent; waiting for the deep link to come back
  | "signed-in" // /me responded OK; `me` is populated
  | "error"; // Transient — UI shows the message + a retry button

export interface AuthSlice {
  authStatus: AuthStatus;
  /** Set during `requesting` so the UI can echo back the address. */
  authPendingEmail: string | null;
  /** Last error message (HTTP failure, Worker down, etc.). */
  authError: string | null;
  /** Profile + license. Null until `signed-in`. */
  me: MeResponse | null;

  /** Boot path — re-derive state from Keychain + /me on app load. */
  hydrateAuth: () => Promise<void>;
  /** UI calls this from the AccountTab "Send link" button. */
  requestMagicLinkAction: (email: string) => Promise<void>;
  /** Called by the deep-link hook after a successful verify. */
  completeSignIn: (jwt: string) => Promise<void>;
  /** Sign-out — clears the Keychain JWT + resets the slice. */
  signOutAction: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => ({
  authStatus: "unknown",
  authPendingEmail: null,
  authError: null,
  me: null,

  hydrateAuth: async () => {
    try {
      const jwt = await readJwt();
      if (!jwt) {
        set({ authStatus: "signed-out", me: null });
        return;
      }
      // /me will clear the JWT itself on 401 — we just need to read
      // the result and mirror.
      const profile = await fetchMe();
      if (!profile) {
        set({ authStatus: "signed-out", me: null });
        return;
      }
      set({ authStatus: "signed-in", me: profile, authError: null });
    } catch (e) {
      // Network failure during hydration — leave UI as "unknown" so
      // the AccountTab can render a friendly retry, but log so dev
      // mode catches it.
      // eslint-disable-next-line no-console
      console.warn("[auth] hydrate failed:", e);
      set({
        authStatus: "error",
        authError:
          e instanceof Error ? e.message : "Connexion au serveur impossible",
      });
    }
  },

  requestMagicLinkAction: async (email) => {
    const trimmed = email.trim();
    set({
      authStatus: "requesting",
      authPendingEmail: trimmed,
      authError: null,
    });
    try {
      await requestMagicLink(trimmed);
      set({ authStatus: "awaiting-link" });
    } catch (e) {
      const msg =
        e instanceof AuthError
          ? `Le serveur a répondu ${e.status}. Réessaye dans une minute.`
          : e instanceof Error
            ? e.message
            : "Erreur inconnue";
      set({ authStatus: "error", authError: msg, authPendingEmail: null });
    }
  },

  completeSignIn: async (jwt) => {
    try {
      await writeJwt(jwt);
      const profile = await fetchMe();
      if (!profile) {
        // /me returned 401 immediately after we stored the JWT —
        // means the Worker rejected our own freshly-signed token.
        // Surface as error rather than silently bouncing back to
        // signed-out (that would mask a real bug).
        set({
          authStatus: "error",
          authError: "Le serveur a refusé le jeton. Réessaye le sign-in.",
          authPendingEmail: null,
          me: null,
        });
        return;
      }
      set({
        authStatus: "signed-in",
        me: profile,
        authPendingEmail: null,
        authError: null,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[auth] completeSignIn failed:", e);
      set({
        authStatus: "error",
        authError:
          e instanceof Error ? e.message : "Impossible de finaliser la connexion",
        authPendingEmail: null,
      });
    }
  },

  signOutAction: async () => {
    try {
      await clearJwt();
    } catch (e) {
      // Even if the Keychain delete fails, flip the UI state — the
      // remote token still expires server-side eventually, and the
      // user pressed "Sign out" so the local intent is clear.
      // eslint-disable-next-line no-console
      console.warn("[auth] clearJwt failed:", e);
    }
    set({
      authStatus: "signed-out",
      me: null,
      authPendingEmail: null,
      authError: null,
    });
    // Make sure no stale getter capture lingers — access `get` to
    // satisfy TS strict-rules without bloating the hook surface.
    void get;
  },
});

// Re-export the LicenseStatus type so consumers can import it from
// the slice barrel (settings cards already pull from store/slices).
export type { LicenseStatus };
