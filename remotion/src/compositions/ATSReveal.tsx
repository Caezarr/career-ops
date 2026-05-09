import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { z } from "zod";
import { COLORS, FONT } from "../lib/theme.ts";
import { Outro } from "../components/Outro.tsx";
import { fadeRise } from "../lib/easing.ts";

/**
 * "ATS Reveal" — Direction B v2 (premium product showcase).
 *
 * Layout philosophy:
 *   - Aggressive hook with stabilo-highlighted keyword
 *   - 3D-tilted mockup window with accent halo
 *   - Decorative floating chips peeking around the mockup
 *   - Score reveal climax: flash + particle burst + scale pop
 *   - Animated underline sweep on bottom tagline
 *
 * Frame budget (12s = 360 frames at 30fps):
 *   0.0 – 1.5s : hook + stabilo highlight on "ATS"
 *   1.5 – 3.0s : mockup tilts in, decorative chips orbit in
 *   3.0 – 4.0s : cursor approaches "Analyse" button, clicks
 *   4.0 – 5.5s : progress bar fills, scanning line sweeps the CV
 *   5.5 – 7.5s : donut animates 0 → 82%, climax flash at landing
 *   7.5 – 10.0s: callout sticker rotates in, recs cards stagger
 *  10.0 – 12.0s: bottom tagline + underline + outro
 */

export const atsRevealSchema = z.object({
  hook: z.string().default("Sache si tu passes l'ATS avant d'envoyer."),
  highlightWord: z.string().default("l'ATS"),
  jobLabel: z.string().default("Senior Strategy Associate · Bain & Company"),
  matchScore: z.number().int().min(0).max(99).default(82),
  taglineBottom: z.string().default("Score temps réel CV vs JD. En local. 2 secondes."),
});

export type ATSRevealProps = z.infer<typeof atsRevealSchema>;

const FPS = 30;
const MOCKUP_IN = 1.5 * FPS;
const CLICK_AT = 3.5 * FPS;
const BAR_FILL_START = 4.0 * FPS;
const BAR_FILL_END = 5.5 * FPS;
const DONUT_START = 5.5 * FPS;
const DONUT_LAND = DONUT_START + 50;
const CALLOUT_AT = 7.6 * FPS;

export const ATSReveal: React.FC<ATSRevealProps> = ({
  hook,
  highlightWord,
  jobLabel,
  matchScore,
  taglineBottom,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT.family,
        background: COLORS.bg,
        color: COLORS.text1,
      }}
    >
      <BackgroundLayer />
      <FloatingChips frame={frame} fps={fps} />

      <Hook
        text={hook}
        highlight={highlightWord}
        frame={frame}
        fps={fps}
      />

      <Mockup
        jobLabel={jobLabel}
        matchScore={matchScore}
        frame={frame}
        fps={fps}
      />

      <ScoreLandFlash frame={frame} />

      <BottomTagline text={taglineBottom} frame={frame} fps={fps} />

      <Cursor frame={frame} fps={fps} />

      <Outro />

      <Grain />
    </AbsoluteFill>
  );
};

// ── Background ──────────────────────────────────────────────────────────

const BackgroundLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (frame % 240) / 240;
  const x1 = interpolate(t, [0, 0.5, 1], [0.2, 0.8, 0.2]) * 1080;
  const y1 = interpolate(t, [0, 0.5, 1], [0.3, 0.7, 0.3]) * 1920;
  const x2 = interpolate(t, [0, 0.5, 1], [0.85, 0.15, 0.85]) * 1080;
  const y2 = interpolate(t, [0, 0.5, 1], [0.6, 0.2, 0.6]) * 1920;

  return (
    <>
      <AbsoluteFill style={{ background: "#0A0B0F" }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${x1}px ${y1}px, rgba(99, 102, 241, 0.36), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(700px 700px at ${x2}px ${y2}px, rgba(236, 72, 153, 0.24), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(500px 500px at 90% 95%, rgba(34, 211, 238, 0.16), transparent 70%)`,
        }}
      />
      {/* Diagonal grid for depth */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.06) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
          opacity: 0.7,
          maskImage: "radial-gradient(circle at 50% 50%, black 30%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 30%, transparent 90%)",
        }}
      />
      {/* Subtle drifting particles */}
      <Particles />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </>
  );
};

const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  // 16 particles drifting upward at different speeds
  const particles = Array.from({ length: 16 }, (_, i) => {
    const seed = i * 137;
    const xBase = ((seed * 17) % 1080);
    const speed = 0.3 + ((seed * 7) % 70) / 100;
    const y = 1920 - ((frame * speed * 4 + seed * 23) % 2200);
    const opacity = 0.35 + ((seed * 11) % 30) / 100;
    const size = 2 + (seed % 4);
    return { x: xBase, y, opacity, size, key: i };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {particles.map((p) => (
        <div
          key={p.key}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: COLORS.accent2,
            opacity: p.opacity,
            filter: "blur(0.5px)",
            boxShadow: `0 0 ${p.size * 2}px ${COLORS.accent}`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ── Floating decorative chips around the mockup ────────────────────────

const FloatingChips: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  // 4 decorative chips positioned at the mockup corners. They peek
  // OVER the mockup edge slightly (rotated, sticker-style) so they
  // never get cropped at the frame edges. Coordinates picked to land
  // in the visible 24-1056 horizontal band.
  const items = [
    {
      label: "82% match",
      icon: "★",
      x: 80,
      y: 410,
      delay: 24,
      rotate: -7,
      bg: "rgba(16, 185, 129, 0.16)",
      border: "rgba(16, 185, 129, 0.55)",
      color: "#34D399",
    },
    {
      label: "12 entretiens",
      icon: "▶",
      x: 800,
      y: 430,
      delay: 32,
      rotate: 6,
      bg: "rgba(99, 102, 241, 0.18)",
      border: "rgba(99, 102, 241, 0.55)",
      color: COLORS.accent2,
    },
    {
      label: "Bain · screen",
      icon: "●",
      x: 80,
      y: 1410,
      delay: 40,
      rotate: 4,
      bg: "rgba(245, 158, 11, 0.16)",
      border: "rgba(245, 158, 11, 0.5)",
      color: "#FBBF24",
    },
    {
      label: "Anthropic · final",
      icon: "✓",
      x: 770,
      y: 1440,
      delay: 48,
      rotate: -5,
      bg: "rgba(236, 72, 153, 0.16)",
      border: "rgba(236, 72, 153, 0.5)",
      color: "#F472B6",
    },
  ];

  return (
    <>
      {items.map((item) => {
        const localFrame = frame - (MOCKUP_IN + item.delay);
        if (localFrame < 0) return null;
        const sp = spring({
          frame: localFrame,
          fps,
          config: { stiffness: 130, damping: 14 },
        });
        const opacity = interpolate(sp, [0, 1], [0, 0.92]);
        const scale = interpolate(sp, [0, 1], [0.7, 1]);
        // Drift over time
        const drift = Math.sin((frame + item.delay) / 30) * 8;
        return (
          <div
            key={item.label}
            style={{
              position: "absolute",
              left: item.x,
              top: item.y + drift,
              opacity,
              transform: `scale(${scale}) rotate(${item.rotate}deg)`,
              padding: "10px 16px",
              borderRadius: 12,
              background: item.bg,
              border: `1px solid ${item.border}`,
              backdropFilter: "blur(8px)",
              color: item.color,
              fontSize: 18,
              fontWeight: 700,
              fontFamily: FONT.family,
              letterSpacing: "-0.01em",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: `0 12px 32px rgba(0,0,0,0.45)`,
              zIndex: 15,
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </div>
        );
      })}
    </>
  );
};

// ── Grain overlay ───────────────────────────────────────────────────────

const Grain: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      opacity: 0.16,
      mixBlendMode: "overlay",
      pointerEvents: "none",
    }}
  />
);

// ── Hook with stabilo highlight ─────────────────────────────────────────

const Hook: React.FC<{ text: string; highlight: string; frame: number; fps: number }> = ({
  text,
  highlight,
  frame,
  fps,
}) => {
  const eyebrow = fadeRise({ frame, fps, stiffness: 220 });
  const main = fadeRise({ frame, fps, delay: 6, stiffness: 180 });

  // Stabilo bar draws in over the highlight word
  const stabiloProgress = interpolate(frame, [22, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });

  // Split text around the highlight word
  const before = text.split(highlight)[0] ?? "";
  const after = text.split(highlight)[1] ?? "";

  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        left: 60,
        right: 60,
      }}
    >
      <div
        style={{
          opacity: eyebrow.opacity,
          transform: `translateY(${eyebrow.y}px)`,
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 20px",
          background: "rgba(99, 102, 241, 0.16)",
          border: "1px solid rgba(99, 102, 241, 0.35)",
          borderRadius: 999,
          color: COLORS.accent2,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: COLORS.accent2,
            boxShadow: `0 0 16px ${COLORS.accent2}`,
          }}
        />
        Career OS · ATS Analyzer
      </div>
      <h1
        style={{
          opacity: main.opacity,
          transform: `translateY(${main.y}px)`,
          fontSize: 100,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1.0,
          margin: 0,
          maxWidth: "100%",
          textWrap: "balance" as const,
        }}
      >
        {before}
        <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
          {/* Stabilo highlighter behind the word — tall enough to cover
              ascenders (l, t, etc.) and the apostrophe so the text never
              "pokes out" of the highlight. */}
          <span
            style={{
              position: "absolute",
              left: -10,
              right: -10,
              top: "10%",
              bottom: "8%",
              background: "linear-gradient(90deg, rgba(251, 191, 36, 0.95), rgba(251, 191, 36, 0.82))",
              transform: `scaleX(${stabiloProgress})`,
              transformOrigin: "left center",
              borderRadius: 6,
              zIndex: -1,
              boxShadow: "0 0 32px rgba(251, 191, 36, 0.4)",
            }}
          />
          <span style={{ position: "relative", color: stabiloProgress > 0.95 ? "#0E1422" : COLORS.text1 }}>
            {highlight}
          </span>
        </span>
        {after}
      </h1>
    </div>
  );
};

// ── Mockup with 3D tilt ─────────────────────────────────────────────────

const Mockup: React.FC<{
  jobLabel: string;
  matchScore: number;
  frame: number;
  fps: number;
}> = ({ jobLabel, matchScore, frame, fps }) => {
  const localFrame = frame - MOCKUP_IN;
  const enterSpring = spring({
    frame: localFrame,
    fps,
    config: { stiffness: 110, damping: 18 },
  });
  const enterY = interpolate(enterSpring, [0, 1], [80, 0]);
  const enterOpacity = interpolate(enterSpring, [0, 1], [0, 1]);

  // Subtle continuous breathe — scale 1.0 ↔ 1.005
  const breathe = 1 + Math.sin(frame / 60) * 0.005;

  return (
    <div
      style={{
        position: "absolute",
        top: 460,
        left: 80,
        right: 80,
        opacity: enterOpacity,
        transform: `translateY(${enterY}px) perspective(2000px) rotateY(-1.5deg) rotateX(0.5deg) scale(${breathe})`,
        transformStyle: "preserve-3d",
        zIndex: 10,
      }}
    >
      {/* Accent halo behind window */}
      <div
        style={{
          position: "absolute",
          inset: -40,
          background: "radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.45), transparent 60%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          opacity: enterOpacity,
        }}
      />
      <div
        style={{
          position: "relative",
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderStrong}`,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: `0 60px 120px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)`,
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
            opacity: 0.6,
          }}
        />
        {/* macOS chrome */}
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 22px",
            background: COLORS.bgElev,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#febc2e" }} />
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#28c840" }} />
          <span
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 18,
              fontWeight: 600,
              color: COLORS.text2,
              letterSpacing: "-0.01em",
            }}
          >
            Career OS — CV Manager
          </span>
          <span style={{ width: 60 }} />
        </div>

        <div style={{ display: "flex", height: 870 }}>
          <div
            style={{
              flex: 1,
              padding: 32,
              borderRight: `1px solid ${COLORS.border}`,
              background: "linear-gradient(180deg, #1A1D26, #14161D)",
              position: "relative",
            }}
          >
            <CVPreview frame={frame} />
            <ScanLine frame={frame} />
          </div>

          <div
            style={{
              flex: 1,
              padding: 32,
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            <ATSPanel
              jobLabel={jobLabel}
              matchScore={matchScore}
              frame={frame}
              fps={fps}
            />
          </div>
        </div>
      </div>

      <Callout frame={frame} matchScore={matchScore} />
    </div>
  );
};

