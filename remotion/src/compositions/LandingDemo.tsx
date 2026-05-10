import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { z } from "zod";
import { COLORS, FONT } from "../lib/theme.ts";
import { fadeRise } from "../lib/easing.ts";

/**
 * Landing demo — the hero loop on careeros.app.
 *
 * Format: 16:10 horizontal, 1920×1200, 30fps, 12s seamless loop.
 *
 * Goal: in 12 seconds, prove that Career OS exists, that the ATS
 * analyzer works, and that you'd want it open on your Mac. ICP
 * watches max 5-8s before scrolling, so the WOW (donut 82%) lands
 * by t≈6s.
 *
 * Frame budget (12s = 360 frames):
 *   0.0 – 0.8s : window fades in, app chrome composes
 *   0.8 – 2.5s : JD field type-writes, "Analyser" button pulses,
 *                cursor enters from top-right
 *   2.5 – 3.0s : cursor clicks, ring propagation
 *   3.0 – 5.0s : progress bar fills, scanning line sweeps the CV,
 *                keyword chips stamp in
 *   5.0 – 7.5s : donut ticks 0 → 82%, particle burst on landing,
 *                full-screen flash 1 frame
 *   7.5 – 9.5s : sticker callout pops "+ 18 keywords match",
 *                recommendations cards stagger in
 *   9.5 – 11.0s: subtle hold on the final composed state
 *  11.0 – 12.0s: cross-fade to loop point (matching frame 0)
 */

export const landingDemoSchema = z.object({
  matchScore: z.number().int().min(0).max(99).default(82),
});

export type LandingDemoProps = z.infer<typeof landingDemoSchema>;

const FPS = 30;
const TYPE_START = 0.8 * FPS;
const TYPE_END = 2.0 * FPS;
const CLICK_AT = 2.5 * FPS;
const BAR_FILL_START = 3.0 * FPS;
const BAR_FILL_END = 5.0 * FPS;
const DONUT_START = 5.0 * FPS;
const DONUT_LAND = DONUT_START + 60;
const CALLOUT_AT = 7.5 * FPS;
const RECS_AT = 8.5 * FPS;
const FADE_OUT_START = 11.0 * FPS;

// 1920x1200 frame
const WIN_X = 120;
const WIN_Y = 100;
const WIN_W = 1680;
const WIN_H = 1000;
const CHROME_H = 56;

export const LandingDemo: React.FC<LandingDemoProps> = ({ matchScore }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Loop fade — last second cross-fades back to frame 0
  const loopOpacity = interpolate(frame, [FADE_OUT_START, 12 * FPS], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT.family,
        background: COLORS.bg,
        color: COLORS.text1,
        opacity: loopOpacity,
      }}
    >
      <BackgroundLayer />

      <Mockup matchScore={matchScore} frame={frame} fps={fps} />

      <Cursor frame={frame} fps={fps} />

      <ScoreLandFlash frame={frame} />

      <BrandTagBottomLeft frame={frame} fps={fps} />

      <Grain />
    </AbsoluteFill>
  );
};

// ── Background ────────────────────────────────────────────────────────

const BackgroundLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (frame % 240) / 240;
  const x1 = interpolate(t, [0, 0.5, 1], [0.2, 0.8, 0.2]) * 1920;
  const y1 = interpolate(t, [0, 0.5, 1], [0.3, 0.7, 0.3]) * 1200;
  const x2 = interpolate(t, [0, 0.5, 1], [0.85, 0.15, 0.85]) * 1920;
  const y2 = interpolate(t, [0, 0.5, 1], [0.6, 0.2, 0.6]) * 1200;

  return (
    <>
      <AbsoluteFill style={{ background: "#0A0B0F" }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 900px at ${x1}px ${y1}px, rgba(99, 102, 241, 0.32), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at ${x2}px ${y2}px, rgba(236, 72, 153, 0.18), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(700px 700px at 95% 95%, rgba(34, 211, 238, 0.14), transparent 70%)`,
        }}
      />
      {/* Grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
          opacity: 0.7,
        }}
      />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <Particles />
    </>
  );
};

const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: 18 }, (_, i) => {
    const seed = i * 137;
    const xBase = ((seed * 17) % 1920);
    const speed = 0.3 + ((seed * 7) % 70) / 100;
    const y = 1200 - ((frame * speed * 4 + seed * 23) % 1500);
    const opacity = 0.3 + ((seed * 11) % 30) / 100;
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
            boxShadow: `0 0 ${p.size * 2}px ${COLORS.accent}`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      opacity: 0.14,
      mixBlendMode: "overlay",
      pointerEvents: "none",
    }}
  />
);

// ── Score-land flash ───────────────────────────────────────────────────

const ScoreLandFlash: React.FC<{ frame: number }> = ({ frame }) => {
  const local = frame - DONUT_LAND;
  if (local < 0 || local > 8) return null;
  const opacity = interpolate(local, [0, 2, 8], [0, 0.16, 0]);
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

// ── Mockup window ──────────────────────────────────────────────────────

const Mockup: React.FC<{ matchScore: number; frame: number; fps: number }> = ({
  matchScore,
  frame,
  fps,
}) => {
  // Window fades in over first 24 frames
  const enterOpacity = interpolate(frame, [0, 24], [0, 1], {
    extrapolateRight: "clamp",
  });
  const enterScale = interpolate(frame, [0, 24], [0.96, 1], {
    extrapolateRight: "clamp",
  });

  // Subtle continuous breathe
  const breathe = 1 + Math.sin(frame / 60) * 0.003;

  return (
    <div
      style={{
        position: "absolute",
        left: WIN_X,
        top: WIN_Y,
        width: WIN_W,
        height: WIN_H,
        opacity: enterOpacity,
        transform: `scale(${enterScale * breathe}) perspective(2400px) rotateY(-1deg)`,
        transformStyle: "preserve-3d",
        transformOrigin: "center center",
      }}
    >
      {/* Halo */}
      <div
        style={{
          position: "absolute",
          inset: -50,
          background: "radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.42), transparent 60%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          opacity: enterOpacity,
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
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

        <Chrome />

        <div style={{ display: "flex", height: WIN_H - CHROME_H }}>
          {/* Left: CV preview */}
          <div
            style={{
              flex: 0.85,
              padding: 32,
              borderRight: `1px solid ${COLORS.border}`,
              background: "linear-gradient(180deg, #1A1D26, #14161D)",
              position: "relative",
            }}
          >
            <CVPreview />
            <ScanLine frame={frame} />
          </div>

          {/* Right: ATS panel */}
          <div
            style={{
              flex: 1,
              padding: 36,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <ATSPanel matchScore={matchScore} frame={frame} fps={fps} />
          </div>
        </div>
      </div>

      {/* Sticker callout positioned over the donut area */}
      <Callout frame={frame} matchScore={matchScore} />
    </div>
  );
};

const Chrome: React.FC = () => (
  <div
    style={{
      height: CHROME_H,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "0 24px",
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
        fontSize: 16,
        fontWeight: 600,
        color: COLORS.text2,
        letterSpacing: "-0.01em",
      }}
    >
      Career OS — CV Manager
    </span>
    <span style={{ width: 60 }} />
  </div>
);

// ── Scan line ──────────────────────────────────────────────────────────

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

// ── CV Preview (horizontal layout, fills the card) ─────────────────────

const CVPreview: React.FC = () => (
  <div
    style={{
      background: "white",
      borderRadius: 12,
      padding: 32,
      height: "100%",
      color: "#0E1422",
      fontFamily: FONT.family,
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
          display: "grid",
          placeItems: "center",
          color: "white",
          fontWeight: 800,
          fontSize: 24,
          letterSpacing: "-0.02em",
        }}
      >
        GR
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          Gabriel Rance
        </div>
        <div style={{ fontSize: 14, color: "#6B7184", marginTop: 4 }}>
          Strategy Associate · HEC Paris · ✉ gabriel@example.fr
        </div>
      </div>
    </div>

    <div style={{ height: 1, background: "#E6E8EF", margin: "20px 0" }} />

    <SectionTitle>Summary</SectionTitle>
    <div style={{ fontSize: 13, color: "#4B5366", lineHeight: 1.6, marginBottom: 16 }}>
      Strategy associate with 3 yrs M&A + ops experience. Led €120M deal sourcing at Stripe FR. Quantitative-first; comfortable with Python, SQL, financial modeling and managing 4-engineer squads.
    </div>

    <div style={{ height: 1, background: "#E6E8EF", margin: "12px 0" }} />

    <SectionTitle>Experience</SectionTitle>
    <CVLine title="Senior Analyst — Stripe" date="2024 — Present" />
    <CVLine title="Strategy Intern — Bain & Co" date="2023" />
    <CVLine title="M&A Intern — Goldman Sachs" date="2022" />

    <div style={{ height: 1, background: "#E6E8EF", margin: "16px 0" }} />

    <SectionTitle>Education</SectionTitle>
    <CVLine title="MSc — HEC Paris" date="2022" />
    <CVLine title="BBA — ESCP" date="2020" />

    <div style={{ height: 1, background: "#E6E8EF", margin: "16px 0" }} />

    <SectionTitle>Skills</SectionTitle>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
      {["Strategy", "M&A modeling", "Python", "SQL", "Manager XP", "French", "English"].map((s) => (
        <span
          key={s}
          style={{
            padding: "5px 10px",
            background: "#F4F5F8",
            border: "1px solid #E6E8EF",
            borderRadius: 6,
            fontSize: 12,
            color: "#4B5366",
            fontWeight: 500,
          }}
        >
          {s}
        </span>
      ))}
    </div>

    <SectionTitle>Activities</SectionTitle>
    <div style={{ fontSize: 13, color: "#4B5366", lineHeight: 1.5 }}>
      Bureau Étudiant HEC · Co-founder, FinTech Society · Marathon Paris 2024
    </div>
  </div>
);

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
      fontSize: 14,
    }}
  >
    <span style={{ fontWeight: 600 }}>{title}</span>
    <span style={{ color: "#6B7184", fontFamily: FONT.mono, fontSize: 12 }}>{date}</span>
  </div>
);

// ── ATS Panel ──────────────────────────────────────────────────────────

const ATSPanel: React.FC<{ matchScore: number; frame: number; fps: number }> = ({
  matchScore,
  frame,
  fps,
}) => {
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
      {/* Section title */}
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
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: COLORS.text1, lineHeight: 1.2 }}>
          Senior Strategy Associate · Bain & Company
        </div>
      </div>

      {/* JD typing field */}
      <JDField frame={frame} />

      {/* Analyze button + progress */}
      <AnalyzeButton frame={frame} fps={fps} />

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
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

      {/* Donut */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 0",
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

// ── JD type-write field ────────────────────────────────────────────────

const JDField: React.FC<{ frame: number }> = ({ frame }) => {
  const fullText = "Senior Strategy Associate · Bain & Company · Paris";
  const t = interpolate(frame, [TYPE_START, TYPE_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visible = fullText.slice(0, Math.floor(fullText.length * t));
  const showCaret = frame < TYPE_END + 30 && frame % 18 < 9;

  return (
    <div
      style={{
        padding: "14px 16px",
        background: COLORS.bgElev,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        fontSize: 14,
        color: COLORS.text2,
        fontFamily: FONT.mono,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ color: COLORS.accent2, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        JD
      </span>
      <span>
        {visible}
        {showCaret && (
          <span style={{ display: "inline-block", width: 2, height: 14, background: COLORS.accent2, marginLeft: 2, verticalAlign: "middle" }} />
        )}
      </span>
    </div>
  );
};

// ── Analyze button ────────────────────────────────────────────────────

const AnalyzeButton: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const pulse = interpolate(
    Math.max(0, Math.min(1, (frame - TYPE_END) / (CLICK_AT - TYPE_END))) * Math.PI * 4,
    [0, Math.PI, 2 * Math.PI, 3 * Math.PI, 4 * Math.PI],
    [1, 1.04, 1, 1.04, 1],
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

// ── Donut ──────────────────────────────────────────────────────────────

const Donut: React.FC<{ score: number; target: number; frame: number }> = ({
  score,
  target,
  frame,
}) => {
  const size = 240;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (score / 100) * c;

  const climaxFrame = frame - DONUT_LAND;
  const climaxScale =
    climaxFrame >= 0 && climaxFrame < 18
      ? interpolate(climaxFrame, [0, 6, 18], [1, 1.1, 1])
      : 1;
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
        }}
      />
      <ParticleBurst frame={frame} center={size / 2} />
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.bgElev} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#donutGradLD)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="donutGradLD" x1="0%" y1="0%" x2="100%" y2="100%">
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
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: COLORS.text1,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {score}
          <span style={{ color: COLORS.accent2, fontSize: 52 }}>%</span>
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

const ParticleBurst: React.FC<{ frame: number; center: number }> = ({ frame, center }) => {
  const localFrame = frame - DONUT_LAND;
  if (localFrame < 0 || localFrame > 32) return null;
  const t = localFrame / 32;
  return (
    <>
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const distance = interpolate(t, [0, 1], [0, 200]);
        const x = center + Math.cos(angle) * distance;
        const y = center + Math.sin(angle) * distance;
        const opacity = interpolate(t, [0, 0.5, 1], [1, 0.6, 0]);
        const size = interpolate(t, [0, 1], [10, 2]);
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
        const sp = spring({ frame: localFrame, fps, config: { stiffness: 220, damping: 14 } });
        const scale = interpolate(sp, [0, 1], [0.6, 1]);
        const opacity = interpolate(sp, [0, 1], [0, 1]);

        const isMatch = chip.state === "match";
        return (
          <span
            key={chip.label}
            style={{
              opacity,
              transform: `scale(${scale})`,
              padding: "8px 14px",
              borderRadius: 999,
              background: isMatch ? "rgba(16, 185, 129, 0.16)" : "rgba(239, 68, 68, 0.14)",
              border: `1px solid ${isMatch ? "rgba(16, 185, 129, 0.45)" : "rgba(239, 68, 68, 0.45)"}`,
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
        const enterAt = RECS_AT + i * 10;
        const localFrame = frame - enterAt;
        if (localFrame < 0) return null;
        const sp = spring({ frame: localFrame, fps, config: { stiffness: 160, damping: 16 } });
        const opacity = interpolate(sp, [0, 1], [0, 1]);
        const x = interpolate(sp, [0, 1], [-20, 0]);

        return (
          <div
            key={rec.text}
            style={{
              opacity,
              transform: `translateX(${x}px)`,
              padding: "12px 14px",
              background: COLORS.bgElev,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              fontSize: 14,
              color: COLORS.text2,
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 20 }}>{rec.icon}</span>
            {rec.text}
          </div>
        );
      })}
    </div>
  );
};

// ── Cursor (pre-animated) ─────────────────────────────────────────────

const Cursor: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const cursorEnter = TYPE_END;
  const cursorExit = DONUT_START - 10;
  if (frame < cursorEnter || frame > cursorExit) return null;

  const enterFrame = frame - cursorEnter;
  const t = Math.min(1, enterFrame / (CLICK_AT - cursorEnter));
  const easedT = 1 - Math.pow(1 - t, 3);
  // Path: from top-right (1700, 200) toward Analyze button center (~1400, 460)
  const x = interpolate(easedT, [0, 1], [1700, 1400]);
  const y = interpolate(easedT, [0, 1], [200, 460]);

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
        left: x - 14,
        top: y - 14,
        width: 28,
        height: 28,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {[0, 1, 2].map((i) => {
        const trailT = Math.max(0, t - 0.06 * (i + 1));
        const trailEased = 1 - Math.pow(1 - trailT, 3);
        const tx = interpolate(trailEased, [0, 1], [1700, 1400]) - x;
        const ty = interpolate(trailEased, [0, 1], [200, 460]) - y;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: tx + 7,
              top: ty + 7,
              width: 14,
              height: 14,
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
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: COLORS.accent,
          boxShadow: `0 0 28px ${COLORS.accentGlow}, 0 0 0 4px rgba(99, 102, 241, 0.2)`,
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

  const sp = spring({ frame: localFrame, fps: 30, config: { stiffness: 130, damping: 13 } });
  const opacity = interpolate(sp, [0, 1], [0, 1]);
  const scale = interpolate(sp, [0, 1], [0.7, 1]);
  const rotate = interpolate(sp, [0, 1], [-8, -3]);

  const arrowProgress = interpolate(localFrame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        right: -30,
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
          fontSize: 22,
          letterSpacing: "-0.01em",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45), 0 0 0 3px rgba(0,0,0,0.08)",
          maxWidth: 320,
          lineHeight: 1.25,
          fontFamily: FONT.family,
        }}
      >
        {matchScore}% = pile au-dessus du seuil ATS de Bain.
      </div>
      <svg
        width="120"
        height="80"
        viewBox="0 0 120 80"
        style={{ position: "absolute", left: -100, top: 20, pointerEvents: "none" }}
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

// ── Brand tag bottom-left (subtle, never dominant) ─────────────────────

const BrandTagBottomLeft: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const enter = fadeRise({ frame, fps, delay: 12, stiffness: 180 });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 36,
        left: 36,
        opacity: enter.opacity * 0.85,
        transform: `translateY(${enter.y}px)`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: "rgba(20, 22, 29, 0.78)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 999,
        fontFamily: FONT.family,
        fontSize: 18,
        fontWeight: 600,
        color: COLORS.text2,
        letterSpacing: "-0.01em",
        zIndex: 5,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          display: "grid",
          placeItems: "center",
          background: COLORS.bgElev,
          border: `1px solid ${COLORS.borderStrong}`,
          borderRadius: 6,
          color: COLORS.accent2,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 3 L13 3 L13 6 L6.5 6 L6.5 7.5 L11.5 7.5 L11.5 10.5 L6.5 10.5 L6.5 13 L3 13 Z"
            fill="currentColor"
          />
        </svg>
      </span>
      Career OS
      <span style={{ color: COLORS.text3, fontWeight: 500 }}>· careeros.app</span>
    </div>
  );
};
