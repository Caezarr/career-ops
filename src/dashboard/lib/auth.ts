/**
 * Auth bridge — Career OS Worker (Phase 1B).
 *
 * Phase 1A landed the Worker (Hono + D1) with three endpoints:
 *
 *   POST /auth/request          — body `{ email }`, mints a magic link
 *   GET  /auth/verify?token=…   — consumes the link, signs a JWT, then
 *                                  302s the browser to
 *                                  `careeros://auth/callback#jwt=…`
 *   GET  /me                    — Bearer-JWT-gated; returns the user
 *                                  profile + license status
 *
 * This module is the desktop-side surface for all three. The JWT
 * lives in the macOS Keychain (`secrets::SecretSlot::AuthJwt`,
 * account `secret.auth_jwt`) — never in localStorage. The deep-link
 * hook (`useAuthDeepLink`) is what actually receives the JWT after
 * verify; everything in this file is plain HTTP.
 *
 * Anti-bot: the magic link is the anti-bot — a bot that submits a
 * random email never receives the verification link, so the flow
 * can't complete without a real inbox.
 */
import { invoke } from "@tauri-apps/api/core";

/**
 * Resolved at build time. Defaults to the production Worker so a
 * stock `pnpm tauri build` ships against the deployed back-end. For
 * local dev set `VITE_API_BASE_URL=http://localhost:8787` (see
 * `.planning/AUTH.md` §4).
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/+$/,
    "",
  ) || "https://api.careeros.app";

const JWT_SLOT = "auth_jwt" as const;

// ── Types ────────────────────────────────────────────────────────────

/** License status returned by `/me`. Mirrors `worker/src/routes/me.ts`. */
export type LicenseStatus = "free" | "trialing" | "active" | "past_due" | "canceled";

export interface MeResponse {
  id: string;
  email: string;
  license: {
    status: LicenseStatus;
    currentPeriodEnd: number | null;
  };
  createdAt: number;
  lastLoginAt: number | null;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ── JWT (Keychain) ───────────────────────────────────────────────────

/**
 * Read the stored JWT from the macOS Keychain. Returns `null` when
 * unset (= signed out). We deliberately bypass the in-memory secrets
 * cache (`lib/secrets.ts`) — the JWT is read maybe twice per session
 * (boot + first /me) and we'd rather take the Keychain hit than risk
 * the cache going stale across sign-in/sign-out cycles.
 */
export async function readJwt(): Promise<string | null> {
  const v = await invoke<string | null>("secrets_get", { name: JWT_SLOT });
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Persist the JWT after a successful magic-link verify. */
export async function writeJwt(jwt: string): Promise<void> {
  await invoke("secrets_set", { name: JWT_SLOT, value: jwt });
}

/** Clear the JWT (sign-out). Idempotent — clearing an empty slot is OK. */
export async function clearJwt(): Promise<void> {
  await invoke("secrets_set", { name: JWT_SLOT, value: "" });
}

// ── HTTP wrappers ────────────────────────────────────────────────────

/**
 * POST /auth/request — kick off the magic-link flow. The Worker
 * always returns `{ ok: true }` regardless of whether the email is
 * known (anti-enumeration), so a non-error here just means "email
 * dispatched if the address was valid". Surfacing 429 / 5xx so the
 * UI can tell the user to retry.
 */
export async function requestMagicLink(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) throw new AuthError("Email vide", 400);

  const res = await fetch(`${API_BASE_URL}/auth/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: trimmed }),
  });

  if (!res.ok) {
    // 429 = rate-limited at the Cloudflare edge; 5xx = Worker down /
    // Loops outage. Both surface the same way to the user — the UI
    // shows a generic "réessaye dans une minute" toast.
    throw new AuthError(`Worker ${res.status}`, res.status);
  }
}

/**
 * GET /me — JWT-gated. Returns the current user profile or null
 * if the JWT is missing / invalid / expired. We treat 401 as "needs
 * re-auth" and clear the stored JWT to keep the local state honest.
 */
export async function fetchMe(): Promise<MeResponse | null> {
  const jwt = await readJwt();
  if (!jwt) return null;

  const res = await fetch(`${API_BASE_URL}/me`, {
    headers: { authorization: `Bearer ${jwt}` },
  });

  if (res.status === 401 || res.status === 403) {
    // Stale token — clear so the UI flips to signed-out. We don't
    // throw because the caller (boot hydration, settings refresh)
    // wants a clean null-or-data signal.
    await clearJwt();
    return null;
  }
  if (!res.ok) {
    throw new AuthError(`Worker ${res.status}`, res.status);
  }
  return (await res.json()) as MeResponse;
}

// ── Deep-link parsing ────────────────────────────────────────────────

/**
 * Pull a JWT out of a `careeros://auth/callback#jwt=…` deep link.
 * The JWT lives in the URL fragment (after `#`) so it never reaches
 * the Worker logs / browser history as a query string. Returns
 * `null` when the URL doesn't match the expected shape — cheap
 * defence against the OS routing us an unrelated `careeros://` URL.
 */
export function parseDeepLink(url: string): string | null {
  // URL parsing on custom schemes is consistent across modern
  // browsers / Tauri's webview; no manual splitting needed.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "careeros:") return null;
  // Hosts on custom schemes vary by platform. Accept any path that
  // ends in `/auth/callback` — the only thing we actually trust is
  // the fragment payload.
  const pathname = parsed.pathname || "";
  const looksRight =
    pathname.endsWith("/auth/callback") ||
    pathname.endsWith("auth/callback");
  if (!looksRight) return null;

  // Fragment is `jwt=…`. URL.hash includes the leading `#`.
  const frag = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
  if (!frag) return null;
  const params = new URLSearchParams(frag);
  const jwt = params.get("jwt");
  if (!jwt) return null;
  return jwt;
}
