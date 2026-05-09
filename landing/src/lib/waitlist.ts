/**
 * Waitlist submission helper.
 *
 * Wired against an env-configurable endpoint so we can swap from a
 * dev stub → Loops → Resend → custom Worker without touching the
 * component. The component only sees `submitWaitlist(email)`.
 *
 * Three deploy paths:
 *
 *   1. Dev stub (default when VITE_WAITLIST_ENDPOINT is empty):
 *      logs to console + simulates a 600ms latency. Lets you test
 *      the UI states (loading / success / error) without a backend.
 *
 *   2. Loops (recommended for solo / FR launch):
 *      VITE_WAITLIST_ENDPOINT=https://app.loops.so/api/newsletter-form/<form-id>
 *      VITE_WAITLIST_FORM=loops
 *      Then the body goes as
 *      `application/x-www-form-urlencoded` with `email=` + a `userGroup`.
 *
 *   3. Custom Cloudflare Worker:
 *      VITE_WAITLIST_ENDPOINT=https://api.careeros.app/waitlist
 *      VITE_WAITLIST_FORM=json
 *      Body goes as `application/json` with `{ email }`. Worker handles
 *      validation + Loops/Resend/Postgres sink + ICP scoring.
 *
 * No tracking pixel here. Career OS is a privacy-first brand — the
 * landing must hold the same line.
 */

const ENDPOINT = (import.meta.env.VITE_WAITLIST_ENDPOINT ?? "") as string;
const FORM = (import.meta.env.VITE_WAITLIST_FORM ?? "json") as "loops" | "json";

export class WaitlistError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "WaitlistError";
  }
}

export async function submitWaitlist(email: string): Promise<void> {
  const cleaned = email.trim().toLowerCase();
  if (!isValidEmail(cleaned)) {
    throw new WaitlistError("Email invalide.");
  }

  // Dev stub — no endpoint configured.
  if (!ENDPOINT) {
    // eslint-disable-next-line no-console
    console.info("[waitlist] dev stub — would submit:", cleaned);
    await sleep(600);
    return;
  }

  try {
    let response: Response;
    if (FORM === "loops") {
      const body = new URLSearchParams();
      body.set("email", cleaned);
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
    } else {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleaned, source: "landing" }),
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

function isValidEmail(value: string): boolean {
  // Pragmatic check — RFC-perfect is overkill, this catches typos.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
