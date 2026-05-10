import { invoke } from "@tauri-apps/api/core";
import { open as openPath } from "@tauri-apps/plugin-shell";

/**
 * Front-end wrapper around the Tauri billing commands. Pure passthrough —
 * no business logic, no caching. The Rust side owns the trust boundary;
 * this file just types the IPC surface so the components stay strict.
 *
 * Pricing model (post-beta): €15/mo recurring subscription. Beta is
 * free, so until the cohort flips, every read here resolves to
 * `null` (no Stripe record) and the UI stays on the free tier.
 *
 * The Stripe price ID comes from `import.meta.env.VITE_STRIPE_PRICE_PRO`
 * so a single binary can ship against test or live SKUs without a
 * source change. See `.planning/STRIPE.md`.
 */

/** Stripe-style status strings, mirrored 1:1 from the API. The
 *  `unknown` variant is a frontend-only fallback when the backend
 *  returns a status we don't have a UI mapping for yet. */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid"
  | "free"
  | "unknown";

/** DTO mirrored from `lib.rs::SubscriptionDto`. camelCase by serde. */
export interface SubscriptionDto {
  status: string;
  plan: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
}

/** Default Stripe price ID. Override at build time with
 *  `VITE_STRIPE_PRICE_PRO` — see `.planning/STRIPE.md`. The
 *  placeholder will fail Stripe's validation so the user sees a clear
 *  error instead of a silent no-op. */
export const STRIPE_PRICE_PRO: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_STRIPE_PRICE_PRO ?? "price_test_PLACEHOLDER";

/** Kick off a Checkout Session and pop the Stripe-hosted page in the
 *  user's default browser via `tauri-plugin-shell`. The session URL is
 *  ephemeral (a few minutes); we don't persist it. */
export async function createCheckout(
  customerEmail: string,
  priceId: string = STRIPE_PRICE_PRO,
): Promise<string> {
  const url = await invoke<string>("billing_create_checkout", {
    customerEmail,
    priceId,
  });
  await openPath(url);
  return url;
}

/** Read the local Stripe mirror. `null` means "no record yet" — the
 *  UI treats that as the free tier without surfacing an error. */
export async function getSubscription(): Promise<SubscriptionDto | null> {
  return invoke<SubscriptionDto | null>("billing_get_subscription");
}

/** Cancel at period end. Returns once Stripe has acknowledged the
 *  cancellation flag flip — no body payload. */
export async function cancelSubscription(): Promise<void> {
  await invoke("billing_cancel");
}
