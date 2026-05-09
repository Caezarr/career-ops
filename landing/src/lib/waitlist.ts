/**
 * Waitlist submission helper — selection-form variant.
 *
 * The form captures three signals:
 *   - email (required)
 *   - target (required) — what the candidate is gunning for. Drives
 *     ICP scoring server-side; the higher the score, the earlier
 *     they get pulled out of the queue
 *   - referredBy (auto-populated from `?ref=` URL param if present)
 *
 * Wired against an env-configurable endpoint so we can swap from a
 * dev stub → Loops → custom Worker without touching the component.
 *
 * Deploy paths:
 *
 *   1. Dev stub (default when VITE_WAITLIST_ENDPOINT is empty):
 *      logs to console + simulates 600ms. Lets you test UI states.
 *
 *   2. Loops (recommended for solo launch):
 *      VITE_WAITLIST_ENDPOINT=https://app.loops.so/api/newsletter-form/<form-id>
 *      VITE_WAITLIST_FORM=loops
 *      Body goes as `application/x-www-form-urlencoded` with
 *      `email`, `userGroup` (= target), and `referredBy`.
 *
 *   3. Custom Cloudflare Worker (when ICP scoring + ref tracking is
 *      ready in M1+):
 *      VITE_WAITLIST_ENDPOINT=https://api.careeros.app/waitlist
 *      VITE_WAITLIST_FORM=json
 *      Body goes as `application/json` with full payload.
 *
 * No tracking pixel here. Career OS is a privacy-first brand — the
 * landing must hold the same line.
 */

const ENDPOINT = (import.meta.env.VITE_WAITLIST_ENDPOINT ?? "") as string;
const FORM = (import.meta.env.VITE_WAITLIST_FORM ?? "json") as "loops" | "json";

/** Closed list of target values shown in the dropdown. The strings
 *  are stable IDs (sent to the backend) — display labels live in
 *  the UI. Adding a target = add it here AND in BetaCTA's TARGETS. */
export type ApplicationTarget =
  | "consulting"
  | "ib_finance"
  | "tech"
  | "startup"
  | "career_change"
  | "other";

export interface WaitlistPayload {
  email: string;
  target: ApplicationTarget;
  referredBy?: string;
}

export class WaitlistError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "WaitlistError";
  }
}

export async function submitWaitlist(payload: WaitlistPayload): Promise<void> {
  const cleaned = payload.email.trim().toLowerCase();
  if (!isValidEmail(cleaned)) {
    throw new WaitlistError("Email invalide.");
  }

  const referredBy = payload.referredBy ?? readReferralFromUrl();

  // Dev stub — no endpoint configured.
  if (!ENDPOINT) {
    // eslint-disable-next-line no-console
    console.info("[waitlist] dev stub — would submit:", {
      email: cleaned,
      target: payload.target,
      referredBy,
    });
    await sleep(600);
    return;
  }

  try {
    let response: Response;
    if (FORM === "loops") {
      const body = new URLSearchParams();
      body.set("email", cleaned);
      body.set("userGroup", payload.target);
      if (referredBy) body.set("referredBy", referredBy);
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
    } else {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleaned,
          target: payload.target,
          referredBy,
          source: "landing",
        }),
      });
    }

    if (!response.ok) {
      throw new WaitlistError(
        `Le serveur a répondu ${response.status}. Réessaie dans une minute.`,
      );
    }
  } catch (err) {
    if (err instanceof WaitlistError) throw err;
    throw new WaitlistError("Connexion impossible. Vérifie ton réseau.", err);
  }
}

/** Generate a stable, anonymous-ish referral code from the user's
 *  email. Same email → same code. djb2 hash, base36 encoded → 7
 *  chars typically. Not cryptographically anonymous (a determined
 *  attacker can rainbow it) but good enough for an opt-in referral
 *  link the user happily shares with friends. */
export function makeReferralCode(email: string): string {
  let hash = 5381;
  const str = email.trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // ABS in case of int32 wrap, base36 to compress, slice to keep it short
  return Math.abs(hash).toString(36).slice(0, 7);
}

/** Build the full referral URL the user should share. Origin from
 *  window.location so prod / staging / preview all work. */
export function buildReferralLink(code: string): string {
  if (typeof window === "undefined") return `?ref=${code}`;
  const origin = window.location.origin;
  return `${origin}/?ref=${code}`;
}

function readReferralFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  return ref && ref.trim().length > 0 ? ref.trim() : undefined;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