// ── Scanning line that sweeps the CV during analysis ───────────────────

const ScanLine: React.FC<{ frame: number }> = ({ frame }) => {
  const inAnalysis = frame >= BAR_FILL_START && frame <= BAR_FILL_END + 4;
  if (!inAnalysis) return null;

  const t = (frame - BAR_FILL_START) / (BAR_FILL_END - BAR_FILL_START);
  const yPct = interpolate(t, [0, 1], [0, 100]);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: `${yPct}%`,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${COLORS.accent2}, transparent)`,
        boxShadow: `0 0 24px ${COLORS.accent2}, 0 0 48px ${COLORS.accent2}`,
        opacity: 0.85,
        pointerEvents: "none",
      }}
    />
  );
};

// ── CV Preview (more realistic, fills the card) ─────────────────────────

const CVPreview: React.FC<{ frame: number }> = ({ frame }) => {
  void frame;
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: 28,
        height: "100%",
        color: "#0E1422",
        fontFamily: FONT.family,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      {/* Header with avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
            display: "grid",
            placeItems: "center",
            color: "white",
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: "-0.02em",
          }}
        >
          GR
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Gabriel Rance
          </div>
          <div style={{ fontSize: 13, color: "#6B7184", marginTop: 2 }}>
            Strategy Associate · HEC Paris · ✉ gabriel@example.fr
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: "#E6E8EF", margin: "18px 0" }} />

      {/* Summary */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#5b62e6", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Summary
      </div>
      <div style={{ fontSize: 12, color: "#4B5366", lineHeight: 1.5, marginBottom: 16 }}>
        Strategy associate with 3 yrs M&A + ops experience. Led €120M deal sourcing at Stripe FR. Quantitative-first; comfortable with Python, SQL, financial modeling.
      </div>

      <div style={{ height: 1, background: "#E6E8EF", margin: "8px 0 14px" }} />

      <SectionTitle>Experience</SectionTitle>
      <CVLine title="Senior Analyst — Stripe" date="2024 — Present" />
      <CVLine title="Strategy Intern — Bain & Co" date="2023" />
      <CVLine title="M&A Intern — Goldman Sachs" date="2022" />

      <div style={{ height: 1, background: "#E6E8EF", margin: "14px 0" }} />

      <SectionTitle>Education</SectionTitle>
      <CVLine title="MSc — HEC Paris" date="2022" />
      <CVLine title="BBA — ESCP" date="2020" />

      <div style={{ height: 1, background: "#E6E8EF", margin: "14px 0" }} />

      <SectionTitle>Languages</SectionTitle>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { lang: "Français", lvl: "Natif" },
          { lang: "English", lvl: "C2" },
          { lang: "Español", lvl: "B2" },
        ].map((l) => (
          <span
            key={l.lang}
            style={{
              padding: "5px 10px",
              background: "#F4F5F8",
              border: "1px solid #E6E8EF",
              borderRadius: 6,
              fontSize: 11,
              color: "#4B5366",
              fontWeight: 600,
            }}
          >
            {l.lang} <span style={{ color: "#9097A8", fontWeight: 500 }}>· {l.lvl}</span>
          </span>
        ))}
      </div>

      <SectionTitle>Skills</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["Strategy", "M&A modeling", "Python", "SQL", "Manager XP", "Public speaking"].map((s) => (
          <span
            key={s}
            style={{
              padding: "5px 10px",
              background: "#F4F5F8",
              border: "1px solid #E6E8EF",
              borderRadius: 6,
              fontSize: 11,
              color: "#4B5366",
              fontWeight: 500,
            }}
          >
            {s}
          </span>
        ))}
      </div>

      <div style={{ height: 1, background: "#E6E8EF", margin: "14px 0" }} />

      <SectionTitle>Activities</SectionTitle>
      <div style={{ fontSize: 12, color: "#4B5366", lineHeight: 1.5 }}>
        Bureau Étudiant HEC · Co-founder, FinTech Society · Marathon Paris 2024
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "#5b62e6", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
    {children}
  </div>
);

const CVLine: React.FC<{ title: string; date: string }> = ({ title, date }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 6,
      fontSize: 13,
    }}
  >
    <span style={{ fontWeight: 600 }}>{title}</span>
    <span style={{ color: "#6B7184", fontFamily: FONT.mono, fontSize: 12 }}>{date}</span>
  </div>
);

// ── ATS Panel ─────────────────────────────────────────────────────────

const ATSPanel: React.FC<{
  jobLabel: string;
  matchScore: number;
  frame: number;
  fps: number;
}> = ({ jobLabel, matchScore, frame, fps }) => {
  const barProgress = interpolate(frame, [BAR_FILL_START, BAR_FILL_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scoreProgress = interpolate(frame, [DONUT_START, DONUT_LAND], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const liveScore = Math.round(matchScore * scoreProgress);

  return (
    <>
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.accent2,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          ATS Match Analysis
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: COLORS.text1, lineHeight: 1.2 }}>
          {jobLabel}
        </div>
      </div>

      <AnalyzeButton frame={frame} fps={fps} />

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: COLORS.text3,
            marginBottom: 6,
            fontFamily: FONT.mono,
            opacity: frame >= BAR_FILL_START ? 1 : 0.3,
          }}
        >
          <span>Analyse en cours</span>
          <span>{Math.round(barProgress * 100)}%</span>
        </div>
        <div
          style={{
            height: 6,
            background: COLORS.bgElev,
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${barProgress * 100}%`,
              background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent2})`,
              boxShadow: `0 0 16px ${COLORS.accentGlow}`,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 0",
          opacity: frame >= DONUT_START ? 1 : 0.4,
        }}
      >
        <Donut score={liveScore} target={matchScore} frame={frame} />
      </div>

      <KeywordChips frame={frame} fps={fps} />

      <Recommendations frame={frame} fps={fps} />
    </>
  );
};

const AnalyzeButton: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const pulse = interpolate(
    Math.max(0, Math.min(1, (frame - 60) / (CLICK_AT - 60))) * Math.PI * 6,
    [0, Math.PI, 2 * Math.PI, 3 * Math.PI, 4 * Math.PI, 5 * Math.PI, 6 * Math.PI],
    [1, 1.04, 1, 1.04, 1, 1.04, 1],
  );

  const clickFrame = frame - CLICK_AT;
  const clickScale =
    clickFrame >= 0 && clickFrame < 8
      ? interpolate(clickFrame, [0, 4, 8], [1, 0.96, 1])
      : 1;
  const ringSize = interpolate(clickFrame, [0, 14], [0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(clickFrame, [0, 14], [0.8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const postClick = frame >= CLICK_AT + 6;
  void fps;

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "stretch" }}>
      <button
        style={{
          flex: 1,
          height: 56,
          background: postClick ? COLORS.bgElev : COLORS.accent,
          color: postClick ? COLORS.text2 : "white",
          border: postClick ? `1px solid ${COLORS.border}` : "none",
          borderRadius: 10,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          fontFamily: FONT.family,
          transform: `scale(${pulse * clickScale})`,
          boxShadow: postClick ? "none" : `0 12px 32px -8px ${COLORS.accentGlow}`,
        }}
      >
        {postClick ? "✓ Analyse lancée" : "Analyser le match"}
      </button>
      {clickFrame >= 0 && clickFrame < 14 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: ringSize,
            height: ringSize,
            border: `2px solid ${COLORS.accent2}`,
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            opacity: ringOpacity,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

// ── Donut with score reveal climax ─────────────────────────────────────

const Donut: React.FC<{ score: number; target: number; frame: number }> = ({ score, target, frame }) => {
  const size = 250;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (score / 100) * c;

  // Climax pop — scale 1 → 1.12 → 1 over 18 frames after landing
  const climaxFrame = frame - DONUT_LAND;
  const climaxScale =
    climaxFrame >= 0 && climaxFrame < 18
      ? interpolate(climaxFrame, [0, 6, 18], [1, 1.12, 1])
      : 1;

  // Glow flash on landing
  const flashOpacity =
    climaxFrame >= 0 && climaxFrame < 22
      ? interpolate(climaxFrame, [0, 6, 22], [0, 0.7, 0])
      : 0;

  return (
    <div style={{ position: "relative", width: size, height: size, transform: `scale(${climaxScale})` }}>
      <div
        style={{
          position: "absolute",
          inset: -40,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accentGlow}, transparent 60%)`,
          opacity: flashOpacity,
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />
      {/* Particle burst */}
      <ParticleBurst frame={frame} center={size / 2} />
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={COLORS.bgElev}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#donutGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.accent2} />
            <stop offset="100%" stopColor="#c7d2fe" />
          </linearGradient>
        </defs>
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.mono,
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: COLORS.text1,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {score}
          <span style={{ color: COLORS.accent2, fontSize: 56 }}>%</span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: COLORS.text3,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginTop: 6,
            fontFamily: FONT.family,
            fontWeight: 700,
          }}
        >
          {score === target ? "Match score" : "Calculating…"}
        </div>
      </div>
    </div>
  );
};

