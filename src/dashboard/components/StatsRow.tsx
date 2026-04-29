import {
  Send,
  Users,
  TrendingUp,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import '../styles/stats.css';
import { mockStats, type StatItem } from '../data/mock';
import { useNavigation } from '../navigation';
import { useAppStore } from '../store';
import type { ApplicationsTab } from '../store';

const iconMap = {
  send: Send,
  users: Users,
  trending: TrendingUp,
  clock: Clock,
} as const;

const TAB_FOR_STAT: Record<string, ApplicationsTab> = {
  active: 'active',
  interviews: 'interviews',
  response: 'all',
  reply: 'all',
};

export default function StatsRow() {
  const { navigate } = useNavigation();
  const setApplicationsTab = useAppStore((s) => s.setApplicationsTab);

  function handleClick(stat: StatItem) {
    const tab = TAB_FOR_STAT[stat.id] ?? 'all';
    setApplicationsTab(tab);
    navigate('applications');
  }

  return (
    <section className="stats-row" aria-label="Key metrics">
      {mockStats.map((stat) => {
        const Icon = iconMap[stat.iconKey as keyof typeof iconMap];
        const TrendIcon =
          stat.trendDirection === 'up'
            ? ArrowUp
            : stat.trendDirection === 'down'
            ? ArrowDown
            : null;
        const trendClass =
          'stat-card__trend' +
          (stat.trendDirection === 'down' ? ' stat-card__trend--down' : '');

        return (
          <button
            key={stat.id}
            type="button"
            className="stat-card stat-card--clickable"
            onClick={() => handleClick(stat)}
            aria-label={`${stat.label}: ${stat.value}. View applications.`}
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
