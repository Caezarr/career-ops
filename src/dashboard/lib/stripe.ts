import { open as openPath } from '@tauri-apps/plugin-shell';
import type { BillingPlan } from '../store/slices/billing';

/**
 * Stripe-side stubs the Settings → Billing card calls into.
 *
 *  Today these open a placeholder URL because we don't have a back-end.
 *  When the real Stripe integration ships, replace each implementation
 *  with the documented call to our future `/api/billing/*` endpoints —
 *  the call-site signatures stay identical so no UI change is needed.
 *
 *  Architecture target:
 *
 *    1. Frontend calls `openCustomerPortal()`.
 *    2. Backend (`POST /api/billing/portal-session`) creates a Stripe
 *       Customer Portal session for the authenticated user
 *       (`stripe.billingPortal.sessions.create({ customer, return_url })`).
 *    3. Backend returns `{ url }`.
 *    4. Frontend opens `url` via Tauri's shell plugin.
 *
 *  Same pattern for checkout: backend creates a Checkout Session for
 *  the picked plan + cycle, frontend opens the returned URL.
 *
 *  None of this is online yet — everything below short-circuits to a
 *  marketing page with a clear "coming soon" notice. */

/** Replaced once we have a billing back-end. */
const BILLING_LANDING_URL = 'https://career-os.app/billing';

export async function openCustomerPortal(): Promise<void> {
  // TODO(stripe): POST /api/billing/portal-session → { url }
  await openPath(`${BILLING_LANDING_URL}?intent=manage`);
}

export async function startCheckout(
  plan: Exclude<BillingPlan, 'free' | 'enterprise'>,
  cycle: 'monthly' | 'annual',
): Promise<void> {
  // TODO(stripe): POST /api/billing/checkout-session { plan, cycle } → { url }
  await openPath(`${BILLING_LANDING_URL}?intent=upgrade&plan=${plan}&cycle=${cycle}`);
}

export async function contactSales(): Promise<void> {
  // Enterprise — real plan is direct sales, not self-serve checkout.
  await openPath('https://career-os.app/enterprise');
}
