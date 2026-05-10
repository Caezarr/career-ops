import { spring as remotionSpring, interpolate } from "remotion";

/**
 * Reusable motion primitives. Keeping these out of compositions
 * means a brand-wide tweak (e.g. "everything feels too snappy")
 * is a one-line change here, not 30 edits across templates.
 */

export interface EnterArgs {
  frame: number;
  fps: number;
  /** Frame at which the element should start animating in. */
  delay?: number;
  /** Spring stiffness — 100 = calm, 200 = punchy. Default 140. */
  stiffness?: number;
}

/** Standard "fade + rise" entrance. Returns { opacity, y } as numbers
 *  ready to drop into a transform. */
export function fadeRise({ frame, fps, delay = 0, stiffness = 140 }: EnterArgs) {
  const spring = remotionSpring({
    frame: frame - delay,
    fps,
    config: { stiffness, damping: 18 },
  });
  return {
    opacity: interpolate(spring, [0, 1], [0, 1]),
    y: interpolate(spring, [0, 1], [40, 0]),
  };
}

/** Linear word-by-word reveal for big hook headlines. Returns the
 *  number of words to reveal at the current frame. */
export function wordsRevealed({
  frame,
  totalWords,
  startFrame = 0,
  framesPerWord = 6,
}: {
  frame: number;
  totalWords: number;
  startFrame?: number;
  framesPerWord?: number;
}): number {
  const elapsed = Math.max(0, frame - startFrame);
  return Math.min(totalWords, Math.floor(elapsed / framesPerWord) + 1);
}
