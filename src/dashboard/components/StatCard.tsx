import {
  Send,
  Users,
  TrendingUp,
  Clock,
  ArrowUp,
  ArrowDown,
  FileText,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import type { StatItem } from '../data/mock';

const iconMap = {
  send: Send,
  users: Users,
  trending: TrendingUp,
  clock: Clock,
  fileText: FileText,
  calendar: Calendar,
  checkCircle: CheckCircle2,
} as const;

export type StatIconKey = keyof typeof iconMap;
export type StatTrendDirection = 'up' | 'down' | 'none';

export interface StatCardModel {
  label: string;
  value: string;
  iconKey: StatIconKey;
  iconBg: string; // CSS variable name (with leading --)
  trend: { value: string; direction: StatTrendDirection };
}

interface StatCardProps {
  // Legacy shape used by the Dashboard page.
  stat?: StatItem;
  // New shape used by the Applications page (supports "no change" trend).
  model?: StatCardModel;
}

export default function StatCard({ stat, model }: StatCardProps) {
  const resolved: StatCardModel = model
    ? model
    : {
        label: stat!.label,
        value: stat!.value,
        iconKey: stat!.iconKey,
        iconBg: stat!.iconBg,
        trend: { value: stat!.trendText, direction: stat!.trendDirection },
      };

  const Icon = iconMap[resolved.iconKey];
  const direction = resolved.trend.direction;
  const TrendIcon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : null;

  const trendClass =
    'stat-card__trend' +
    (direction === 'down' ? ' stat-card__trend--down' : '') +
    (direction === 'none' ? ' stat-card__trend--none' : '');

  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <div
          className="stat-card__icon"
          style={{ background: `var(${resolved.iconBg})` }}
          aria-hidden="true"
        >
          <Icon size={20} strokeWidth={2.2} />
        </div>
        <span className="stat-card__label">{resolved.label}</span>
      </div>
      <div className="stat-card__value">{resolved.value}</div>
      <div className={trendClass}>
        {TrendIcon && (
          <TrendIcon size={14} strokeWidth={2.4} className="stat-card__trend-icon" />
        )}
        <span>{resolved.trend.value}</span>
      </div>
    </div>
  );
}
