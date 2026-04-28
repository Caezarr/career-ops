interface CircularProgressProps {
  value: number; // 0-100
  size?: number; // px, default 80
  stroke?: number; // px, default 8
  color?: 'green' | 'orange' | 'indigo' | 'red' | string;
  showLabel?: boolean;
  labelSize?: number; // px, default 16
}

const COLOR_MAP: Record<string, string> = {
  green: 'var(--green)',
  orange: 'var(--orange)',
  indigo: 'var(--indigo)',
  red: 'var(--red)',
};

export default function CircularProgress({
  value,
  size = 80,
  stroke = 8,
  color = 'indigo',
  showLabel = true,
  labelSize = 16,
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  const strokeColor = COLOR_MAP[color] ?? color;

  return (
    <div
      className="cv-circular-progress"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      {showLabel && (
        <span
          className="cv-circular-progress__label"
          style={{ fontSize: labelSize, color: strokeColor }}
        >
          {clamped}%
        </span>
      )}
    </div>
  );
}
