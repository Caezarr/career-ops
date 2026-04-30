import { open as openPath } from '@tauri-apps/plugin-shell';

/**
 * Stripe-side stubs the Settings → Billing card calls into.
 *
 *  Today this opens a placeholder URL because we don't have a back-end
 *  or finalised pricing. When the real Stripe integration ships,
 *  replace the implementation with the documented call to our future
 *  `/api/billing/*` endpoints — the call signature stays identical so
 *  no UI change is needed.
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
 *  None of this is online yet — everything below short-circuits to a
 *  marketing page with a clear "coming soon" notice. Plan checkout +
 *  comparison have been removed from the UI until pricing is locked. */

/** Replaced once we have a billing back-end. */
const BILLING_LANDING_URL = 'https://career-os.app/billing';

export async function openCustomerPortal(): Promise<void> {
  // TODO(stripe): POST /api/billing/portal-session → { url }
  await openPath(`${BILLING_LANDING_URL}?intent=manage`);
}
