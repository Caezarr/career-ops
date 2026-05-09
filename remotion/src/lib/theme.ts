/**
 * Career OS reels — design tokens shared across all compositions.
 * Mirrors the landing's `tokens.css` so a viewer who clicks through
 * from a Reel to the landing page sees the same palette.
 *
 * Vertical 9:16 = 1080 × 1920. The compositions never hard-code
 * absolute pixels — everything cascades from these tokens.
 */

export const COLORS = {
  bg: "#0A0B0F",
  bg1: "#0E1015",
  bgSoft: "#14161D",
  bgCard: "#16181F",
  bgElev: "#1B1E27",

  border: "#21232C",
  borderStrong: "#2A2D38",

  text1: "#F4F5F8",
  text2: "#B8BAC4",
  text3: "#82858F",

  accent: "#6366f1",
  accent2: "#818cf8",
  accentSoft: "rgba(99, 102, 241, 0.16)",
  accentGlow: "rgba(99, 102, 241, 0.42)",

  green: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
} as const;

export const FONT = {
  family: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  mono: "JetBrains Mono, SF Mono, Menlo, monospace",
} as const;

/**
 * Standard Reel format. Most platforms cap usable Reels at ~90s, but
 * the algo-tuned sweet spot for save-rate is 18–30s. We default to
 * 24s = 720 frames at 30fps. Compositions that need longer (a "vérité
 * marché" walkthrough) override per-piece.
 */
export const REEL = {
  width: 1080,
  height: 1920,
  fps: 30,
  defaultDurationInFrames: 720,
} as const;
