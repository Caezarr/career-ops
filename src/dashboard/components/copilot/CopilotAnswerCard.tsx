import { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';

/** Pitch markers like `[0:30-0:45]` get a chip-like span so users can
 *  scan the structure of a 3-min pitch at a glance. Mirrors the same
 *  highlighter the overlay used. */
const TS_SPLIT = /(\[\d+:\d{2}[-–]\d+:\d{2}\])/g;
function AnswerText({ text }: { text: string }) {
  return (
    <>
      {text.split(TS_SPLIT).map((part, i) =>
        /^\[\d+:\d{2}[-–]\d+:\d{2}\]$/.test(part) ? (
          <span key={i} className="cp-answer__ts">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** Suggested-answer card. Shows the in-flight streaming text while the
 *  backend is producing tokens, then falls back to the most recent
 *  committed answer once streaming completes (so the user doesn't lose
 *  the answer the second status flips to "ready"). */
export default function CopilotAnswerCard() {
  const sessions = useAppStore((s) => s.copilotSessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const pendingAnswer = useAppStore((s) => s.pendingAnswer);
  const status = useAppStore((s) => s.copilotStatus);

  const session =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null;
  const lastAnswer = session?.answers[session.answers.length - 1] ?? null;
  // Prefer the in-flight stream when present (so the cursor blinks on
  // live tokens), otherwise show the last committed answer.
  const text = pendingAnswer || lastAnswer?.text || '';
  const isStreaming = status === 'thinking' && pendingAnswer.length > 0;

  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — best effort
    }
  }

  if (!text) {
    return (
      <div className="cp-answer">
        <span className="cp-section-eyebrow">Copilot answer</span>
        <div className="cp-answer__card cp-answer__card--empty">
          <Sparkles size={16} strokeWidth={1.8} />
          <span className="cp-answer__empty-text">
            {status === 'listening'
              ? 'Listening for the next question…'
              : status === 'recording'
              ? 'Capturing the question…'
              : status === 'thinking'
              ? 'Generating answer…'
              : 'Suggested answers appear here once the recruiter speaks.'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-answer">
      <span className="cp-section-eyebrow">Copilot answer</span>

      <div className="cp-answer__card">
        <div className="cp-answer__header">
          <span className="cp-answer__label">Suggested answer</span>
          <button
            type="button"
            className={`cp-answer__copy${copied ? ' cp-answer__copy--copied' : ''}`}
            onClick={copy}
            aria-label="Copy answer"
            title="Copy"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <p className="cp-answer__text">
          <AnswerText text={text} />
          {isStreaming && <span className="cp-answer__cursor" aria-hidden="true" />}
        </p>
      </div>
    </div>
  );
}
