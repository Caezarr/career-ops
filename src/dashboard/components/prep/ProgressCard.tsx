import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { mockProgress } from '../../data/prep';
import CircularProgress from '../cv/CircularProgress';
import ImprovementChart from './ImprovementChart';
import WeakAreas from './WeakAreas';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../primitives';
import { useAppStore, type PrepChartPeriod } from '../../store';

const PERIOD_LABEL: Record<PrepChartPeriod, string> = {
  '4w': 'Last 4 weeks',
  '8w': 'Last 8 weeks',
  '12w': 'Last 12 weeks',
};

export default function ProgressCard() {
  const period = useAppStore((s) => s.prepChartPeriod);
  const setPeriod = useAppStore((s) => s.setPrepChartPeriod);

  const { questionsPracticed, averageScore, completion, weeks, weakAreas } = mockProgress;

  // Slice or extend the existing 8-week mock data based on period.
  const visibleWeeks = useMemo(() => {
    if (period === '4w') return weeks.slice(-4);
    if (period === '12w') {
      // Extrapolate 4 extra synthetic weeks before the existing 8 to simulate longer history.
      const first = weeks[0]?.value ?? 0;
      const synthetic = Array.from({ length: 4 }, (_, i) => ({
        label: `Wk ${i + 1}`,
        value: Math.max(0, first - (4 - i) * 0.4),
      }));
      return [
        ...synthetic,
        ...weeks.map((w, i) => ({ ...w, label: `Wk ${i + 5}` })),
      ];
    }
    return weeks;
  }, [period, weeks]);

  return (
    <section className="prep-progress">
      <h3 className="prep-progress__title">Progress</h3>

      <div className="prep-progress__stats">
        <div className="prep-stat-box">
          <span className="prep-stat-box__label">Questions practiced</span>
          <span className="prep-stat-box__value">{questionsPracticed.value}</span>
          <span className="prep-stat-box__trend">↑ {questionsPracticed.trend}</span>
        </div>

        <div className="prep-stat-box">
          <span className="prep-stat-box__label">Average score</span>
          <span className="prep-stat-box__value">
            {averageScore.value}
            <span className="prep-stat-box__value-sub">/{averageScore.max}</span>
          </span>
          <span className="prep-stat-box__trend">↑ {averageScore.trend}</span>
        </div>

        <div className="prep-stat-box">
          <span className="prep-stat-box__label">Completion</span>
          <div className="prep-stat-box__completion">
            <CircularProgress
              value={completion}
              size={28}
              stroke={4}
              color="indigo"
              showLabel={false}
            />
            <span className="prep-stat-box__value">{completion}%</span>
          </div>
        </div>
      </div>

      <div className="prep-progress__chart-section">
        <div className="prep-progress__chart-header">
          <span className="prep-progress__chart-title">Improvement over time</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="prep-progress__range">
                <span>{PERIOD_LABEL[period]}</span>
                <ChevronDown size={12} strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setPeriod('4w')}>
                Last 4 weeks
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPeriod('8w')}>
                Last 8 weeks
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPeriod('12w')}>
                Last 12 weeks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ImprovementChart weeks={visibleWeeks} />
      </div>

      <WeakAreas items={weakAreas} />
    </section>
  );
}
