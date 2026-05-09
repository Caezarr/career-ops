import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { COLORS, FONT } from "../lib/theme.ts";
import { Backdrop } from "../components/Backdrop.tsx";
import { BrandTag } from "../components/BrandTag.tsx";
import { fadeRise } from "../lib/easing.ts";

/**
 * "Liste Rapide" template — the save-magnet format.
 *
 * Hook (0-2s) → 5 items revealed in sequence (~3.5s each) → CTA card.
 * Total ~22s. Items are big and centred; the user can pause the
 * Reel at any point and still read everything. That's the secret to
 * save-rate on listicle content.
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

const ItemFrame: React.FC<{
  items: string[];
  itemIndex: number;
  itemLocalFrame: number;
  fps: number;
}> = ({ items, itemIndex, itemLocalFrame, fps }) => {
  const current = items[itemIndex];
  if (!current) return null;
  const { opacity, y } = fadeRise({ frame: itemLocalFrame, fps, stiffness: 200 });

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
          display: "flex",
          flexDirection: "column",
          gap: 32,
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
          <span style={{ fontSize: 80, fontWeight: 800 }}>
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
      <SaveBadge />
    </AbsoluteFill>
  );
};

const SaveBadge: React.FC = () => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 16,
      padding: "20px 36px",
      background: COLORS.accent,
      borderRadius: 999,
      fontSize: 40,
      fontWeight: 700,
      color: "white",
      boxShadow: `0 24px 64px -12px ${COLORS.accentGlow}`,
    }}
  >
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3 H19 V21 L12 16 L5 21 Z"
        stroke="white"
        strokeWidth="2.4"
        strokeLinejoin="round"
        fill="rgba(255,255,255,0.15)"
      />
    </svg>
    Save
  </div>
);
