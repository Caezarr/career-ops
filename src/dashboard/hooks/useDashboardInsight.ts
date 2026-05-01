import { useMemo } from 'react';
import { useAppStore } from '../store';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SPARKLINE_DAYS = 14;

/** A single point on the sparkline — count of activity events that
 *  happened during that day's UTC window. */
export interface SparkPoint {
  /** Day index in the [0, SPARKLINE_DAYS-1] range, 0 = oldest. */
  i: number;
  /** Activity count for that day (applications + sessions + stage
   *  changes). */
  value: number;
}

export interface DashboardInsight {
  /** Primary highlight (e.g. number of interviews this week). */
  headline: string;
  /** Secondary metric, expressed as a delta against the previous
   *  comparable window. Empty string when no useful comparison
   *  exists. */
  delta: string;
  /** Whether the delta reads as positive movement. Drives the chip
   *  colour in the UI. */
  deltaPositive: boolean;
  /** Caption shown below the headline (subtitle, full sentence). */
  subtext: string;
  /** 14-day activity sparkline. Always returns 14 points, even if
   *  some are zero, so the SVG layout stays predictable. */
  spark: SparkPoint[];
  /** Maximum value across spark points — used by the SVG to scale
   *  the y-axis. Always at least 1 so a flat line still renders. */
  sparkMax: number;
  /** Whether we have enough data to make the insight meaningful.
   *  When false, the UI shows an onboarding prompt instead. */
  hasData: boolean;
}

/**
 * Synthesise the "weekly insight" surface from real activity.
 *
 *   - The headline counts the most relevant signal of the week:
 *     interviews booked when there are any, otherwise applications
 *     submitted.
 *   - The delta compares this 7-day window to the previous one and
 *     formats it as "+X this week" / "-X this week" / "Steady".
 *   - The sparkline blends three activity sources (application
 *     creation, Copilot session start, application stage change)
 *     so it reads as "did anything happen?" rather than just one
 *     of those.
 *
 * Computed in a single pass over the past 14 days so the hook
 * remains cheap on dashboards with thousands of applications.
 */
export function useDashboardInsight(): DashboardInsight {
  const applications = useAppStore((s) => s.applications);
  const copilotSessions = useAppStore((s) => s.copilotSessions);

  return useMemo(() => {
    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    // Bucket counts per day for the past 14 days. Index 0 = 13 days
    // ago, index 13 = today.
    const buckets = new Array<number>(SPARKLINE_DAYS).fill(0);

    function addToBucket(ts: number) {
      if (!Number.isFinite(ts)) return;
      const offsetDays = Math.floor((todayMs - ts) / ONE_DAY_MS);
      if (offsetDays < 0 || offsetDays >= SPARKLINE_DAYS) return;
      buckets[SPARKLINE_DAYS - 1 - offsetDays] += 1;
    }

    let interviewsThisWeek = 0;
    let interviewsLastWeek = 0;
    let appsThisWeek = 0;
    let appsLastWeek = 0;

    const weekAgo = now - 7 * ONE_DAY_MS;
    const twoWeeksAgo = now - 14 * ONE_DAY_MS;

    for (const a of applications) {
      addToBucket(a.appliedAt);
      // Stage changes are visible through lastActivityAt — adding
      // them on top of appliedAt would double-count creates, so we
      // only credit the day of the last update.
      if (typeof a.lastActivityAt === 'number' && a.lastActivityAt !== a.appliedAt) {
        addToBucket(a.lastActivityAt);
      }
      // Window counts for the headline / delta.
      if (a.appliedAt > weekAgo) appsThisWeek += 1;
      else if (a.appliedAt > twoWeeksAgo) appsLastWeek += 1;
      if (a.stage === 'interview') {
        const ts = a.lastActivityAt ?? a.appliedAt;
        if (ts > weekAgo) interviewsThisWeek += 1;
        else if (ts > twoWeeksAgo) interviewsLastWeek += 1;
      }
    }

    for (const s of copilotSessions) addToBucket(s.startedAt);

    const spark: SparkPoint[] = buckets.map((value, i) => ({ i, value }));
    const sparkMax = Math.max(1, ...buckets);

    // Headline / delta: prefer interviews when there are any (it's
    // the higher-signal metric); fall back to apps submitted.
    let headline: string;
    let delta: string;
    let deltaPositive: boolean;
    let subtext: string;

    if (interviewsThisWeek > 0 || interviewsLastWeek > 0) {
      const change = interviewsThisWeek - interviewsLastWeek;
      headline = `${interviewsThisWeek} interview${interviewsThisWeek === 1 ? '' : 's'} this week`;
      delta =
        change === 0
          ? 'Steady from last week'
          : `${change > 0 ? '+' : ''}${change} vs last week`;
      deltaPositive = change >= 0;
      subtext =
        interviewsThisWeek === 0
          ? 'No interviews scheduled — keep the pipeline moving.'
          : 'Live opportunities to close the loop on.';
    } else if (appsThisWeek > 0 || appsLastWeek > 0) {
      const change = appsThisWeek - appsLastWeek;
      headline = `${appsThisWeek} application${appsThisWeek === 1 ? '' : 's'} sent this week`;
      delta =
        change === 0
          ? 'Steady from last week'
          : `${change > 0 ? '+' : ''}${change} vs last week`;
      deltaPositive = change >= 0;
      subtext = 'Keep the cadence — applications convert to interviews.';
    } else {
      headline = 'Nothing tracked yet';
      delta = '';
      deltaPositive = true;
      subtext = 'Add an application or start a Copilot session to seed your insights.';
    }

    const hasData = applications.length > 0 || copilotSessions.length > 0;

    return {
      headline,
      delta,
      deltaPositive,
      subtext,
      spark,
      sparkMax,
      hasData,
    };
  }, [applications, copilotSessions]);
}