// ── Particle burst on score landing ────────────────────────────────────

const ParticleBurst: React.FC<{ frame: number; center: number }> = ({ frame, center }) => {
  const localFrame = frame - DONUT_LAND;
  if (localFrame < 0 || localFrame > 32) return null;

  const t = localFrame / 32;
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const distance = interpolate(t, [0, 1], [0, 180]);
        const x = center + Math.cos(angle) * distance;
        const y = center + Math.sin(angle) * distance;
        const opacity = interpolate(t, [0, 0.5, 1], [1, 0.6, 0]);
        const size = interpolate(t, [0, 1], [8, 2]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 3 === 0 ? "#FBBF24" : i % 3 === 1 ? COLORS.accent2 : "#34D399",
              boxShadow: "0 0 12px currentColor",
              color: i % 3 === 0 ? "#FBBF24" : i % 3 === 1 ? COLORS.accent2 : "#34D399",
              opacity,
              filter: "blur(0.5px)",
            }}
          />
        );
      })}
    </>
  );
};

// ── Score-land full-screen flash ───────────────────────────────────────

const ScoreLandFlash: React.FC<{ frame: number }> = ({ frame }) => {
  const local = frame - DONUT_LAND;
  if (local < 0 || local > 8) return null;
  const opacity = interpolate(local, [0, 2, 8], [0, 0.18, 0]);
  return (
    <AbsoluteFill
      style={{
        background: "white",
        opacity,
        pointerEvents: "none",
        zIndex: 30,
      }}
    />
  );
};

