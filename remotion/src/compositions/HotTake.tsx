import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { z } from "zod";
import { COLORS, FONT } from "../lib/theme.ts";
import { Backdrop } from "../components/Backdrop.tsx";
import { BrandTag } from "../components/BrandTag.tsx";
import { Outro } from "../components/Outro.tsx";
import { fadeRise } from "../lib/easing.ts";

/**
 * "Hot Take" template — for opinion-led Reels.
 *
 * Format:
 *   Cut 1 (0-1.5s)  — hook, sliding into place with kinetic energy
 *   Cut 2 (1.5-12s) — argument, with a "Pourquoi" eyebrow that
 *                     animates in before the body
 *   Cut 3 (12-16.8s)— chase, gradient text, scaling slightly to feel
 *                     like a closer
 *   Outro (16.8-18s)— Career OS brand card (shared)
 *
 * Use for: hooks like "Notion pour ta recherche de stage : mauvaise
 * idée." then a 10s argument then a punchline.
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
const CUT3_END = 16.8 * FPS; // 4.8s window before outro begins

export const HotTake: React.FC<HotTakeProps> = ({ hook, argument, chase }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Each cut renders if we're inside its window OR within the 12-frame
  // tail-out so transitions overlap rather than hard-cut.
  const inCut1 = frame < CUT1_END + 12;
  const inCut2 = frame >= CUT1_END - 6 && frame < CUT2_END + 12;
  const inCut3 = frame >= CUT2_END - 6 && frame < CUT3_END + 12;

  return (
    <AbsoluteFill style={{ fontFamily: FONT.family, color: COLORS.text1 }}>
      <Backdrop />

      {inCut1 && <Cut1 hook={hook} frame={frame} fps={fps} cutEnd={CUT1_END} />}
      {inCut2 && (
        <Cut2 argument={argument} frame={frame - CUT1_END} fps={fps} duration={CUT2_END - CUT1_END} />
      )}
      {inCut3 && (
        <Cut3 chase={chase} frame={frame - CUT2_END} fps={fps} duration={CUT3_END - CUT2_END} />
      )}

      <BrandTag />
      <Outro />
    </AbsoluteFill>
  );
};

// ── Cut 1 — the hook ─────────────────────────────────────────────────────
// A short, punchy slide-in. Outgoing: blur + lift to make space for Cut 2.

const Cut1: React.FC<{ hook: string; frame: number; fps: number; cutEnd: number }> = ({
  hook,
  frame,
  fps,
  cutEnd,
}) => {
  const enter = fadeRise({ frame, fps, stiffness: 240 });
  // Exit anim — last 12 frames, lift up + fade
  const exitFrame = frame - cutEnd;
  const exitProgress = exitFrame > 0 ? Math.min(exitFrame / 12, 1) : 0;
  const exitY = exitProgress * -40;
  const exitOpacity = 1 - exitProgress;

  return (
    <AbsoluteFill
      style={{
        padding: "0 80px",
        justifyContent: "center",
        alignItems: "center",
        opacity: enter.opacity * exitOpacity,
        transform: `translateY(${enter.y + exitY}px)`,
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
// Eyebrow appears first, then the body cascades in line by line.

const Cut2: React.FC<{ argument: string; frame: number; fps: number; duration: number }> = ({
  argument,
  frame,
  fps,
  duration,
}) => {
  const eyebrow = fadeRise({ frame, fps, stiffness: 180 });
  const body = fadeRise({ frame, fps, delay: 8, stiffness: 140 });

  // Exit
  const exitFrame = frame - duration;
  const exitProgress = exitFrame > 0 ? Math.min(exitFrame / 12, 1) : 0;
  const exitOpacity = 1 - exitProgress;
  const exitY = exitProgress * -30;

  return (
    <AbsoluteFill
      style={{
        padding: "0 80px",
        justifyContent: "center",
        alignItems: "flex-start",
        opacity: exitOpacity,
        transform: `translateY(${exitY}px)`,
      }}
    >
      <span
        style={{
          opacity: eyebrow.opacity,
          transform: `translateY(${eyebrow.y}px)`,
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
          opacity: body.opacity,
          transform: `translateY(${body.y}px)`,
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
// Gradient text + a subtle scale-pulse so the closer feels like a closer.

const Cut3: React.FC<{ chase: string; frame: number; fps: number; duration: number }> = ({
  chase,
  frame,
  fps,
  duration,
}) => {
  const enter = fadeRise({ frame, fps, stiffness: 220 });

  // Subtle scale pulse — 1.0 → 1.04 → 1.0 over the cut window
  const pulseFrame = frame / duration;
  const pulse = interpolate(pulseFrame, [0, 0.4, 1], [1, 1.04, 1.02]);

  return (
    <AbsoluteFill
      style={{
        padding: "0 80px",
        justifyContent: "center",
        alignItems: "center",
        opacity: enter.opacity,
        transform: `translateY(${enter.y}px) scale(${pulse})`,
      }}
    >
      <div
        style={{
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          textAlign: "center",
          background: `linear-gradient(135deg, ${COLORS.accent2}, #c7d2fe)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textWrap: "balance",
        }}
      >
        {chase}
      </div>
    </AbsoluteFill>
  );
};
