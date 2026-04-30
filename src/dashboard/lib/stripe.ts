import { open as openPath } from '@tauri-apps/plugin-shell';
import type { BillingPlan } from '../store/slices/billing';

/**
 * Stripe stubs that the Settings → Billing card calls into.
 *
 *  Pricing model: one-shot Sprint payments.
 *    - Sprint:     €99      (single line item)
 *    - Sprint Pro: €148     (Sprint €99 + Guarantee add-on €49)
 *
 *  These open a placeholder URL today because we don't have a back-end.
 *  When the real Stripe integration ships, replace each implementation
 *  with the documented call to our future `/api/billing/*` endpoints —
 *  the call signatures stay identical so no UI change is needed.
 *
 *  Architecture target:
 *
 *    Sprint checkout
 *      1. Frontend calls `startCheckout('sprint')`.
 *      2. Backend (`POST /api/billing/checkout-session`) creates a
 *         Stripe Checkout Session in `payment` mode (one-shot, NOT
 *         subscription) with the Sprint price as a line item.
 *      3. Backend returns `{ url }`. Frontend opens it via Tauri's
 *         shell plugin.
 *
 *    Sprint Pro checkout
 *      Same as Sprint, but with TWO line items: Sprint €99 +
 *      Guarantee add-on €49. Treating them as separate SKUs makes
 *      revenue accounting cleaner and lets us refund the guarantee
 *      independently if needed.
 *
 *    Customer portal
 *      Stripe's Billing Portal is geared towards subscriptions, but
 *      it works for one-shot payments too — users can download
 *      receipts and update saved payment methods. Backend calls
 *      `stripe.billingPortal.sessions.create({ customer, return_url })`.
 *
 *  None of this is online yet — everything below short-circuits to a
 *  marketing page with a clear "coming soon" notice. */

/** Replaced once we have a billing back-end. */
const BILLING_LANDING_URL = 'https://career-os.app/billing';

/** Open the Stripe Customer Portal so the user can review their
 *  payment, download invoices, or update their card. */
export async function openCustomerPortal(): Promise<void> {
  // TODO(stripe): POST /api/billing/portal-session → { url }
  await openPath(`${BILLING_LANDING_URL}?intent=manage`);
}

/** Kick off a Sprint or Sprint Pro purchase. The plan id picks the
 *  Stripe price(s); cycle / interval is irrelevant since these are
 *  one-shot payments. */
export async function startCheckout(
  plan: Exclude<BillingPlan, 'free'>,
): Promise<void> {
  // TODO(stripe): POST /api/billing/checkout-session { plan } → { url }
  // The backend builds the line items: just Sprint, or Sprint + Guarantee.
  await openPath(`${BILLING_LANDING_URL}?intent=checkout&plan=${plan}`);
}
