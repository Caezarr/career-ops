import { useMemo } from 'react';
import { useAppStore } from '../store';
import type { Application, ApplicationStage } from '../store';

/** A single stat card on the dashboard. The hook returns a tuple of
 *  these in stable order so the StatsRow doesn't need to know about
 *  the underlying calculations. */
export interface DashboardStat {
  id: 'active' | 'interviews' | 'response' | 'reply';
  label: string;
  /** Display-formatted value (with the right unit for the metric). */
  value: string;
  /** Pre-formatted trend caption. Empty string when no comparison
   *  is meaningful (e.g. brand new account with no week-old data). */
  trendText: string;
  trendDirection: 'up' | 'down' | 'none';
  /** Whether "up" is the positive/good direction for this metric.
   *  Avg time to reply is the inverted one — down is good there. */
  upIsGood: boolean;
  iconKey: 'send' | 'users' | 'trending' | 'clock';
  /** CSS variable name (without var()) for the icon background. */
  iconBg: string;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Apps that count toward the active pipeline at a given snapshot
 *  timestamp. We treat apps as "still active" if they applied before
 *  the snapshot and aren't archived / rejected today — we don't have
 *  per-day archival history, so this is a reasonable approximation
 *  of "what was the active count back then". */
function activeAt(apps: Application[], snapshot: number): Application[] {
  return apps.filter(
    (a) =>
      !a.archived &&
      a.stage !== 'rejected' &&
      (a.appliedAt ?? 0) <= snapshot,
  );
}

/** Apps that hit a particular stage in the [from, to] window. We use
 *  lastActivityAt (set on every stage change) so a stage transition
 *  this week doesn't get attributed to the apps' original applied
 *  date. */
function inStageThisWindow(
  apps: Application[],
  stage: ApplicationStage,
  from: number,
  to: number,
): Application[] {
  return apps.filter((a) => {
    if (a.stage !== stage) return false;
    const ts = a.lastActivityAt ?? a.appliedAt ?? 0;
    return ts > from && ts <= to;
  });
}

/** Response rate at a snapshot = (apps past 'applied' stage) / (apps
 *  applied at or before snapshot). Returns 0 when the denominator is
 *  empty so the UI shows 0% rather than NaN. */
function responseRate(apps: Application[], snapshot: number): number {
  const pool = apps.filter(
    (a) =>
      !a.archived &&
      (a.appliedAt ?? 0) <= snapshot &&
      a.stage !== 'sourced',
  );
  if (pool.length === 0) return 0;
  const responded = pool.filter((a) =>
    ['phone_screen', 'interview', 'offer'].includes(a.stage),
  ).length;
  return Math.round((responded / pool.length) * 100);
}

/** Average days between applied and last activity, for apps that
 *  moved past 'applied' before the snapshot. Returns 0 when no app
 *  qualifies (avoid NaN reaching the formatter). */
function avgTimeToReplyDays(apps: Application[], snapshot: number): number {
  const responded = apps.filter(
    (a) =>
      !a.archived &&
      (a.appliedAt ?? 0) <= snapshot &&
      ['phone_screen', 'interview', 'offer'].includes(a.stage) &&
      typeof a.lastActivityAt === 'number',
  );
  if (responded.length === 0) return 0;
  let total = 0;
  for (const a of responded) {
    total += ((a.lastActivityAt as number) - (a.appliedAt ?? 0)) / ONE_DAY_MS;
  }
  return Math.max(0, total / responded.length);
}

function formatTrendCount(diff: number, unit: string): string {
  if (diff === 0) return 'No change';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff} ${unit}`;
}

function formatTrendPP(diff: number): string {
  if (diff === 0) return 'No change';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff}pp`;
}

function formatTrendDays(diff: number): string {
  if (Math.abs(diff) < 0.05) return 'No change';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)} days`;
}

function direction(diff: number): 'up' | 'down' | 'none' {
  if (Math.abs(diff) < 0.001) return 'none';
  return diff > 0 ? 'up' : 'down';
}

/**
 * Compute the four headline dashboard stats from the live store.
 *
 *   - Active applications  — apps not archived, not rejected, sourced
 *                            or further along.
 *   - Interviews this week — apps currently in 'interview' stage whose
 *                            last activity falls in the past 7 days.
 *   - Response rate        — share of applied-or-further apps that have
 *                            moved past 'applied' (phone_screen+).
 *   - Avg time to reply    — average gap (days) between apply and the
 *                            first stage change for responded apps.
 *
 * Each stat ships a week-over-week delta. When the comparison would be
 * meaningless (e.g. only one application exists), we still return a
 * trend object so the UI keeps rendering — `direction === 'none'`
 * suppresses the arrow but the caption stays readable ("No change").
 */
export function useDashboardStats(): DashboardStat[] {
  const applications = useAppStore((s) => s.applications);

  return useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * ONE_DAY_MS;
    const twoWeeksAgo = now - 14 * ONE_DAY_MS;

    // Active applications (now vs a week ago)
    const activeNow = applications.filter(
      (a) => !a.archived && a.stage !== 'rejected',
    ).length;
    const activeWeekAgo = activeAt(applications, weekAgo).length;
    const activeDelta = activeNow - activeWeekAgo;

    // Interviews this week vs interviews last week
    const interviewsThis = inStageThisWindow(applications, 'interview', weekAgo, now).length;
    const interviewsPrev = inStageThisWindow(
      applications,
      'interview',
      twoWeeksAgo,
      weekAgo,
    ).length;
    const interviewsDelta = interviewsThis - interviewsPrev;

    // Response rate now vs a week ago
    const responseNow = responseRate(applications, now);
    const responseWeekAgo = responseRate(applications, weekAgo);
    const responseDelta = responseNow - responseWeekAgo;

    // Avg time to reply (down is good)
    const replyNow = avgTimeToReplyDays(applications, now);
    const replyWeekAgo = avgTimeToReplyDays(applications, weekAgo);
    const replyDelta = replyNow - replyWeekAgo;

    return [
      {
        id: 'active',
        label: 'Active applications',
        value: String(activeNow),
        trendText: formatTrendCount(activeDelta, 'from last week'),
        trendDirection: direction(activeDelta),
        upIsGood: true,
        iconKey: 'send',
        iconBg: '--indigo',
      },
      {
        id: 'interviews',
        label: 'Interviews this week',
        value: String(interviewsThis),
        trendText: formatTrendCount(interviewsDelta, 'from last week'),
        trendDirection: direction(interviewsDelta),
        upIsGood: true,
        iconKey: 'users',
        iconBg: '--purple',
      },
      {
        id: 'response',
        label: 'Response rate',
        value: `${responseNow}%`,
        trendText: formatTrendPP(responseDelta),
        trendDirection: direction(responseDelta),
        upIsGood: true,
        iconKey: 'trending',
        iconBg: '--blue',
      },
      {
        id: 'reply',
        label: 'Avg. time to reply',
        value: replyNow > 0 ? `${replyNow.toFixed(1)} days` : '—',
        trendText: replyNow > 0 ? formatTrendDays(replyDelta) : 'No data yet',
        // Down is good for time-to-reply, but we still return the raw
        // sign so the arrow icon points the right way; the
        // `upIsGood: false` flag tells the UI to paint a downward
        // arrow GREEN.
        trendDirection: direction(replyDelta),
        upIsGood: false,
        iconKey: 'clock',
        iconBg: '--green',
      },
    ];
  }, [applications]);
}
