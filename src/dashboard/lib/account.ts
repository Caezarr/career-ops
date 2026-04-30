/**
 * Account-level actions — wipe local data, sign out, delete account.
 *
 *  Career OS doesn't yet have a remote account back-end. Today these
 *  helpers operate locally only. The hooks are placed behind a stable
 *  surface so the Settings UI doesn't change when authentication +
 *  Stripe land:
 *
 *    - wipeLocalData()  — purges the Zustand persist payload + every
 *                         relevant cached blob (atsByCv, audio, prefs,
 *                         analyses, etc.) and reloads the dashboard
 *                         window so every slice re-seeds from defaults.
 *    - deleteAccount()  — orchestrates wipe + (future) DELETE /api/me
 *                         call. The remote call short-circuits today.
 *    - signOut()        — placeholder; sign-in/out flow is future work.
 *
 *  All actions are async so the UI can show a spinner. */

const PERSIST_KEY = 'career-os-store';

/**
 * Hard reset all locally persisted state. Removes the Zustand persist
 * blob from localStorage and reloads the window so every slice starts
 * fresh. Returns once the localStorage write has resolved.
 *
 * We deliberately reload rather than calling a per-slice reset() —
 * a full reload guarantees no stale subscriber cache, no in-flight
 * fetch hangs around, and the user sees the equivalent of a fresh
 * install. */
export async function wipeLocalData(): Promise<void> {
  try {
    localStorage.removeItem(PERSIST_KEY);
    // Some legacy sessions may have written a copilot-overlay key — wipe
    // it too so the overlay window's UI also resets on next launch.
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('career-os-')) localStorage.removeItem(k);
    });
  } catch {
    // localStorage can throw in private mode / quota — but at this point
    // the user is already destroying their state so failures here are
    // recoverable on next launch.
  }
  // Yield so the toast that triggered this action gets a chance to
  // render before we tear down the window.
  await new Promise((r) => setTimeout(r, 250));
  window.location.reload();
}

/**
 * End-to-end account deletion. Today this is just `wipeLocalData()` —
 * once we ship auth, prepend a `DELETE /api/me` call and only proceed
 * to the local wipe when the back-end confirms.
 *
 *  TODO(account):
 *    1. await fetch("/api/me", { method: "DELETE", credentials: "include" });
 *    2. if 401/403 → toast.error("Re-authenticate to delete your account");
 *    3. otherwise → wipeLocalData() to clear the cached profile.
 */
export async function deleteAccount(): Promise<void> {
  // Local-only path (today's reality).
  await wipeLocalData();
}

/** Placeholder for future sign-out — there is no session to clear yet. */
export async function signOut(): Promise<void> {
  // TODO(account): clear refresh tokens, hit POST /api/auth/sign-out.
  await wipeLocalData();
}
