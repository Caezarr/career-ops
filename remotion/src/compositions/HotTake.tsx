import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { COLORS, FONT } from "../lib/theme.ts";
import { Backdrop } from "../components/Backdrop.tsx";
import { BrandTag } from "../components/BrandTag.tsx";
import { fadeRise } from "../lib/easing.ts";

/**
 * "Hot Take" template — for opinion-led Reels.
 *
 * Format: 3 cuts.
 *   Cut 1 (0-1.5s)  — the hook, lands hard.
 *   Cut 2 (1.5-12s) — the argument, paragraph form, big text.
 *   Cut 3 (12-18s)  — the chase, sharper / shorter.
 *
 * Use for: hooks like "Notion pour ta recherche de stage : mauvaise
 * idée." then a 10s argument then a punchline. ~20s reels score best
 * on TikTok save-rate for opinion content (Q4 2025 data).
 */

export const hotTakeSchema = z.object({
  hook: z.string(),
  argument: z.string(),
  chase: z.string(),
});

export type HotTakeProps = z.infer<typeof hotTakeSchema>;

const FPS = 30;
const CUT1_END = 1.5 * FPS;
const CUT2_END = 12 * FPS;

export const HotTake: React.FC<HotTakeProps> = ({ hook, argument, chase }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inCut1 = frame < CUT1_END;
  const inCut2 = frame >= CUT1_END && frame < CUT2_END;
  const inCut3 = frame >= CUT2_END;

  return (
    <AbsoluteFill style={{ fontFamily: FONT.family, color: COLORS.text1 }}>
      <Backdrop />

      {inCut1 && <Cut1 hook={hook} frame={frame} fps={fps} />}
      {inCut2 && <Cut2 argument={argument} frame={frame - CUT1_END} fps={fps} />}
      {inCut3 && <Cut3 chase={chase} frame={frame - CUT2_END} fps={fps} />}

      <BrandTag />
    </AbsoluteFill>
  );
};

// ── Cut 1 — the hook ─────────────────────────────────────────────────────

const Cut1: React.FC<{ hook: string; frame: number; fps: number }> = ({ hook, frame, fps }) => {
  const { opacity, y } = fadeRise({ frame, fps, stiffness: 220 });
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
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          textAlign: "center",
          textWrap: "balance",
        }}
      >
        {hook}
      </div>
    </AbsoluteFill>
  );
};

// ── Cut 2 — the argument ─────────────────────────────────────────────────

const Cut2: React.FC<{ argument: string; frame: number; fps: number }> = ({
  argument,
  frame,
  fps,
}) => {
  const { opacity, y } = fadeRise({ frame, fps, stiffness: 160 });
  return (
    <AbsoluteFill
      style={{
        padding: "0 80px",
        justifyContent: "center",
        alignItems: "flex-start",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <span
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
      </span>
      <div
        style={{
          fontSize: 64,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
        }}
      >
        {argument}
      </div>
    </AbsoluteFill>
  );
};

// ── Cut 3 — the chase ────────────────────────────────────────────────────

const Cut3: React.FC<{ chase: string; frame: number; fps: number }> = ({ chase, frame, fps }) => {
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
          fontSize: 84,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          textAlign: "center",
          background: `linear-gradient(135deg, ${COLORS.accent2}, #c7d2fe)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {chase}
      </div>
    </AbsoluteFill>
  );
};
