import { useMemo } from 'react';
import { useAppStore } from '../store';

export interface PrepStreakData {
  /** Number of consecutive days (ending today or yesterday) where the
   *  user logged at least one practice activity. We tolerate one
   *  "gap day" so missing today doesn't immediately reset the
   *  streak — same rule Duolingo uses. */
  days: number;
  /** Whether each day of the current week had activity, ordered
   *  Monday → Sunday. */
  weekDots: boolean[];
  /** True when the user has done something today — used for empty
   *  states. */
  hasTodayActivity: boolean;
}

/** Snap a unix-ms timestamp to a YYYY-MM-DD bucket in the user's
 *  local timezone. Local-date matters more than UTC for "did I prep
 *  today?" since users think in their wall-clock day. */
function dateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Iterate from `from` (local 00:00) to `to` (exclusive) one day at
 *  a time, returning each day's date key. */
function* eachDay(from: Date, to: Date): Generator<{ key: string; date: Date }> {
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur < end) {
    yield { key: dateKey(cur.getTime()), date: new Date(cur) };
    cur.setDate(cur.getDate() + 1);
  }
}

/**
 * Compute the live prep streak from real persisted activity:
 *  - Every CopilotSession start counts as one day's activity.
 *  - Every PrepSession.recordedAt counts as one day's activity.
 *  - Tasks marked done in todaysPlan also count for "today".
 *
 *  Returns the streak length (consecutive days), the per-day dots
 *  for the current week (Mon→Sun), and a flag for whether today has
 *  activity.
 */
export function usePrepStreak(): PrepStreakData {
  const copilotSessions = useAppStore((s) => s.copilotSessions);
  const prepSessions = useAppStore((s) => s.prepSessions);
  const todaysPlan = useAppStore((s) => s.todaysPlan);

  return useMemo(() => {
    // Build a Set<string> of date keys that had at least one activity.
    const days = new Set<string>();
    for (const c of copilotSessions) days.add(dateKey(c.startedAt));
    for (const p of prepSessions) days.add(dateKey(p.recordedAt));
    // Plan tasks completed today are credited to today's bucket. We
    // can't reconstruct WHICH day a task was completed (no timestamp
    // on PlanTask) — assume todaysPlan is for today, and any done
    // task means activity today.
    const todayKey = dateKey(Date.now());
    if (todaysPlan.some((t) => t.done)) days.add(todayKey);

    // ── Streak: walk back day by day from today until we hit a gap.
    //    Tolerate ONE missing day at the end (so "didn't prep yet
    //    today, but did yesterday" still shows the streak).
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    let gapsAllowed = days.has(todayKey) ? 0 : 1;
    while (true) {
      const k = dateKey(cursor.getTime());
      if (days.has(k)) {
        streak += 1;
      } else if (gapsAllowed > 0) {
        gapsAllowed -= 1;
      } else {
        break;
      }
      cursor.setDate(cursor.getDate() - 1);
      // Hard stop at 365 days for safety.
      if (streak > 365) break;
    }

    // ── Week dots: Mon→Sun for the current ISO week.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // JS Sunday=0, Monday=1, ... map to ISO offset 0..6.
    const isoOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - isoOffset);
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    const weekDots: boolean[] = [];
    for (const { key } of eachDay(monday, nextMonday)) {
      weekDots.push(days.has(key));
    }

    return {
      days: streak,
      weekDots,
      hasTodayActivity: days.has(todayKey),
    };
  }, [copilotSessions, prepSessions, todaysPlan]);
}
