import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../lib/theme.ts";

/**
 * Animated dark backdrop with a soft accent glow that drifts across
 * the canvas. Used by every composition so each Reel feels like the
 * same brand without copy-pasting setup code.
 *
 * The drift is intentional — a fully static gradient on TikTok looks
 * like a screenshot, which the algo discounts (low watch time predicted
 * from the cover frame). 90 frames per cycle = 3 seconds at 30fps,
 * slow enough to feel calm, fast enough to register as motion.
 */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const cycle = (frame % 270) / 270;
  const x = interpolate(cycle, [0, 0.5, 1], [0.25, 0.75, 0.25]) * width;
  const y = interpolate(cycle, [0, 0.5, 1], [0.15, 0.6, 0.15]) * height;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${x}px ${y}px, ${COLORS.accentGlow}, transparent 65%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(800px 600px at ${width * 0.5}px ${height * 1.05}px, ${COLORS.accentSoft}, transparent 70%)`,
        }}
      />
      {/* Subtle vignette to anchor text */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
