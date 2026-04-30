import { useMemo } from 'react';
import StatCard from '../StatCard';
import { useAppStore } from '../../store';
import type {
  StatCardModel,
  StatTrendDirection,
} from '../StatCard';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface BucketCounts {
  total: number;
  inReview: number;
  interviews: number;
  offers: number;
}

/** Count applications per bucket, optionally filtered by a min appliedAt
 *  threshold. We use this twice (current state + last-week snapshot) so
 *  the trends can compute a real delta instead of a hardcoded string. */
function countBuckets(
  apps: Array<{ stage: string; archived: boolean; appliedAt: number }>,
  minAppliedAt = 0,
): BucketCounts {
  let total = 0;
  let inReview = 0;
  let interviews = 0;
  let offers = 0;
  for (const a of apps) {
    if (a.archived) continue;
    if (a.appliedAt < minAppliedAt) continue;
    total += 1;
    if (a.stage === 'sourced' || a.stage === 'applied' || a.stage === 'phone_screen') {
      inReview += 1;
    } else if (a.stage === 'interview') {
      interviews += 1;
    } else if (a.stage === 'offer') {
      offers += 1;
    }
  }
  return { total, inReview, interviews, offers };
}

/** Format a delta into the "X from last week" copy that the StatCard
 *  trend slot expects, plus the matching arrow direction. We compare
 *  the current count to the count of applications that existed *before*
 *  one week ago — i.e. how many were added this week. */
function trendFor(current: number, previous: number): {
  value: string;
  direction: StatTrendDirection;
} {
  const delta = current - previous;
  if (delta === 0) return { value: 'No change', direction: 'none' };
  if (delta > 0) {
    return {
      value: `${delta} from last week`,
      direction: 'up',
    };
  }
  return {
    value: `${Math.abs(delta)} from last week`,
    direction: 'down',
  };
}

/** Live applications counters — replaces the hardcoded
 *  mockApplicationStats. Recomputes on every store change so a Stage
 *  change instantly reflects in the cards. */
export default function ApplicationsStats() {
  const applications = useAppStore((s) => s.applications);

  const cards = useMemo<StatCardModel[]>(() => {
    const now = Date.now();
    const oneWeekAgo = now - ONE_WEEK_MS;

    const current = countBuckets(applications);
    // Snapshot of what existed BEFORE this week — i.e. apps that were
    // applied to before the cutoff. The delta = "new this week".
    const beforeWeek = countBuckets(applications, 0);
    // Apps that landed before the cutoff window — used to derive the
    // "old" baseline for each bucket.
    const stale = applications.filter(
      (a) => !a.archived && a.appliedAt < oneWeekAgo,
    );
    const olderBuckets = countBuckets(stale);
    void beforeWeek;

    return [
      {
        label: 'Total applications',
        value: current.total.toString(),
        trend: trendFor(current.total, olderBuckets.total),
        iconKey: 'fileText',
        iconBg: '--indigo',
      },
      {
        label: 'In review',
        value: current.inReview.toString(),
        trend: trendFor(current.inReview, olderBuckets.inReview),
        iconKey: 'users',
        iconBg: '--purple',
      },
      {
        label: 'Interviews',
        value: current.interviews.toString(),
        trend: trendFor(current.interviews, olderBuckets.interviews),
        iconKey: 'calendar',
        iconBg: '--orange',
      },
      {
        label: 'Offers',
        value: current.offers.toString(),
        trend: trendFor(current.offers, olderBuckets.offers),
        iconKey: 'checkCircle',
        iconBg: '--green',
      },
    ];
  }, [applications]);

  return (
    <section className="applications__stats" aria-label="Applications metrics">
      {cards.map((model) => (
        <StatCard key={model.label} model={model} />
      ))}
    </section>
  );
}
