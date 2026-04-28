import type { WeekPoint } from '../../data/prep';

interface ImprovementChartProps {
  weeks: WeekPoint[];
}

// Inline SVG line chart with subtle dotted gridlines and a smooth-ish polyline
// rendered with a Catmull-Rom-to-Bezier conversion for visual smoothness.
export default function ImprovementChart({ weeks }: ImprovementChartProps) {
  const W = 280;
  const H = 120;
  const PAD_L = 22;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 22;

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const yMax = 10;
  const yMin = 0;
  const yTicks = [0, 5, 10];

  const xFor = (i: number) =>
    PAD_L + (weeks.length === 1 ? innerW / 2 : (i / (weeks.length - 1)) * innerW);
  const yFor = (v: number) =>
    PAD_T + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const points = weeks.map((w, i) => ({ x: xFor(i), y: yFor(w.value) }));

  // Catmull-Rom-ish smooth path
  const smoothPath = (() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  })();

  // Area path under the smooth line for soft fill
  const areaPath = `${smoothPath} L ${points[points.length - 1].x} ${PAD_T + innerH} L ${points[0].x} ${PAD_T + innerH} Z`;

  return (
    <svg
      className="prep-chart"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="120"
      preserveAspectRatio="none"
      role="img"
      aria-label="Improvement over time"
    >
      <defs>
        <linearGradient id="prepChartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--indigo)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--indigo)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y gridlines */}
      {yTicks.map((t) => {
        const y = yFor(t);
        return (
          <g key={`grid-${t}`}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y}
              y2={y}
              stroke="var(--border-soft)"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
            <text
              x={PAD_L - 6}
              y={y + 3}
              fontSize="9"
              fill="var(--text-3)"
              textAnchor="end"
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* Area + line */}
      <path d={areaPath} fill="url(#prepChartFill)" />
      <path
        d={smoothPath}
        fill="none"
        stroke="var(--indigo)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((p, i) => (
        <circle
          key={`pt-${i}`}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="var(--indigo)"
        />
      ))}

      {/* X axis labels */}
      {weeks.map((w, i) => (
        <text
          key={`xl-${w.label}`}
          x={xFor(i)}
          y={H - 6}
          fontSize="9"
          fill="var(--text-3)"
          textAnchor="middle"
        >
          {w.label}
        </text>
      ))}
    </svg>
  );
}
