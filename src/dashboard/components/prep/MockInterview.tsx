import { Sparkles } from 'lucide-react';

/**
 * Sprint 3 PR-B (audit Reality BLOCKING #4): the previous version
 * imported `mockMockInterview` and stamped its hardcoded 86% scores
 * into `prepSession` history when the user hit Save — meaning the
 * user thought they had practised, when in fact nothing happened.
 *
 * Until the real flow is wired (Live Copilot for the speech path,
 * Claude for the scoring rubric, persistence to the prepSession
 * SQLite table), we render an honest "Coming soon" empty state
 * with a clear pointer to the Live Copilot which already works
 * for real interview answer generation.
 *
 * The shell (`<section className="prep-mock">` + header) is kept
 * so the Prep page layout doesn't shift around this card.
 */
export default function MockInterview() {
  return (
    <section className="prep-mock">
      <div className="prep-mock__header">
        <h2 className="prep-mock__title">Mock interview</h2>
      </div>

      <div className="ds-empty" style={{ padding: '48px 16px', minHeight: 280 }}>
        <Sparkles size={28} strokeWidth={1.6} aria-hidden="true" />
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
          Mock interview · coming soon
        </div>
        <div style={{ maxWidth: 420, lineHeight: 1.5 }}>
          The full mock-interview pipeline (live audio → Whisper STT → Claude
          rubric scoring → persisted session) is on the roadmap. In the
          meantime, the <strong>Live Copilot</strong> already generates
          spoken-quality answers in real time during a real interview —
          launch it from the top-right hotkey or the Copilot tab.
        </div>
      </div>
    </section>
  );
}
