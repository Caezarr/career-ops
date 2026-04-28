interface ScoreMetricProps {
  label: string;
  value: number;
}

export default function ScoreMetric({ label, value }: ScoreMetricProps) {
  const tone = value >= 8 ? 'green' : value >= 6 ? 'orange' : 'red';
  const widthPct = Math.max(0, Math.min(100, (value / 10) * 100));

  return (
    <div className="prep-metric">
      <span className="prep-metric__label">{label}</span>
      <span className="prep-metric__value">{value.toFixed(1)}</span>
      <div className="prep-metric__bar" aria-hidden="true">
        <div
          className={`prep-metric__bar-fill prep-metric__bar-fill--${tone}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}
