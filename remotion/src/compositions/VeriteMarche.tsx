import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { z } from "zod";
import { COLORS, FONT } from "../lib/theme.ts";
import { Backdrop } from "../components/Backdrop.tsx";
import { BrandTag } from "../components/BrandTag.tsx";
import { Outro } from "../components/Outro.tsx";
import { fadeRise } from "../lib/easing.ts";

/**
 * "Vérité Marché" template — for educational / data-driven Reels.
 *
 * Hook (0-2s) → Big stat counter that ticks up from 0 to the target
 * value (2-7s) → Explanation card (7-18s) → CTA (18-21s) → Outro.
 *
 * The number-counting reveal on the stat is the differentiator vs
 * the previous version: a static "65%" reads as a graphic; a "0%
 * → 65%" tick reads as live data the viewer is watching unfold.
 *
 * Use for: "J'ai analysé 500 questions McKinsey. 3 patterns
 * émergent.", "Les recruteurs MBB lisent ton CV en 6s — voici la
 * heatmap", "Combien de candidatures par semaine pour un summer
 * en M&A ?"
 */

export const veriteMarcheSchema = z.object({
  hook: z.string(),
  /** The headline statistic. Leading number (with optional decimal)
   *  is parsed and animated as a counter from 0; everything after
   *  the number is the suffix shown verbatim ("%", "s", " patterns",
   *  etc). e.g. "65%" → ticks 0→65 then "%" pinned. "Top 5" → just
   *  fades in (no leading number). */
  stat: z.string(),
  /** Label below the stat. e.g. "le temps moyen passé sur ton CV". */
  statLabel: z.string(),
  /** Body explanation. Stays under ~250 chars for legibility at 9:16. */
  explanation: z.string(),
  /** Call to action / closing punch. Short. */
  cta: z.string().default("Career OS scanne ce que les recruteurs voient en 6s."),
});

export type VeriteMarcheProps = z.infer<typeof veriteMarcheSchema>;

const FPS = 30;
const HOOK_END = 2 * FPS;
const STAT_END = 7 * FPS;
const EXPLAIN_END = 18 * FPS;

