import { Send, Users, TrendingUp, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import type { StatItem } from '../data/mock';

const iconMap = {
  send: Send,
  users: Users,
  trending: TrendingUp,
  clock: Clock,
} as const;

interface StatCardProps {
  stat: StatItem;
}

export default function StatCard({ stat }: StatCardProps) {
  const Icon = iconMap[stat.iconKey];
  const TrendIcon = stat.trendDirection === 'up' ? ArrowUp : ArrowDown;

  return (
    <div className="stat-card">
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
      <div className="stat-card__trend">
        <TrendIcon size={14} strokeWidth={2.4} className="stat-card__trend-icon" />
        <span>{stat.trendText}</span>
      </div>
    </div>
  );
}
