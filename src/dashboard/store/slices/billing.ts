import type { StateCreator } from 'zustand';

/** The product plans Career OS will offer. Today only `free` is selectable
 *  — `pro` / `enterprise` light up once the Stripe integration ships. The
 *  enum is fixed early so call sites don't need to change when we plug in
 *  the real subscription state. */
export type BillingPlan = 'free' | 'pro' | 'enterprise';

export type BillingCycle = 'monthly' | 'annual';

/** Per-plan caps surfaced as progress bars in the Settings → Billing card.
 *  `Infinity` is rendered as "Unlimited" by the UI. Keep the keys stable
 *  — they're consumed by `useBillingUsage` to map counters to limits. */
export interface PlanLimits {
  cvVariants: number;
  atsAnalysesLifetime: number;
  optimizationsLifetime: number;
  applicationsTracked: number;
  copilotMinutesPerMonth: number;
}

export const PLAN_LIMITS: Record<BillingPlan, PlanLimits> = {
  free: {
    cvVariants: 3,
    atsAnalysesLifetime: 10,
    optimizationsLifetime: 5,
    applicationsTracked: 25,
    copilotMinutesPerMonth: 30,
  },
  pro: {
    cvVariants: Infinity,
    atsAnalysesLifetime: 200,
    optimizationsLifetime: 100,
    applicationsTracked: Infinity,
    copilotMinutesPerMonth: 600,
  },
  enterprise: {
    cvVariants: Infinity,
    atsAnalysesLifetime: Infinity,
    optimizationsLifetime: Infinity,
    applicationsTracked: Infinity,
    copilotMinutesPerMonth: Infinity,
  },
};

export const PLAN_PRICING: Record<
  BillingPlan,
  { monthly: number | null; annual: number | null; label: string; tagline: string }
> = {
  free: {
    monthly: 0,
    annual: 0,
    label: 'Free',
    tagline: 'Local-only, BYO API key. Perfect to test the full pipeline.',
  },
  pro: {
    monthly: 19,
    annual: 190,
    label: 'Pro',
    tagline: 'Higher limits, hosted AI quota, priority support.',
  },
  enterprise: {
    monthly: null,
    annual: null,
    label: 'Enterprise',
    tagline: 'Custom contracts, SSO, audit log. Talk to sales.',
  },
};

/** Persisted billing state. Today everyone is on `free` with no
 *  subscription — the back-end will hydrate this from Stripe webhooks
 *  once we wire it up.
 *
 *  The shape is intentionally close to Stripe's: `subscriptionId` and
 *  `currentPeriodEnd` (unix seconds, like Stripe) so the future
 *  hydration step is one direct copy. */
export interface BillingSlice {
  plan: BillingPlan;
  cycle: BillingCycle;
  /** Stripe subscription id once we have one. Null while on free. */
  subscriptionId: string | null;
  /** Unix seconds — when the current paid period ends / renews. */
  currentPeriodEnd: number | null;
  /** Set the active plan locally. The real hydration path replaces this
   *  with a hydrate-from-server action once the back-end exists. */
  setPlan: (plan: BillingPlan, cycle?: BillingCycle) => void;
}

export const createBillingSlice: StateCreator<BillingSlice> = (set) => ({
  plan: 'free',
  cycle: 'monthly',
  subscriptionId: null,
  currentPeriodEnd: null,
  setPlan: (plan, cycle) =>
    set((state) => ({ plan, cycle: cycle ?? state.cycle })),
});