export const VeriteMarche: React.FC<VeriteMarcheProps> = ({
  hook,
  stat,
  statLabel,
  explanation,
  cta,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inHook = frame < HOOK_END;
  const inStat = frame >= HOOK_END && frame < STAT_END;
  const inExplain = frame >= STAT_END && frame < EXPLAIN_END;
  const inCta = frame >= EXPLAIN_END;

  return (
    <AbsoluteFill style={{ fontFamily: FONT.family, color: COLORS.text1 }}>
      <Backdrop />
      <DataGrid />

      {inHook && <Hook text={hook} frame={frame} fps={fps} />}

      {inStat && (
        <Stat
          stat={stat}
          label={statLabel}
          frame={frame - HOOK_END}
          fps={fps}
        />
      )}

      {inExplain && (
        <Explanation text={explanation} frame={frame - STAT_END} fps={fps} />
      )}

      {inCta && <Cta text={cta} frame={frame - EXPLAIN_END} fps={fps} />}

      <BrandTag />
      <Outro />
    </AbsoluteFill>
  );
};

// ── Decorative grid behind everything ────────────────────────────────────
// Subtle dot pattern signals "data". Rendered in absolute coords; the
// scrim from Backdrop already softens it so it never competes with text.

const DataGrid: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.08) 1px, transparent 0)`,
        backgroundSize: "48px 48px",
        opacity: 0.6,
      }}
    />
  );
};

// ── Hook ─────────────────────────────────────────────────────────────────

const Hook: React.FC<{ text: string; frame: number; fps: number }> = ({ text, frame, fps }) => {
  const { opacity, y } = fadeRise({ frame, fps, stiffness: 240 });
  return (
    <AbsoluteFill
      style={{
        padding: "0 72px",
        justifyContent: "center",
        alignItems: "center",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          textAlign: "center",
          textWrap: "balance",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// ── Stat — animated counter ──────────────────────────────────────────────

interface ParsedStat {
  value: number | null;
  decimals: number;
  suffix: string;
}

function parseStat(stat: string): ParsedStat {
  // Match a leading number (optional decimal) and capture everything after
  const match = stat.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) return { value: null, decimals: 0, suffix: stat };
  const raw = match[1].replace(",", ".");
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return {
    value: parseFloat(raw),
    decimals,
    suffix: match[2],
  };
}

const Stat: React.FC<{ stat: string; label: string; frame: number; fps: number }> = ({
  stat,
  label,
  frame,
  fps,
}) => {
  const parsed = parseStat(stat);

  // Animate counter over the first 30 frames (1s) — ease-out so the
  // last digits land softly rather than slamming
  const counterProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3), // cubic ease-out
  });

  const displayValue =
    parsed.value !== null
      ? (parsed.value * counterProgress).toFixed(parsed.decimals)
      : null;

  // Big block fade-in
  const big = fadeRise({ frame, fps, stiffness: 160 });
  // Label cascades in after the counter finishes
  const small = fadeRise({ frame, fps, delay: 24, stiffness: 200 });
  // Underline sweep behind the label
  const underlineProgress = interpolate(frame - 30, [0, 16], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        padding: "0 72px",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity: big.opacity,
          transform: `translateY(${big.y}px)`,
          fontSize: 300,
          fontWeight: 800,
          letterSpacing: "-0.06em",
          lineHeight: 0.95,
          background: `linear-gradient(135deg, ${COLORS.accent2}, #c7d2fe)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {displayValue !== null ? `${displayValue}${parsed.suffix}` : stat}
      </div>

      <div
        style={{
          position: "relative",
          display: "inline-block",
          marginTop: 36,
        }}
      >
        <div
          style={{
            opacity: small.opacity,
            transform: `translateY(${small.y}px)`,
            fontSize: 44,
            fontWeight: 500,
            color: COLORS.text2,
            letterSpacing: "-0.01em",
            textAlign: "center",
            maxWidth: 760,
            textWrap: "balance",
            paddingBottom: 8,
          }}
        >
          {label}
        </div>
        {/* Underline — animates left → right beneath the label */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            height: 3,
            width: `${underlineProgress}%`,
            background: `linear-gradient(90deg, ${COLORS.accent2}, transparent)`,
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ── Explanation ──────────────────────────────────────────────────────────
// Card slides up from below + the card border has a subtle accent
// glow to draw attention to the "Pourquoi" framing.

const Explanation: React.FC<{ text: string; frame: number; fps: number }> = ({
  text,
  frame,
  fps,
}) => {
  const { opacity, y } = fadeRise({ frame, fps, stiffness: 140 });
  return (
    <AbsoluteFill
      style={{
        padding: "0 80px",
        justifyContent: "center",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          background: "rgba(20, 22, 29, 0.82)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 32,
          padding: "56px 48px",
          boxShadow: `0 32px 80px -20px ${COLORS.accentGlow}`,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: COLORS.accent2,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            marginBottom: 32,
          }}
        >
          Pourquoi
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            color: COLORS.text1,
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── CTA ──────────────────────────────────────────────────────────────────

const Cta: React.FC<{ text: string; frame: number; fps: number }> = ({ text, frame, fps }) => {
  const enter = fadeRise({ frame, fps, stiffness: 200 });
  // Pulse the badge subtly, like a heartbeat
  const pulseFrame = (frame % 30) / 30;
  const pulse = interpolate(pulseFrame, [0, 0.5, 1], [1, 1.05, 1]);

  return (
    <AbsoluteFill
      style={{
        padding: "0 80px",
        justifyContent: "center",
        alignItems: "center",
        opacity: enter.opacity,
        transform: `translateY(${enter.y}px)`,
      }}
    >
      <div
        style={{
          fontSize: 68,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.18,
          color: COLORS.text1,
          textAlign: "center",
          marginBottom: 56,
          maxWidth: 920,
          textWrap: "balance",
        }}
      >
        {text}
      </div>
      <div
        style={{
          transform: `scale(${pulse})`,
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          padding: "22px 40px",
          background: COLORS.accent,
          borderRadius: 999,
          fontSize: 38,
          fontWeight: 700,
          color: "white",
          boxShadow: `0 28px 72px -12px ${COLORS.accentGlow}`,
        }}
      >
        Beta · lien en bio
        <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8 H13 M9 4 L13 8 L9 12"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
