import { Sparkles, MoreHorizontal, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { mockAIInsights, type InsightStatus } from '../../data/prep';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '../../primitives';

const ICON_FOR_STATUS: Record<InsightStatus, typeof CheckCircle2> = {
  good: CheckCircle2,
  warning: AlertCircle,
  bad: AlertCircle,
};

export default function AIInsightsCard() {
  const toast = useToast();
  return (
    <section className="prep-insights">
      <div className="prep-insights__header">
        <div className="prep-insights__title-wrap">
          <Sparkles size={15} strokeWidth={2} className="prep-insights__sparkle" />
          <h3 className="prep-insights__title">AI insights</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="prep-insights__more" aria-label="More">
              <MoreHorizontal size={16} strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              icon={RefreshCw}
              onSelect={() => toast.success('Insights refreshed')}
            >
              Refresh insights
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ul className="prep-insights__list">
        {mockAIInsights.map((it) => {
          const Icon = ICON_FOR_STATUS[it.status];
          return (
            <li
              key={it.id}
              className="prep-insights__item"
              style={{ transition: 'background 120ms ease', borderRadius: 6, padding: '4px 6px' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <Icon
                size={16}
                strokeWidth={2}
                className={`prep-insights__icon prep-insights__icon--${it.status}`}
              />
              <span className="prep-insights__text">{it.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
