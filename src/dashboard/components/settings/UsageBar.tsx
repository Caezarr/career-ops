interface UsageBarProps {
  title: string;
  current: number;
  max: number;
  /** Optional small caps eyebrow shown above the title (e.g. "Usage overview"). */
  eyebrow?: string;
}

const formatNumber = (n: number) => n.toLocaleString('en-US');

export default function UsageBar({ title, current, max, eyebrow }: UsageBarProps) {
  const pct = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="settings-usage">
      {eyebrow && (
        <span className="settings-usage__eyebrow">{eyebrow}</span>
      )}
      <div className="settings-usage__title">{title}</div>
      <div className="settings-usage__numbers">
        <span className="settings-usage__current">{formatNumber(current)}</span>
        <span className="settings-usage__max">/ {formatNumber(max)}</span>
      </div>
      <div className="settings-usage__bar" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={max}>
        <div className="settings-usage__bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
