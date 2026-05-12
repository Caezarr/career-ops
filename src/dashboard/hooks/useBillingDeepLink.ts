/**
 * useBillingDeepLink — listen for `careeros://billing/success` and
 * `careeros://billing/cancel` URLs the OS routes back to the app
 * after Stripe Checkout.
 *
 * The Rust deep-link bridge (in `src-tauri/src/lib.rs`) emits ALL
 * `careeros://*` URLs on the `auth:deep-link` event channel (name
 * predates this hook — kept for backwards-compat with the auth
 * listener). We filter here by URL prefix.
 *
 * Success flow:
 *   1. User clicks "Acheter · 99€" → app opens Stripe Checkout
 *   2. User pays → Stripe redirects to `careeros://billing/success`
 *   3. OS routes URL to the app → Rust emits → this hook fires
 *   4. We refetch `/v1/billing/status` to pick up the new plan
 *   5. Toast confirms; Settings → Billing now shows the new tier
 *
 * Cancel flow:
 *   Stripe redirects to `careeros://billing/cancel` if the user
 *   bails out. We just toast "paiement annulé" — no state change.
 *
 * Mounted once at the DashboardApp root, same place as the auth
 * deep-link bridge.
 */
import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useAppStore } from "../store";
import { useToast } from "../primitives";
import { fetchBillingStatus, BillingError } from "../lib/billing";

export function useBillingDeepLink(): void {
  const hydrateBilling = useAppStore((s) => s.hydrateBilling);
  const toast = useToast();

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let cancelled = false;

    void listen<string>("auth:deep-link", async (event) => {
      const url = event.payload;
      if (typeof url !== "string") return;

      // Filter — only handle billing URLs. Auth URLs are picked up
      // by useAuthDeepLink, anything else is dropped silently.
      if (url.startsWith("careeros://billing/success")) {
        try {
          const status = await fetchBillingStatus();
          hydrateBilling({
            plan: status.plan,
            purchasedAt: status.purchasedAt,
            refundDeadlineAt: status.refundDeadlineAt,
            hasGuarantee: status.hasGuarantee,
            refundRequestedAt: status.refundRequestedAt,
            refundedAt: status.refundedAt,
          });
          // The Stripe webhook is what actually flips `plan` in D1.
          // If the webhook hasn't fired yet (rare — usually <1s), we'll
          // still be on `free` here. We retry once after 3s to handle
          // that race; if it's still free, we surface a friendly toast.
          if (status.plan === "free") {
            window.setTimeout(async () => {
              try {
                const retry = await fetchBillingStatus();
                hydrateBilling({
                  plan: retry.plan,
                  purchasedAt: retry.purchasedAt,
                  refundDeadlineAt: retry.refundDeadlineAt,
                  hasGuarantee: retry.hasGuarantee,
                  refundRequestedAt: retry.refundRequestedAt,
                  refundedAt: retry.refundedAt,
                });
                if (retry.plan !== "free") {
                  toast.success(
                    "Bienvenue dans Career OS Pro 🎉",
                    `Plan actif : ${retry.plan === "lifetime_pro" ? "Lifetime + Garantie" : "Lifetime"}.`,
                  );
                }
              } catch {
                /* silent — user can refresh manually */
              }
            }, 3000);
            toast.info(
              "Paiement validé",
              "On synchronise ton plan, ça peut prendre quelques secondes…",
            );
          } else {
            toast.success(
              "Bienvenue dans Career OS Pro 🎉",
              `Plan actif : ${status.plan === "lifetime_pro" ? "Lifetime + Garantie" : "Lifetime"}.`,
            );
          }
        } catch (err) {
          if (err instanceof BillingError) {
            toast.error("Sync impossible", err.message);
          } else {
            toast.error("Sync impossible", (err as Error).message);
          }
        }
        return;
      }

      if (url.startsWith("careeros://billing/cancel")) {
        toast.info("Paiement annulé", "Tu peux réessayer quand tu veux.");
        return;
      }
      // Anything else — not our business, drop it. useAuthDeepLink
      // handles `careeros://auth/callback`.
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
    // Mount once at boot, same pattern as useAuthDeepLink.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
