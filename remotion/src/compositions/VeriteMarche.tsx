import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { COLORS, FONT } from "../lib/theme.ts";
import { Backdrop } from "../components/Backdrop.tsx";
import { BrandTag } from "../components/BrandTag.tsx";
import { fadeRise } from "../lib/easing.ts";

/**
 * "Vérité Marché" template — for educational / data-driven Reels.
 *
 * Hook (0-2s) → Big stat with label (2-7s) → Explanation (7-18s)
 * → CTA (18-22s). Shows authoritative knowledge, the kind that
 * earns saves AND follows simultaneously.
 *
 * Use for: "J'ai analysé 500 questions McKinsey. 3 patterns
 * émergent.", "Les recruteurs MBB lisent ton CV en 6s — voici la
 * heatmap", "Combien de candidatures par semaine pour un summer
 * en M&A ?"
 */

export const veriteMarcheSchema = z.object({
  hook: z.string(),
  /** The headline statistic — short. e.g. "6 secondes". */
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
    </AbsoluteFill>
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

// ── Stat ─────────────────────────────────────────────────────────────────

const Stat: React.FC<{ stat: string; label: string; frame: number; fps: number }> = ({
  stat,
  label,
  frame,
  fps,
}) => {
  const big = fadeRise({ frame, fps, stiffness: 160 });
  const small = fadeRise({ frame, fps, delay: 18, stiffness: 200 });
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
          fontSize: 280,
          fontWeight: 800,
          letterSpacing: "-0.06em",
          lineHeight: 0.95,
          background: `linear-gradient(135deg, ${COLORS.accent2}, #c7d2fe)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textAlign: "center",
        }}
      >
        {stat}
      </div>
      <div
        style={{
          opacity: small.opacity,
          transform: `translateY(${small.y}px)`,
          fontSize: 44,
          fontWeight: 500,
          color: COLORS.text2,
          letterSpacing: "-0.01em",
          textAlign: "center",
          marginTop: 32,
          maxWidth: 760,
          textWrap: "balance",
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

// ── Explanation ──────────────────────────────────────────────────────────

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
          background: "rgba(20, 22, 29, 0.78)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 32,
          padding: "56px 48px",
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
  const { opacity, y } = fadeRise({ frame, fps, stiffness: 200 });
  return (
    <AbsoluteFill
      style={{
        padding: "0 80px",
        justifyContent: "center",
        alignItems: "center",
        opacity,
        transform: `translateY(${y}px)`,
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
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          padding: "20px 36px",
          background: COLORS.accent,
          borderRadius: 999,
          fontSize: 36,
          fontWeight: 700,
          color: "white",
          boxShadow: `0 24px 64px -12px ${COLORS.accentGlow}`,
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
