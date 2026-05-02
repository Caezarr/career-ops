import {
  Send,
  Users,
  TrendingUp,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import '../styles/stats.css';
import { useNavigation } from '../navigation';
import { useAppStore } from '../store';
import type { ApplicationsTab } from '../store';
import { useDashboardStats, type DashboardStat } from '../hooks/useDashboardStats';

const iconMap = {
  send: Send,
  users: Users,
  trending: TrendingUp,
  clock: Clock,
} as const;

const TAB_FOR_STAT: Record<DashboardStat['id'], ApplicationsTab> = {
  active: 'active',
  interviews: 'interviews',
  response: 'all',
  reply: 'all',
};

/** Whether the stat's trend should read as "good" given the
 *  direction of change. Avg time to reply is the inverted metric:
 *  going down is positive, so a `down` arrow on that card is green. */
function trendIsPositive(stat: DashboardStat): boolean {
  if (stat.trendDirection === 'none') return false;
  const isUp = stat.trendDirection === 'up';
  return stat.upIsGood ? isUp : !isUp;
}

export default function StatsRow() {
  const { navigate } = useNavigation();
  const setApplicationsTab = useAppStore((s) => s.setApplicationsTab);
  const stats = useDashboardStats();

  function handleClick(stat: DashboardStat) {
    setApplicationsTab(TAB_FOR_STAT[stat.id]);
    navigate('applications');
  }

  return (
    <section className="stats-row" aria-label="Key metrics">
      {stats.map((stat) => {
        const Icon = iconMap[stat.iconKey];
        const TrendIcon =
          stat.trendDirection === 'up'
            ? ArrowUp
            : stat.trendDirection === 'down'
            ? ArrowDown
            : null;
        // Paint the trend chip green when the change is positive
        // *for this metric* (handles the time-to-reply inversion).
        const positive = trendIsPositive(stat);
        const trendClass =
          'stat-card__trend' +
          (stat.trendDirection === 'none'
            ? ' stat-card__trend--none'
            : positive
            ? ''
            : ' stat-card__trend--down');

        return (
          <button
            key={stat.id}
            type="button"
            className="stat-card stat-card--clickable"
            onClick={() => handleClick(stat)}
            aria-label={`${stat.label}: ${stat.value}. ${stat.trendText}. View applications.`}
          >
            <div className="stat-card__top">
              <div
                className="stat-card__icon"
                style={{ background: `var(${stat.iconBg})` }}
                aria-hidden="true"
              >
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <span className="stat-card__label">{stat.label}</span>
            </div>
            <div className="stat-card__value">{stat.value}</div>
            <div className={trendClass}>
              {TrendIcon && (
                <TrendIcon
                  size={14}
                  strokeWidth={2.4}
                  className="stat-card__trend-icon"
                />
              )}
              <span>{stat.trendText}</span>
            </div>
          </button>
        );
      })}
    </section>
  );
}
