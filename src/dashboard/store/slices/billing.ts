import type { StateCreator } from 'zustand';

/** Career OS pricing model — one-time lifetime payments, no
 *  subscription.
 *
 *    free          — €0, beta access, capped local usage.
 *    lifetime      — €99 one-time, lifetime access, NO guarantee.
 *    lifetime_pro  — €149 one-time, lifetime access, 180-day
 *                    result guarantee (refund if 0 interview after
 *                    ≥30 candidatures tracked).
 *
 *  Server-side (Cloudflare Worker + D1) is the source of truth. This
 *  slice mirrors what `/v1/billing/status` returns so the UI paints
 *  instantly on cold start while the boot hook re-hydrates from the
 *  Worker. */
export type Plan = 'free' | 'lifetime' | 'lifetime_pro';

/** Per-plan caps surfaced as progress bars in the Settings → Billing
 *  card. `Infinity` renders as "Unlimited". The Worker enforces the
 *  same caps server-side; this is just for the UI hint. */
export interface PlanLimits {
  cvVariants: number;
  atsAnalysesLifetime: number;
  optimizationsLifetime: number;
  applicationsTracked: number;
  /** Live Copilot minutes per calendar month. Both paid tiers are
   *  unlimited; free is capped at 30. */
  copilotMinutesPerMonth: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    cvVariants: 3,
    atsAnalysesLifetime: 10,
    optimizationsLifetime: 5,
    applicationsTracked: 25,
    copilotMinutesPerMonth: 30,
  },
  lifetime: {
    cvVariants: Infinity,
    atsAnalysesLifetime: Infinity,
    optimizationsLifetime: Infinity,
    applicationsTracked: Infinity,
    copilotMinutesPerMonth: Infinity,
  },
  // Same caps as lifetime — the differentiator is the guarantee, not
  // bigger limits.
  lifetime_pro: {
    cvVariants: Infinity,
    atsAnalysesLifetime: Infinity,
    optimizationsLifetime: Infinity,
    applicationsTracked: Infinity,
    copilotMinutesPerMonth: Infinity,
  },
};

/** Display pricing — source of truth for the 3-card comparison strip. */
export interface PlanPricing {
  label: string;
  /** Display price in EUR (0 = free). One-time, never recurring. */
  priceEur: number;
  /** Optional breakdown string under the price ("99€ + 50€ Garantie"). */
  priceBreakdown?: string;
  /** One-line tagline below the plan name. */
  tagline: string;
  /** Whether this plan includes the offer-or-refund guarantee. */
  hasGuarantee: boolean;
}

export const PLAN_PRICING: Record<Plan, PlanPricing> = {
  free: {
    label: 'Free',
    priceEur: 0,
    tagline: 'Bêta gratuite. Usage local plafonné.',
    hasGuarantee: false,
  },
  lifetime: {
    label: 'Lifetime',
    priceEur: 99,
    tagline: 'Accès complet à Career OS pour toujours. Paiement unique.',
    hasGuarantee: false,
  },
  lifetime_pro: {
    label: 'Lifetime + Garantie',
    priceEur: 149,
    priceBreakdown: 'Lifetime 99€ + Garantie 50€',
    tagline: 'Lifetime, plus la garantie : 0 entretien en 180 jours = remboursé.',
    hasGuarantee: true,
  },
};

/** Mirrors the Worker's `BillingStatus` DTO. Server is source of
 *  truth — boot hydration replaces these every time the app starts. */
export interface BillingSlice {
  plan: Plan;
  /** Unix ms of the Stripe Checkout completion event. Null on free. */
  purchasedAt: number | null;
  /** Unix ms of `purchasedAt + 180 days`. Set only for lifetime_pro. */
  refundDeadlineAt: number | null;
  hasGuarantee: boolean;
  /** Unix ms of when the user clicked "Demander un remboursement". */
  refundRequestedAt: number | null;
  /** Unix ms of when the refund was processed in Stripe. */
  refundedAt: number | null;

  /** Replace the slice in one shot after `fetchBillingStatus()`
   *  resolves. Called by `useBillingHydrate` on boot. */
  hydrateBilling: (next: {
    plan: Plan;
    purchasedAt: number | null;
    refundDeadlineAt: number | null;
    hasGuarantee: boolean;
    refundRequestedAt: number | null;
    refundedAt: number | null;
  }) => void;

  /** Local-only setter — used by the demo seed to toggle the user
   *  between free / lifetime / lifetime_pro for screenshots. Never
   *  call this from real product code — the real plan flips happen
   *  through the Stripe Checkout webhook + `hydrateBilling`. */
  setPlanLocal: (plan: Plan) => void;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REFUND_WINDOW_MS = 180 * ONE_DAY_MS;

export const createBillingSlice: StateCreator<BillingSlice> = (set) => ({
  plan: 'free',
  purchasedAt: null,
  refundDeadlineAt: null,
  hasGuarantee: false,
  refundRequestedAt: null,
  refundedAt: null,

  hydrateBilling: (next) => set(next),

  setPlanLocal: (plan) => {
    if (plan === 'free') {
      set({
        plan: 'free',
        purchasedAt: null,
        refundDeadlineAt: null,
        hasGuarantee: false,
        refundRequestedAt: null,
        refundedAt: null,
      });
    } else {
      const now = Date.now();
      set({
        plan,
        purchasedAt: now,
        refundDeadlineAt: plan === 'lifetime_pro' ? now + REFUND_WINDOW_MS : null,
        hasGuarantee: plan === 'lifetime_pro',
        refundRequestedAt: null,
        refundedAt: null,
      });
    }
  },
});
