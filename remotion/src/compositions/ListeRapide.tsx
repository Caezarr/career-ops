import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { z } from "zod";
import { COLORS, FONT } from "../lib/theme.ts";
import { Backdrop } from "../components/Backdrop.tsx";
import { BrandTag } from "../components/BrandTag.tsx";
import { Outro } from "../components/Outro.tsx";
import { fadeRise } from "../lib/easing.ts";

/**
 * "Liste Rapide" template — the save-magnet format.
 *
 * Hook (0-2s) → 5 items revealed in sequence (~3.5s each), each card
 * sliding in from the right and stamping a numbered counter that
 * scales with a spring → CTA card with pulsing Save badge → Outro.
 *
 * Items are big and centred; the user can pause at any point and
 * read everything. That's the secret to save-rate on listicle
 * content.
 *
 * Use for: "5 mots à virer de ton CV en 2026", "3 erreurs CV
 * McKinsey", "4 questions à poser à un partner".
 */

export const listeRapideSchema = z.object({
  hook: z.string(),
  items: z.array(z.string()).min(3).max(7),
  cta: z.string().default("Save pour ton prochain entretien."),
});

export type ListeRapideProps = z.infer<typeof listeRapideSchema>;

const FPS = 30;
const HOOK_FRAMES = 2 * FPS;
const ITEM_FRAMES = Math.round(3.5 * FPS);

export const ListeRapide: React.FC<ListeRapideProps> = ({ hook, items, cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const itemsStart = HOOK_FRAMES;
  const ctaStart = itemsStart + items.length * ITEM_FRAMES;

  const inHook = frame < itemsStart;
  const inItems = frame >= itemsStart && frame < ctaStart;
  const inCta = frame >= ctaStart;

  return (
    <AbsoluteFill style={{ fontFamily: FONT.family, color: COLORS.text1 }}>
      <Backdrop />

      {inHook && <HookFrame text={hook} frame={frame} fps={fps} />}

      {inItems && (
        <ItemFrame
          items={items}
          itemIndex={Math.floor((frame - itemsStart) / ITEM_FRAMES)}
          itemLocalFrame={(frame - itemsStart) % ITEM_FRAMES}
          fps={fps}
        />
      )}

      {inCta && <CtaFrame text={cta} frame={frame - ctaStart} fps={fps} />}

      <BrandTag />
      <Outro />
    </AbsoluteFill>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────────

const HookFrame: React.FC<{ text: string; frame: number; fps: number }> = ({ text, frame, fps }) => {
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
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: "-0.03em",
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

// ── Items ────────────────────────────────────────────────────────────────
//
// Card slides in from the right (x: 60 → 0) on a spring, exits to
// the left during the last 8 frames of the item window. Counter
// number scales from 0.6 → 1 with a punchy spring so each new
// number "stamps" instead of fading in.

const ItemFrame: React.FC<{
  items: string[];
  itemIndex: number;
  itemLocalFrame: number;
  fps: number;
}> = ({ items, itemIndex, itemLocalFrame, fps }) => {
  const current = items[itemIndex];
  if (!current) return null;

  // Card enter — slide-in from the right
  const enterSpring = spring({
    frame: itemLocalFrame,
    fps,
    config: { stiffness: 130, damping: 18 },
  });
  const enterX = interpolate(enterSpring, [0, 1], [60, 0]);
  const enterOpacity = interpolate(enterSpring, [0, 1], [0, 1]);

  // Card exit — slide out to the left at the tail
  const exitFrame = itemLocalFrame - (ITEM_FRAMES - 10);
  const exitProgress = exitFrame > 0 ? Math.min(exitFrame / 10, 1) : 0;
  const exitX = exitProgress * -40;
  const exitOpacity = 1 - exitProgress;

  // Counter "stamp" — scales 0.6 → 1.05 → 1.0 over first 16 frames
  const counterSpring = spring({
    frame: itemLocalFrame - 4,
    fps,
    config: { stiffness: 220, damping: 12 },
  });
  const counterScale = interpolate(counterSpring, [0, 1], [0.6, 1]);

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
          opacity: enterOpacity * exitOpacity,
          transform: `translateX(${enterX + exitX}px)`,
          background: "rgba(20, 22, 29, 0.78)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 32,
          padding: "56px 48px",
          display: "flex",
          flexDirection: "column",
          gap: 32,
          boxShadow: `0 24px 64px -12px rgba(0,0,0,0.5)`,
        }}
      >
        {/* counter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: COLORS.accent2,
            fontFamily: FONT.mono,
            fontSize: 32,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              transform: `scale(${counterScale})`,
              transformOrigin: "left center",
              display: "inline-block",
            }}
          >
            {String(itemIndex + 1).padStart(2, "0")}
          </span>
          <span style={{ color: COLORS.text3 }}>
            / {String(items.length).padStart(2, "0")}
          </span>
        </div>
        {/* item */}
        <div
          style={{
            fontSize: 70,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.18,
            color: COLORS.text1,
          }}
        >
          {current}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── CTA ──────────────────────────────────────────────────────────────────

const CtaFrame: React.FC<{ text: string; frame: number; fps: number }> = ({ text, frame, fps }) => {
  const enter = fadeRise({ frame, fps, stiffness: 200 });
  // Pulse on the Save badge — 1.0 → 1.06 → 1.0 forever-loop while CTA is on
  const pulseFrame = (frame % 30) / 30;
  const pulse = interpolate(pulseFrame, [0, 0.5, 1], [1, 1.06, 1]);

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
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          color: COLORS.text1,
          textAlign: "center",
          marginBottom: 56,
          textWrap: "balance",
        }}
      >
        {text}
      </div>
      <div style={{ transform: `scale(${pulse})` }}>
        <SaveBadge />
      </div>
    </AbsoluteFill>
  );
};

const SaveBadge: React.FC = () => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 16,
      padding: "22px 40px",
      background: COLORS.accent,
      borderRadius: 999,
      fontSize: 44,
      fontWeight: 700,
      color: "white",
      boxShadow: `0 28px 72px -12px ${COLORS.accentGlow}`,
    }}
  >
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3 H19 V21 L12 16 L5 21 Z"
        stroke="white"
        strokeWidth="2.4"
        strokeLinejoin="round"
        fill="rgba(255,255,255,0.18)"
      />
    </svg>
    Save
  </div>
);
