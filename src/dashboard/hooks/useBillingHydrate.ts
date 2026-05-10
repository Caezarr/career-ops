import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { getSubscription } from '../lib/billing';
import type { SubscriptionStatus } from '../store/slices/billing';

/**
 * Boot-time hydration for the post-beta Stripe subscription.
 *
 *   1. Call `billing_get_subscription` once on mount.
 *   2. If the backend returns a row, copy its status / period_end /
 *      cancel flag into the store. The Settings → Billing tab paints
 *      from the slice immediately.
 *   3. If there's no row (or the call fails — common during the beta
 *      because no Stripe key is configured), leave the slice on its
 *      default `free` state. This is NOT an error worth surfacing —
 *      the free tier is a valid state.
 *
 * Mounted once at the DashboardApp root, alongside the other boot
 * hooks (`useSeedIngestSources` etc.).
 */
export function useBillingHydrate(): void {
  const hydrate = useAppStore((s) => s.hydrate);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const sub = await getSubscription();
        if (cancelled) return;
        if (!sub) {
          // No local Stripe record — stay on free, no error.
          return;
        }
        // Stripe's status vocabulary maps 1:1 except `canceled` (US
        // spelling) → `cancelled` (our internal). Anything else falls
        // back to `unknown` so the UI doesn't crash on a future
        // status string.
        const status: SubscriptionStatus =
          sub.status === 'canceled'
            ? 'cancelled'
            : isKnownStatus(sub.status)
              ? (sub.status as SubscriptionStatus)
              : 'unknown';
        hydrate(status, sub.currentPeriodEnd, sub.cancelAtPeriodEnd);
      } catch (err) {
        // Beta cohort: Stripe key isn't set, so the call returns
        // "Stripe non configuré". That's expected — silently swallow.
        // Real errors surface from the Billing tab on demand.
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.debug('[billing] hydrate skipped:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrate]);
}

const KNOWN_STATUSES: ReadonlySet<string> = new Set([
  'active',
  'trialing',
  'past_due',
  'cancelled',
  'free',
]);

function isKnownStatus(s: string): boolean {
  return KNOWN_STATUSES.has(s);
}
