import { useAppStore } from '../store';
import {
  PLAN_LIMITS,
  type PlanLimits,
} from '../store/slices/billing';

export interface UsageRow {
  id: keyof PlanLimits;
  label: string;
  current: number;
  limit: number;
  /** Brief copy explaining what's being measured. Surfaced in tooltips. */
  hint: string;
}

/**
 * Derive the live "Plan & usage" rows from the durable stores.
 *
 * Counters are computed against the persisted shape we already have, so
 * we don't ship a parallel "usage" table that could drift. When the
 * Stripe back-end lands, it can override `current` per row from
 * server-side metering — the UI consumes the same shape.
 */
export function useBillingUsage(): UsageRow[] {
  const plan = useAppStore((s) => s.plan);
  const cvs = useAppStore((s) => s.cvs);
  const atsByCv = useAppStore((s) => s.atsByCv);
  const applications = useAppStore((s) => s.applications);

  const limits = PLAN_LIMITS[plan];
  const atsAnalysesCount = Object.keys(atsByCv ?? {}).length;
  // Optimized CVs are saved via GenerateOptimizedModal with a name like
  // "Optimized for {role}". Once we add a structured `isOptimized` flag
  // on the CV type this becomes a clean filter — the prefix heuristic
  // is what we have today.
  const optimizationsCount = cvs.filter((c) =>
    /^optimized for /i.test(c.name),
  ).length;

  return [
    {
      id: 'cvVariants',
      label: 'CV variants',
      current: cvs.length,
      limit: limits.cvVariants,
      hint: 'Saved CVs and AI-optimized variants in CV Manager.',
    },
    {
      id: 'atsAnalysesLifetime',
      label: 'ATS analyses',
      current: atsAnalysesCount,
      limit: limits.atsAnalysesLifetime,
      hint: 'Total ATS analyses you have run on your CVs.',
    },
    {
      id: 'optimizationsLifetime',
      label: 'Optimized CVs generated',
      current: optimizationsCount,
      limit: limits.optimizationsLifetime,
      hint: 'CV variants generated through "Generate optimized".',
    },
    {
      id: 'applicationsTracked',
      label: 'Applications tracked',
      current: applications.length,
      limit: limits.applicationsTracked,
      hint: 'Open + archived applications in the Applications page.',
    },
    {
      id: 'copilotMinutesPerMonth',
      label: 'Copilot minutes (this month)',
      // No live tracker yet — placeholder 0 so the row renders honestly.
      // The Copilot session loop will increment a counter slice once we
      // ship session metering.
      current: 0,
      limit: limits.copilotMinutesPerMonth,
      hint: 'Live Copilot session minutes consumed since the start of the month. Unlimited on Lifetime tiers.',
    },
  ];
}
