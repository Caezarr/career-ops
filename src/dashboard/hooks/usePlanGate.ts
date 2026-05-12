/**
 * usePlanGate — single source of truth for "what is the user allowed
 * to do at this tier?".
 *
 * Reads the billing slice + counts the persisted data (CVs, apps,
 * ATS analyses) to decide whether each gated action is allowed.
 *
 * Components that need to gate a button:
 *
 *   const gate = usePlanGate();
 *   <button disabled={!gate.canCreateCv}
 *           onClick={() => gate.canCreateCv ? createCv() : openUpgrade()} />
 *
 * Or wrap a whole page:
 *
 *   <PaywallOverlay blocked={!gate.canAccessPrep} feature="Prep">
 *     <PrepPage />
 *   </PaywallOverlay>
 *
 * The `reason` strings are user-facing French — drop them straight
 * into a tooltip / modal subtitle without rewriting.
 */
import { useAppStore } from '../store';
import { PLAN_LIMITS, type Plan, type PlanLimits } from '../store/slices/billing';

export interface PlanGate {
  /** Current plan (read from the billing slice, which mirrors D1). */
  plan: Plan;
  isFree: boolean;
  isPaid: boolean;
  hasGuarantee: boolean;

  // ─── Hard gates (page-level) ───────────────────────────────────
  /** Prep page (entraînement entretien) — paid-only. */
  canAccessPrep: boolean;

  // ─── Soft gates (count-bound) ──────────────────────────────────
  /** Create another CV (manual + upload). */
  canCreateCv: boolean;
  /** Track another application. */
  canTrackApplication: boolean;
  /** Run an ATS analysis. */
  canRunAtsAnalysis: boolean;
  /** Generate an AI-optimized CV variant. */
  canGenerateOptimizedCv: boolean;
  /** Start a new Copilot session. Free users get 30 min / month. */
  canStartCopilotSession: boolean;

  // ─── Counters (for inline "3 / 10" displays) ────────────────────
  counts: {
    cvs: number;
    applications: number;
    atsAnalyses: number;
    optimizedCvs: number;
  };
  limits: PlanLimits;

  /** Human-readable "why" string keyed by gate id. Surface this in
   *  tooltips, toast messages, or the upgrade modal subtitle. */
  reason: Record<
    'prep' | 'cv' | 'application' | 'ats' | 'optimized' | 'copilot',
    string
  >;
}

export function usePlanGate(): PlanGate {
  const plan = useAppStore((s) => s.plan);
  const hasGuarantee = useAppStore((s) => s.hasGuarantee);
  const cvs = useAppStore((s) => s.cvs);
  const applications = useAppStore((s) => s.applications);
  const atsByCv = useAppStore((s) => s.atsByCv);

  const limits = PLAN_LIMITS[plan];
  const isFree = plan === 'free';
  const isPaid = !isFree;

  const cvsCount = cvs.length;
  const applicationsCount = applications.length;
  const atsCount = Object.keys(atsByCv ?? {}).length;
  // Heuristic — once we add a structured `isOptimized` flag this
  // becomes a clean filter. Matches the hint string in
  // `useBillingUsage` so the two views stay consistent.
  const optimizedCvsCount = cvs.filter((c) =>
    /^optimized for /i.test(c.name),
  ).length;

  const lim = (n: number): string =>
    Number.isFinite(n) ? `(${n} / plan Free)` : '';

  return {
    plan,
    isFree,
    isPaid,
    hasGuarantee,

    canAccessPrep: isPaid,
    canCreateCv: cvsCount < limits.cvVariants,
    canTrackApplication: applicationsCount < limits.applicationsTracked,
    canRunAtsAnalysis: atsCount < limits.atsAnalysesLifetime,
    canGenerateOptimizedCv: optimizedCvsCount < limits.optimizationsLifetime,
    // No live metering yet — we gate Copilot at the session level
    // (Free = 0 sessions allowed once we've reached the monthly
    // minute budget on the device-side counter, paid = unlimited).
    // For now: Free can run 1 session per session-of-the-app, paid
    // unlimited. Tighten when the metering loop ships.
    canStartCopilotSession: isPaid,

    counts: {
      cvs: cvsCount,
      applications: applicationsCount,
      atsAnalyses: atsCount,
      optimizedCvs: optimizedCvsCount,
    },
    limits,

    reason: {
      prep: 'L\'entraînement entretien (briefs IA + STAR + Live Copilot) est inclus dans Lifetime.',
      cv: `Le plan Free est limité à ${limits.cvVariants} variantes de CV ${lim(limits.cvVariants)}. Lifetime débloque l\'illimité.`,
      application: `Le plan Free suit jusqu\'à ${limits.applicationsTracked} candidatures ${lim(limits.applicationsTracked)}. Lifetime débloque l\'illimité.`,
      ats: `Le plan Free permet ${limits.atsAnalysesLifetime} analyses ATS ${lim(limits.atsAnalysesLifetime)}. Lifetime débloque l\'illimité.`,
      optimized: `Le plan Free permet ${limits.optimizationsLifetime} CVs optimisés ${lim(limits.optimizationsLifetime)}. Lifetime débloque l\'illimité.`,
      copilot: `Le Live Copilot est inclus dans Lifetime (illimité). Free est plafonné à ${limits.copilotMinutesPerMonth} min / mois.`,
    },
  };
}
