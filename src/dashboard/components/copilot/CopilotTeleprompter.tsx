import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store';

/**
 * CopilotTeleprompter — Moody-style capsule overlay that reads the
 * current Copilot answer (in-flight stream OR most recent committed)
 * and renders it in a dark blurred capsule fixed to the bottom of the
 * viewport.
 *
 * Why a fixed-position overlay rather than a flow element inside the
 * `EmbeddedCopilotPanel`? Because during a real interview the user is
 * looking at Zoom/Meet on the bulk of their screen, not at our
 * dashboard sidebar. The teleprompter has to sit where the eyeline
 * already is — near the bottom of the display — without forcing the
 * candidate to dart between windows. Same pattern as Moody, Cluely,
 * Final Round AI.
 *
 * Typography reference (Phase 0 SOTA research):
 *   IBM Plex Mono, ~26-28 px, weight 500, off-white #EEE, line-height
 *   1.35, max-width ≈ 70 ch. Dark capsule with backdrop-filter blur
 *   so it composites over whatever is behind (video call frame,
 *   slides, code editor) without stealing visual attention.
 *
 * Visual hierarchy:
 *   - The text itself is the only feature. No chrome, no buttons.
 *   - The capsule auto-hides when there's no answer to show OR when
 *     the session is idle — never sits there as an empty box during
 *     "between questions" silence.
 *   - Phase 4 will add per-word highlighting driven by the candidate's
 *     own speech rate (Moonshine ASR + Levenshtein). This component
 *     is the surface that hosts that effect; the data model already
 *     splits `pendingAnswer` vs `lastAnswer` so we can layer the
 *     word-paced cursor in later without restructuring.
 */
export default function CopilotTeleprompter() {
  const sessions = useAppStore((s) => s.copilotSessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const pendingAnswer = useAppStore((s) => s.pendingAnswer);
  const status = useAppStore((s) => s.copilotStatus);

  const session =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null;
  const lastAnswer = session?.answers[session.answers.length - 1] ?? null;

  // Prefer the in-flight stream so the candidate sees tokens land in
  // real time; once Claude finishes (status flips to listening) the
  // pendingAnswer flushes into `lastAnswer` and we hold that on-screen
  // until the next question arrives — same logic as CopilotAnswerCard.
  const text = pendingAnswer || lastAnswer?.text || '';
  const isStreaming = status === 'thinking' && pendingAnswer.length > 0;

  // Auto-scroll the capsule to the bottom on every token. The
  // capsule has a fixed max-height so multi-paragraph answers
  // (notably pitch mode at ~3 min / ~420 words) overflow and need
  // the same "always show the latest line" behaviour as a real
  // teleprompter.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [text]);

  // Hide entirely when there's nothing to show — never sit there as
  // dead chrome over the user's video call.
  const sessionActive = activeSessionId !== null && status !== 'idle';
  if (!sessionActive || !text.trim()) return null;

  return (
    <div className="cp-teleprompter" role="region" aria-label="Copilot teleprompter">
      <div className="cp-teleprompter__capsule">
        <div ref={bodyRef} className="cp-teleprompter__body">
          {/* `white-space: pre-wrap` in CSS preserves any `\n` the
              system prompt emits at clause boundaries — that's the
              cheap version of "semantic line breaks" Moody hand-
              authors. Worker-side prompt will be tuned to emit them
              at natural breath points. */}
          <p className="cp-teleprompter__text">
            {text}
            {isStreaming && (
              <span className="cp-teleprompter__cursor" aria-hidden="true" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