// ── Keyword chips ─────────────────────────────────────────────────────

const CHIPS = [
  { label: "M&A modeling", state: "match" as const },
  { label: "Strategy frameworks", state: "match" as const },
  { label: "Python", state: "match" as const },
  { label: "Manager XP", state: "match" as const },
  { label: "Due diligence", state: "miss" as const },
];

const KeywordChips: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {CHIPS.map((chip, i) => {
        const enterAt = BAR_FILL_START + i * 8;
        const localFrame = frame - enterAt;
        if (localFrame < 0) return null;
        const sp = spring({
          frame: localFrame,
          fps,
          config: { stiffness: 220, damping: 14 },
        });
        const scale = interpolate(sp, [0, 1], [0.6, 1]);
        const opacity = interpolate(sp, [0, 1], [0, 1]);

        const isMatch = chip.state === "match";
        return (
          <span
            key={chip.label}
            style={{
              opacity,
              transform: `scale(${scale})`,
              padding: "7px 12px",
              borderRadius: 999,
              background: isMatch ? "rgba(16, 185, 129, 0.14)" : "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${isMatch ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
              color: isMatch ? "#34D399" : "#F87171",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {isMatch ? "✓" : "—"} {chip.label}
          </span>
        );
      })}
    </div>
  );
};

// ── AI Recommendations ────────────────────────────────────────────────

