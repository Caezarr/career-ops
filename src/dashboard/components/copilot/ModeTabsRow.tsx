import { AudioWaveform, Square, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';
import { useCopilotControls } from '../../hooks/useCopilotSession';
import { useToast } from '../../primitives';

/** Mode toggle (Q&A / Pitch) + secondary actions. The mode control is
 *  disabled while a session is active so we don't change the persona
 *  prompt mid-stream. */
export default function ModeTabsRow() {
  const mode = useAppStore((s) => s.copilotMode);
  const setMode = useAppStore((s) => s.setCopilotMode);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const status = useAppStore((s) => s.copilotStatus);
  const { stop, generatePitch, singleShot } = useCopilotControls();
  const toast = useToast();

  const sessionActive = activeSessionId !== null;
  const busy = status === 'thinking';

  async function handleQuickPitch() {
    if (busy) return;
    setMode('pitch');
    await generatePitch();
    toast.info('Generating pitch', 'Pyramid · STAR · MECE');
  }

  async function handleSingleShot() {
    if (busy) return;
    await singleShot(mode);
  }

  return (
    <div className="cp-mode-tabs">
      <div className="cp-mode-tabs__left">
        <button
          type="button"
          className={`cp-mode-tab${mode === 'qa' ? ' cp-mode-tab--active' : ''}`}
          aria-pressed={mode === 'qa'}
          onClick={() => setMode('qa')}
          disabled={sessionActive}
          title="Q&A mode — answer interview questions in real-time"
        >
          Q&amp;A
        </button>
        <button
          type="button"
          className={`cp-mode-tab${mode === 'pitch' ? ' cp-mode-tab--active' : ''}`}
          aria-pressed={mode === 'pitch'}
          onClick={() => setMode('pitch')}
          disabled={sessionActive}
          title="Pitch mode — structured 3-min self-presentation"
        >
          <span>Pitch</span>
          <span className="cp-pill cp-pill--beta">Beta</span>
        </button>
      </div>

      <div className="cp-mode-tabs__right">
        {/* Pitch shortcut — same action as the overlay's 🎯 icon button */}
        {mode === 'pitch' && !sessionActive && (
          <button
            type="button"
            className="cp-icon-btn"
            aria-label="Generate pitch now"
            title="Generate 3-min pitch (no audio)"
            onClick={handleQuickPitch}
            disabled={busy}
          >
            <Sparkles size={16} strokeWidth={2} />
          </button>
        )}

        {/* Single-shot capture — overlay's "Single shot" CTA */}
        {sessionActive && status !== 'recording' && (
          <button
            type="button"
            className="cp-icon-btn"
            aria-label="Single-shot capture"
            title="One-shot 6s capture"
            onClick={handleSingleShot}
            disabled={busy}
          >
            <AudioWaveform size={16} strokeWidth={2} />
          </button>
        )}

        {sessionActive && (
          <button
            type="button"
            className="cp-stop-btn"
            aria-label="Stop session"
            onClick={() => void stop()}
          >
            <Square size={10} strokeWidth={0} fill="currentColor" />
            <span>Stop</span>
          </button>
        )}
      </div>
    </div>
  );
}
