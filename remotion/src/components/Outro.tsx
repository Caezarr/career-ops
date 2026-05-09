import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONT } from "../lib/theme.ts";

/**
 * Brand outro card. Shown for the last ~1.2s of every composition so
 * a paused frame at the end always says "this was Career OS, beta
 * link in bio". The card scales up gently with a spring + the
 * underline sweeps in from the left.
 *
 * Compositions reserve the final OUTRO_FRAMES window so their last
 * cut overlaps the outro start (the scrim fades them out cleanly).
 */

export const OUTRO_FRAMES = 36; // 1.2s at 30fps
const SCRIM_FRAMES = 10; // first 10 frames the page fades to dim

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const localFrame = frame - (durationInFrames - OUTRO_FRAMES);
  if (localFrame < 0) return null;

  // Scrim fades the previous content out so the outro reads cleanly
  const scrim = interpolate(localFrame, [0, SCRIM_FRAMES], [0, 0.78], {
    extrapolateRight: "clamp",
  });

  // Card scales in with a spring after the scrim starts
  const cardSpring = spring({
    frame: localFrame - 4,
    fps,
    config: { stiffness: 150, damping: 16 },
  });
  const cardScale = interpolate(cardSpring, [0, 1], [0.92, 1]);
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

  // Underline sweeps left → right, lags behind card
  const underlineFrame = localFrame - 12;
  const underlineWidth = interpolate(underlineFrame, [0, 16], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `rgba(10, 11, 15, ${scrim})`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT.family,
      }}
    >
      <div
        style={{
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
          padding: "56px 64px",
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderStrong}`,
          borderRadius: 32,
          boxShadow: `0 32px 80px -20px ${COLORS.accentGlow}`,
          textAlign: "center",
          minWidth: 720,
        }}
      >
        {/* Logo + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              display: "grid",
              placeItems: "center",
              background: COLORS.bgElev,
              border: `1px solid ${COLORS.borderStrong}`,
              borderRadius: 10,
              color: COLORS.accent2,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3 L13 3 L13 6 L6.5 6 L6.5 7.5 L11.5 7.5 L11.5 10.5 L6.5 10.5 L6.5 13 L3 13 Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: COLORS.text1,
              letterSpacing: "-0.03em",
            }}
          >
            Career OS
          </span>
        </div>

        {/* Tagline with sweeping underline */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: COLORS.text2,
              letterSpacing: "-0.01em",
            }}
          >
            careeros.app
          </span>
          <span
            style={{
              position: "absolute",
              left: 0,
              bottom: -8,
              height: 3,
              width: `${underlineWidth}%`,
              background: `linear-gradient(90deg, ${COLORS.accent2}, transparent)`,
              borderRadius: 2,
            }}
          />
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 28,
            fontWeight: 500,
            color: COLORS.text3,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Beta privée · lien en bio
        </div>
      </div>
    </AbsoluteFill>
  );
};