const RECS = [
  { icon: "💡", text: "Tu domines la dimension technique" },
  { icon: "🎯", text: "Renforce le narratif strategy/leadership" },
];

const Recommendations: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
      {RECS.map((rec, i) => {
        const enterAt = DONUT_LAND + 12 + i * 8;
        const localFrame = frame - enterAt;
        if (localFrame < 0) return null;
        const sp = spring({
          frame: localFrame,
          fps,
          config: { stiffness: 160, damping: 16 },
        });
        const opacity = interpolate(sp, [0, 1], [0, 1]);
        const x = interpolate(sp, [0, 1], [-20, 0]);

        return (
          <div
            key={rec.text}
            style={{
              opacity,
              transform: `translateX(${x}px)`,
              padding: "10px 12px",
              background: COLORS.bgElev,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              fontSize: 13,
              color: COLORS.text2,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 18 }}>{rec.icon}</span>
            {rec.text}
          </div>
        );
      })}
    </div>
  );
};

// ── Cursor ────────────────────────────────────────────────────────────

const Cursor: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const cursorEnter = MOCKUP_IN + 30;
  const cursorExit = DONUT_START - 10;
  if (frame < cursorEnter || frame > cursorExit) return null;

  const enterFrame = frame - cursorEnter;
  const t = Math.min(1, enterFrame / (CLICK_AT - cursorEnter));
  const easedT = 1 - Math.pow(1 - t, 3);
  const x = interpolate(easedT, [0, 1], [1080, 740]);
  const y = interpolate(easedT, [0, 1], [780, 920]);

  const clickFrame = frame - CLICK_AT;
  const squish =
    clickFrame >= 0 && clickFrame < 8
      ? interpolate(clickFrame, [0, 4, 8], [1, 0.7, 1])
      : 1;

  void fps;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 12,
        top: y - 12,
        width: 24,
        height: 24,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {[0, 1, 2].map((i) => {
        const trailT = Math.max(0, t - 0.06 * (i + 1));
        const trailEased = 1 - Math.pow(1 - trailT, 3);
        const tx = interpolate(trailEased, [0, 1], [1080, 740]) - x;
        const ty = interpolate(trailEased, [0, 1], [780, 920]) - y;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: tx + 6,
              top: ty + 6,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: COLORS.accent,
              opacity: 0.4 * (1 - i / 3),
              filter: "blur(4px)",
            }}
          />
        );
      })}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: COLORS.accent,
          boxShadow: `0 0 24px ${COLORS.accentGlow}, 0 0 0 4px rgba(99, 102, 241, 0.2)`,
          transform: `scale(${squish})`,
        }}
      />
    </div>
  );
};

