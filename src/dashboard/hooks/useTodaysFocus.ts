import { useMemo } from 'react';
import { useAppStore } from '../store';
import type { Application, Job, ApplicationStage } from '../store';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Categories of focus signal we surface, in priority order. The
 *  scoring function below picks one winner — we never show more
 *  than a single primary focus to keep the dashboard's lead clean. */
export type FocusKind =
  | 'interview-soon'
  | 'phone-screen-soon'
  | 'follow-up-overdue'
  | 'offer-pending'
  | 'task-due'
  | 'pipeline-empty'
  | 'streak-keep';

export interface TodaysFocus {
  kind: FocusKind;
  /** Short, action-anchored title rendered as the headline. */
  title: string;
  /** One-sentence subtitle with the why / when. */
  subtitle: string;
  /** Imperative CTA copy ('Open application', 'Add a task', …). */
  ctaLabel: string;
  /** Where the CTA goes — page id understood by the navigation
   *  context, plus optional payload (e.g. application id) the
   *  consumer can use to set focus before navigating. */
  ctaTarget:
    | { page: 'applications'; applicationId?: string }
    | { page: 'copilot' }
    | { page: 'jobs' }
    | { page: 'prep' };
  /** Match score / urgency hint shown on the right of the card.
   *  Matches existing pill colors (indigo / orange / red / green). */
  tone: 'indigo' | 'orange' | 'red' | 'green' | 'purple';
}

