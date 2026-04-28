import { ChevronDown } from 'lucide-react';
import { mockProgress } from '../../data/prep';
import CircularProgress from '../cv/CircularProgress';
import ImprovementChart from './ImprovementChart';
import WeakAreas from './WeakAreas';

export default function ProgressCard() {
  const { questionsPracticed, averageScore, completion, weeks, weakAreas } = mockProgress;

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
          <button type="button" className="prep-progress__range">
            <span>Last 8 weeks</span>
            <ChevronDown size={12} strokeWidth={2} />
          </button>
        </div>
        <ImprovementChart weeks={weeks} />
      </div>

      <WeakAreas items={weakAreas} />
    </section>
  );
}
