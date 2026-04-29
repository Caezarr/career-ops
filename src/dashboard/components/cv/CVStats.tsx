import StatCard from '../StatCard';
import { useAppStore } from '../../store';

/** Format a millisecond delta as 'just now', 'N min ago', etc. */
function formatAgo(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/** Format an absolute date as 'Today at HH:MM' / 'Yesterday at HH:MM' / 'Mon DD'. */
function formatExact(epochMs: number): string {
  const d = new Date(epochMs);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CVStats() {
  const cvs = useAppStore((s) => s.cvs);
  const atsByCv = useAppStore((s) => s.atsByCv);

  // 1. CV variants — count of CVs in the store.
  const variantsCount = cvs.length;

  // 2. Average ATS score — mean of cvs with a non-zero atsScore.
  const scored = cvs.filter((c) => c.atsScore > 0);
  const avgAts = scored.length
    ? Math.round(scored.reduce((sum, c) => sum + c.atsScore, 0) / scored.length)
    : 0;

  // 3. Roles tailored this month — number of distinct CVs for which an
  //    ATS analysis was run since the start of the current month.
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const tailoredThisMonth = Object.values(atsByCv).filter(
    (a) => a.ranAt >= startOfMonth.getTime(),
  ).length;

  // 4. Last optimization — most recent ranAt across all analyses.
  const lastRunAt = Object.values(atsByCv).reduce(
    (max, a) => (a.ranAt > max ? a.ranAt : max),
    0,
  );
  const lastValue = lastRunAt > 0 ? formatAgo(Date.now() - lastRunAt) : '—';
  const lastTrendValue =
    lastRunAt > 0 ? formatExact(lastRunAt) : 'Run Analyze match';

  return (
    <section className="cv__stats" aria-label="CV metrics">
      <StatCard
        model={{
          label: 'CV variants',
          value: String(variantsCount),
          iconKey: 'fileText',
          iconBg: '--purple',
          trend: { value: 'Live count', direction: 'none' },
        }}
      />
      <StatCard
        model={{
          label: 'Average ATS score',
          value: avgAts ? `${avgAts}%` : '—',
          iconKey: 'trending',
          iconBg: '--green',
          trend: {
            value: scored.length
              ? `Across ${scored.length} variant${scored.length === 1 ? '' : 's'}`
              : 'Not yet scored',
            direction: 'none',
          },
        }}
      />
      <StatCard
        model={{
          label: 'Roles tailored this month',
          value: String(tailoredThisMonth),
          iconKey: 'calendar',
          iconBg: '--purple',
          trend: {
            value: tailoredThisMonth
              ? `${tailoredThisMonth} analysis run${tailoredThisMonth === 1 ? '' : 's'}`
              : 'No runs yet',
            direction: 'none',
          },
        }}
      />
      <StatCard
        model={{
          label: 'Last optimization',
          value: lastValue,
          iconKey: 'clock',
          iconBg: '--orange',
          trend: { value: lastTrendValue, direction: 'none' },
        }}
      />
    </section>
  );
}
