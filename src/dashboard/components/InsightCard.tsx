import { useState } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, ArrowRight, Sparkles } from 'lucide-react';
import '../styles/insight.css';
import { InsightsModal } from './shared';
import {
  useDashboardInsight,
  type SparkPoint,
} from '../hooks/useDashboardInsight';

const W = 240; // viewBox width
const H = 60; // viewBox height
const PAD_Y = 6; // top/bottom padding inside the chart

/** Build a smooth (Catmull-Rom-ish) line + area path from the
 *  sparkline points. Returns `{ line, area }` SVG path strings.
 *  Falls back to a flat line at the chart's mid-line when every
 *  point is zero so the SVG always has something to render. */
function buildSparkPaths(spark: SparkPoint[], max: number): {
  line: string;
  area: string;
} {
  if (spark.length === 0) return { line: '', area: '' };
  const n = spark.length;
  const innerH = H - PAD_Y * 2;
  const stepX = W / Math.max(1, n - 1);
  const safeMax = max > 0 ? max : 1;

  const xy = spark.map((p, idx) => {
    const x = idx * stepX;
    const y = PAD_Y + innerH - (p.value / safeMax) * innerH;
    return { x, y };
  });

  // Smooth line via cubic bezier with reflection-style control points.
  let line = `M ${xy[0].x.toFixed(1)} ${xy[0].y.toFixed(1)}`;
  for (let i = 1; i < xy.length; i++) {
    const prev = xy[i - 1];
    const curr = xy[i];
    const cpX = (prev.x + curr.x) / 2;
    line += ` C ${cpX.toFixed(1)} ${prev.y.toFixed(1)}, ${cpX.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }

  // Close to bottom for the gradient fill.
  const last = xy[xy.length - 1];
  const first = xy[0];
  const area = `${line} L ${last.x.toFixed(1)} ${H} L ${first.x.toFixed(1)} ${H} Z`;

  return { line, area };
}

export default function InsightCard() {
  const [open, setOpen] = useState(false);
  const insight = useDashboardInsight();
  const { line, area } = buildSparkPaths(insight.spark, insight.sparkMax);

  // Pick the trend chip — up arrow when delta is positive (or steady
  // and we have data), down arrow when negative. Empty when no
  // delta string was produced.
  const DeltaIcon = !insight.delta
    ? null
    : insight.deltaPositive
    ? ArrowUpRight
    : ArrowDownRight;

  return (
    <section className="insight-card" aria-label="Weekly insight">
      <div className="insight-card__header">
        <span className="insight-card__label">This week</span>
        <TrendingUp size={18} strokeWidth={2} className="insight-card__icon" />
      </div>

      <p className="insight-card__body">
        {insight.headline}
      </p>

      <div className="insight-card__sub">
        {DeltaIcon ? (
          <>
            <span>{insight.delta}</span>
            <DeltaIcon size={12} strokeWidth={2.4} />
          </>
        ) : (
          <>
            <Sparkles size={12} strokeWidth={2.4} />
            <span>{insight.subtext}</span>
          </>
        )}
      </div>

      {insight.hasData ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="insight-card__chart"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="insight-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          {area && <path d={area} fill="url(#insight-grad)" />}
          {line && (
            <path
              d={line}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      ) : (
        // Empty-state placeholder — keeps the card the same height so
        // the layout doesn't jump when the user gets their first data.
        <div className="insight-card__chart-empty" aria-hidden="true">
          14-day activity will appear here
        </div>
      )}

      <button
        type="button"
        className="insight-card__cta"
        onClick={() => setOpen(true)}
        disabled={!insight.hasData}
      >
        View full insights
        <ArrowRight
          size={13}
          strokeWidth={2.4}
          style={{ verticalAlign: 'middle', marginLeft: 6 }}
        />
      </button>

      <InsightsModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
