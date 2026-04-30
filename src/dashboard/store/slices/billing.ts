import type { StateCreator } from 'zustand';

/** Career OS pricing model — one-shot Sprint payments, no recurring
 *  subscription. The Sprint is a time-boxed period of full access; the
 *  Guarantee add-on layers an offer-or-refund commitment on top.
 *
 *    free        — €0, BYO API key, local-only.
 *    sprint      — €99 one-shot, full hosted features for the Sprint
 *                  duration.
 *    sprint_pro  — €148 = €99 Sprint + €49 Guarantee add-on. Same
 *                  features as Sprint, plus the offer guarantee.
 *
 *  We model Sprint Pro as its own plan id rather than a `hasGuarantee`
 *  boolean on top of `sprint` because the customer-facing pricing page,
 *  receipts, and analytics all treat them as distinct SKUs. The slice
 *  shape is intentionally Stripe-friendly so a future hydration step
 *  ("which Checkout SKU did the user pay for?") becomes a direct map. */
export type BillingPlan = 'free' | 'sprint' | 'sprint_pro';

/** Per-plan caps surfaced as progress bars in the Settings → Billing card.
 *  `Infinity` is rendered as "Unlimited" by the UI. Keep the keys stable
 *  — they're consumed by `useBillingUsage` to map counters to limits. */
export interface PlanLimits {
  cvVariants: number;
  atsAnalysesLifetime: number;
  optimizationsLifetime: number;
  applicationsTracked: number;
  /** Copilot minutes available across the Sprint duration. For free
   *  this is the per-month allowance. */
  copilotMinutesPerSprint: number;
}

export const PLAN_LIMITS: Record<BillingPlan, PlanLimits> = {
  free: {
    cvVariants: 3,
    atsAnalysesLifetime: 10,
    optimizationsLifetime: 5,
    applicationsTracked: 25,
    copilotMinutesPerSprint: 30,
  },
  // Sprint is the headline tier — generous limits so a real job hunt
  // doesn't bump into caps. Caps still exist (one user can't burn
  // €1000 of API credits) but they're sized to "feels unlimited".
  sprint: {
    cvVariants: Infinity,
    atsAnalysesLifetime: Infinity,
    optimizationsLifetime: Infinity,
    applicationsTracked: Infinity,
    copilotMinutesPerSprint: 1200, // 20 hours over the Sprint
  },
  // Sprint Pro inherits Sprint's limits — the differentiator is the
  // Guarantee, not bigger caps.
  sprint_pro: {
    cvVariants: Infinity,
    atsAnalysesLifetime: Infinity,
    optimizationsLifetime: Infinity,
    applicationsTracked: Infinity,
    copilotMinutesPerSprint: 1200,
  },
};

/** Pricing in EUR cents. Source of truth for the comparison strip and
 *  for what we'd send to Stripe at Checkout. Free has no Stripe SKU. */
export interface PlanPricing {
  /** Internal short label used in copy: "Free" / "Sprint" / "Sprint Pro". */
  label: string;
  /** Total price in EUR (display-friendly, not Stripe-cents). 0 = free. */
  priceEur: number;
  /** When applicable, the breakdown shown under the price ("99 + 49"). */
  priceBreakdown?: string;
  /** One-line tagline shown under the plan name. */
  tagline: string;
  /** Whether this plan includes the offer-or-refund guarantee. */
  hasGuarantee: boolean;
}

export const PLAN_PRICING: Record<BillingPlan, PlanPricing> = {
  free: {
    label: 'Free',
    priceEur: 0,
    tagline: 'Bring your own AI keys. Local-only, no time limit.',
    hasGuarantee: false,
  },
  sprint: {
    label: 'Sprint',
    priceEur: 99,
    tagline: 'One-shot, full features for the duration of your job hunt.',
    hasGuarantee: false,
  },
  sprint_pro: {
    label: 'Sprint Pro',
    priceEur: 148,
    priceBreakdown: 'Sprint €99 + Guarantee €49',
    tagline: 'Sprint with the offer-or-refund guarantee.',
    hasGuarantee: true,
  },
};

/** Persisted billing state. Today everyone is on `free` — the back-end
 *  will hydrate this from Stripe webhooks once Checkout is wired up.
 *
 *  The shape is intentionally close to Stripe's: `paymentIntentId` and
 *  `sprintEndsAt` (unix seconds) so the future hydration step is a
 *  direct copy from the webhook payload. */
export interface BillingSlice {
  plan: BillingPlan;
  /** Stripe payment_intent id (or future subscription id) once we have
   *  one. Null on the free tier. */
  paymentIntentId: string | null;
  /** Unix seconds — when the current Sprint ends. After this date the
   *  user falls back to free until they buy another Sprint. */
  sprintEndsAt: number | null;
  /** Set the active plan locally. The real hydration path replaces this
   *  with a hydrate-from-server action once the back-end exists. */
  setPlan: (plan: BillingPlan) => void;
}

export const createBillingSlice: StateCreator<BillingSlice> = (set) => ({
  plan: 'free',
  paymentIntentId: null,
  sprintEndsAt: null,
  setPlan: (plan) => set({ plan }),
});
