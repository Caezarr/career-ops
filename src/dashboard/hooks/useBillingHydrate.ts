import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { fetchBillingStatus, BillingError } from '../lib/billing';

/**
 * Hydrate the user's billing state from the Worker (`/v1/billing/status`).
 *
 * Runs whenever `authStatus` transitions to `signed-in`. The earlier
 * "fire once at boot" version was buggy: boot fires BEFORE the JWT
 * hydrates from the Keychain, so the first call gets 401, silently
 * skips, and the local store stays on the default `free` even when
 * the D1 truth says `lifetime`. Result: the user paid, the webhook
 * landed, but the UI still claimed Free and the next checkout call
 * rejected with `already_paid`.
 *
 * Fix: re-run on every `signed-in` transition. Cheap (1 fetch),
 * idempotent (overwrites the slice), and naturally handles the
 * "boot before auth" race.
 */
export function useBillingHydrate(): void {
  const hydrate = useAppStore((s) => s.hydrateBilling);
  const authStatus = useAppStore((s) => s.authStatus);
  const lastFetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (authStatus !== 'signed-in') return;
    // Cheap dedup — don't refetch on every render if auth status
    // bounces between unknown→signed-in (HMR + dev double-mount).
    if (lastFetchedForRef.current === 'signed-in') return;
    lastFetchedForRef.current = 'signed-in';

    let cancelled = false;
    (async () => {
      try {
        const s = await fetchBillingStatus();
        if (cancelled) return;
        hydrate({
          plan: s.plan,
          purchasedAt: s.purchasedAt,
          refundDeadlineAt: s.refundDeadlineAt,
          hasGuarantee: s.hasGuarantee,
          refundRequestedAt: s.refundRequestedAt,
          refundedAt: s.refundedAt,
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof BillingError && err.kind !== 'no_auth') {
          // eslint-disable-next-line no-console
          console.debug('[billing] hydrate skipped:', err.message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus, hydrate]);
}