const STAGE_LABEL: Record<ApplicationStage, string> = {
  sourced: 'Sourced',
  applied: 'Applied',
  phone_screen: 'Phone screen',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

interface ScoredFocus extends TodaysFocus {
  /** Higher = more urgent. Used to break ties between candidates. */
  priority: number;
}

function appLabel(app: Application, jobs: Job[]): { company: string; role: string } {
  const job = jobs.find((j) => j.id === app.jobId);
  return {
    company: job?.company ?? 'Application',
    role: job?.role ?? '—',
  };
}

/**
 * Pick the single most-urgent focus for today. We score each
 * candidate signal and return the winner. The output is consumed
 * by `TodaysFocusCard` which renders a single hero strip above the
 * stats row.
 *
 * Priority ordering (highest first):
 *   1. Active Copilot session in progress           — 1000+
 *   2. Interview scheduled today/tomorrow          — 900
 *   3. Phone screen scheduled in next 3 days       — 700
 *   4. Offer awaiting decision (>48h since update) — 650
 *   5. Follow-up overdue (applied >7d ago, no move)— 500
 *   6. Task due today                              — 400
 *   7. Streak protect ('don't break the chain')    — 200
 *   8. Pipeline empty / first-time user            — 100 (fallback)
 *
 * The hook recomputes whenever its inputs change; no internal
 * memoisation beyond useMemo because each branch is cheap.
 */
export function useTodaysFocus(): TodaysFocus | null {
  const applications = useAppStore((s) => s.applications);
  const jobs = useAppStore((s) => s.jobs);
  const todaysTasks = useAppStore((s) => s.todaysTasks);
  const activeCopilotSessionId = useAppStore((s) => s.activeSessionId);
  const copilotSessions = useAppStore((s) => s.copilotSessions);

  return useMemo<TodaysFocus | null>(() => {
    const candidates: ScoredFocus[] = [];
    const now = Date.now();

    // ── 1. Live Copilot session — drop everything else, this is the
    //       single most actionable thing happening right now.
    if (activeCopilotSessionId) {
      const sess = copilotSessions.find((s) => s.id === activeCopilotSessionId);
      const company = sess?.company ?? 'Live session';
      const role = sess?.role ?? sess?.mode === 'pitch' ? 'Pitch session' : 'Live interview';
      candidates.push({
        kind: 'interview-soon',
        title: 'Live Copilot session in progress',
        subtitle: `${company} · ${role}`,
        ctaLabel: 'Open Copilot',
        ctaTarget: { page: 'copilot' },
        tone: 'green',
        priority: 1000,
      });
    }

    // ── 2-5. Per-application signals. Single pass.
    for (const app of applications) {
      if (app.archived || app.stage === 'rejected') continue;
      const { company, role } = appLabel(app, jobs);
      const lastActivity = app.lastActivityAt ?? app.appliedAt;
      const daysSinceUpdate = (now - lastActivity) / ONE_DAY_MS;
      const daysSinceApplied = (now - app.appliedAt) / ONE_DAY_MS;

      if (app.stage === 'interview' && daysSinceUpdate <= 7) {
        candidates.push({
          kind: 'interview-soon',
          title: `Interview prep — ${company}`,
          subtitle: `${role} · stage updated ${daysSinceUpdate < 1 ? 'today' : `${Math.floor(daysSinceUpdate)}d ago`}`,
          ctaLabel: 'Open application',
          ctaTarget: { page: 'applications', applicationId: app.id },
          tone: 'purple',
          priority: 900,
        });
      } else if (app.stage === 'phone_screen' && daysSinceUpdate <= 5) {
        candidates.push({
          kind: 'phone-screen-soon',
          title: `Phone screen — ${company}`,
          subtitle: `${role} · prep your screener questions`,
          ctaLabel: 'Open application',
          ctaTarget: { page: 'applications', applicationId: app.id },
          tone: 'indigo',
          priority: 700,
        });
      } else if (app.stage === 'offer' && daysSinceUpdate >= 2) {
        candidates.push({
          kind: 'offer-pending',
          title: `Offer waiting — ${company}`,
          subtitle: `${role} · ${Math.floor(daysSinceUpdate)} days since the update — decide soon`,
          ctaLabel: 'Open application',
          ctaTarget: { page: 'applications', applicationId: app.id },
          tone: 'green',
          priority: 650,
        });
      } else if (app.stage === 'applied' && daysSinceApplied >= 7) {
        candidates.push({
          kind: 'follow-up-overdue',
          title: `Follow up — ${company}`,
          subtitle: `Applied ${Math.floor(daysSinceApplied)} days ago, no movement yet`,
          ctaLabel: 'Open application',
          ctaTarget: { page: 'applications', applicationId: app.id },
          tone: 'orange',
          priority: 500 + Math.min(100, daysSinceApplied), // older = more urgent
        });
      }
    }

    // ── 6. Task due today — only fires when the highest-priority
    //       application signal hasn't already won.
    const openTask = todaysTasks.find((t) => !t.done);
    if (openTask) {
      candidates.push({
        kind: 'task-due',
        title: openTask.title,
        subtitle: openTask.subtitle,
        ctaLabel: 'Mark done',
        ctaTarget: { page: 'applications' }, // tasks live nowhere yet, deep-link later
        tone:
          openTask.subtitleColor === 'orange'
            ? 'orange'
            : openTask.subtitleColor === 'green'
            ? 'green'
            : 'indigo',
        priority: 400,
      });
    }

    // ── 7. Empty pipeline — onboarding hint when nothing is tracked.
    if (applications.length === 0 && copilotSessions.length === 0) {
      candidates.push({
        kind: 'pipeline-empty',
        title: 'Add your first job to start tracking',
        subtitle:
          "Career OS gets sharper the more it knows about what you're chasing.",
        ctaLabel: 'Browse jobs',
        ctaTarget: { page: 'jobs' },
        tone: 'indigo',
        priority: 100,
      });
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.priority - a.priority);
    // Strip priority from the public shape — it's an internal detail.
    const winner = candidates[0];
    return {
      kind: winner.kind,
      title: winner.title,
      subtitle: winner.subtitle,
      ctaLabel: winner.ctaLabel,
      ctaTarget: winner.ctaTarget,
      tone: winner.tone,
    };
    // STAGE_LABEL is referenced indirectly via the comments — keep
    // the import alive for future expansion (per-stage focus copy).
    void STAGE_LABEL;
  }, [
    applications,
    jobs,
    todaysTasks,
    activeCopilotSessionId,
    copilotSessions,
  ]);
}