// ── Sticker callout ───────────────────────────────────────────────────

const Callout: React.FC<{ frame: number; matchScore: number }> = ({ frame, matchScore }) => {
  const localFrame = frame - CALLOUT_AT;
  if (localFrame < 0) return null;

  const sp = spring({
    frame: localFrame,
    fps: 30,
    config: { stiffness: 130, damping: 13 },
  });
  const opacity = interpolate(sp, [0, 1], [0, 1]);
  const scale = interpolate(sp, [0, 1], [0.7, 1]);
  const rotate = interpolate(sp, [0, 1], [-10, -3]);

  // Hand-drawn arrow that draws in
  const arrowProgress = interpolate(localFrame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });

  return (
    <div
      style={{
        position: "absolute",
        right: -10,
        top: 380,
        opacity,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        transformOrigin: "right center",
        zIndex: 40,
      }}
    >
      <div
        style={{
          background: "#FBBF24",
          color: "#0E1422",
          padding: "16px 22px",
          borderRadius: 14,
          fontWeight: 800,
          fontSize: 24,
          letterSpacing: "-0.01em",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45), 0 0 0 3px rgba(0,0,0,0.08)",
          maxWidth: 320,
          lineHeight: 1.25,
          fontFamily: FONT.family,
        }}
      >
        {matchScore}% = pile au-dessus du seuil ATS de Bain.
      </div>
      {/* Hand-drawn arrow pointing left toward the donut */}
      <svg
        width="120"
        height="80"
        viewBox="0 0 120 80"
        style={{
          position: "absolute",
          left: -100,
          top: 20,
          pointerEvents: "none",
        }}
      >
        <path
          d="M115 30 Q 60 8, 30 35 Q 5 60, 8 50"
          stroke="#FBBF24"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="200"
          strokeDashoffset={200 - 200 * arrowProgress}
        />
        <path
          d="M8 50 L 18 45 M8 50 L 16 58"
          stroke="#FBBF24"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          opacity={arrowProgress > 0.85 ? 1 : 0}
        />
      </svg>
    </div>
  );
};

// ── Bottom tagline with animated underline ─────────────────────────────

const BottomTagline: React.FC<{ text: string; frame: number; fps: number }> = ({
  text,
  frame,
  fps,
}) => {
  const enter = fadeRise({ frame, fps, delay: 240, stiffness: 160 });

  // Underline sweep
  const underline = interpolate(frame - 250, [0, 24], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 90,
        left: 60,
        right: 60,
        opacity: enter.opacity,
        transform: `translateY(${enter.y}px)`,
      }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: COLORS.text1,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            textAlign: "left",
            marginBottom: 18,
            paddingBottom: 8,
          }}
        >
          {text}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 8,
            height: 4,
            width: `${underline}%`,
            maxWidth: "100%",
            background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent2}, transparent)`,
            borderRadius: 2,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 22,
          color: COLORS.text2,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            display: "grid",
            placeItems: "center",
            background: COLORS.bgElev,
            border: `1px solid ${COLORS.borderStrong}`,
            borderRadius: 8,
            color: COLORS.accent2,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 3 L13 3 L13 6 L6.5 6 L6.5 7.5 L11.5 7.5 L11.5 10.5 L6.5 10.5 L6.5 13 L3 13 Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <strong style={{ color: COLORS.text1, fontWeight: 800 }}>Career OS</strong>
        <span style={{ color: COLORS.text3 }}>· beta privée · careeros.app</span>
      </div>
    </div>
  );
};
