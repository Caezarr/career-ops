import { Sparkles, Play, AlertTriangle, KeyRound } from 'lucide-react';
import CopilotPanelHeader from './CopilotPanelHeader';
import ModeTabsRow from './ModeTabsRow';
import InterviewSessionBar from './InterviewSessionBar';
import LiveTranscript from './LiveTranscript';
import CopilotAnswerCard from './CopilotAnswerCard';
import ModelStatusBar from './ModelStatusBar';
import ConfigurationPanel from './ConfigurationPanel';
import { useAppStore } from '../../store';
import { useCopilotControls } from '../../hooks/useCopilotSession';
import { readCopilotConfig } from '../../hooks/useAnthropicKey';
import { useNavigation } from '../../navigation';

export default function EmbeddedCopilotPanel() {
  const visible = useAppStore((s) => s.copilotPanelVisible);
  const minimized = useAppStore((s) => s.copilotPanelMinimized);
  const setVisible = useAppStore((s) => s.setCopilotPanelVisible);
  const setMinimized = useAppStore((s) => s.setCopilotPanelMinimized);
  const mode = useAppStore((s) => s.copilotMode);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const error = useAppStore((s) => s.copilotError);
  const { start } = useCopilotControls();
  const { navigate } = useNavigation();

  if (!visible) {
    return (
      <div className="cp-embedded-panel cp-embedded-panel--hidden">
        <button
          type="button"
          className="cp-show-panel"
          onClick={() => setVisible(true)}
        >
          <Sparkles size={16} strokeWidth={2} />
          <span>Show Copilot panel</span>
        </button>
      </div>
    );
  }

  if (minimized) {
    return (
      <section className="cp-embedded-panel" aria-label="Career Copilot panel">
        <CopilotPanelHeader />
        <button
          type="button"
          className="cp-show-panel"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => setMinimized(false)}
        >
          <Sparkles size={14} strokeWidth={2} />
          <span>Expand panel</span>
        </button>
      </section>
    );
  }

  // No active session → show the CTA + key check (replaces the old
  // popup-window flow). Mode toggle stays so the user can pick before
  // starting.
  const sessionActive = activeSessionId !== null;
  const hasKey = !!readCopilotConfig().anthropicKey;

  return (
    <section className="cp-embedded-panel" aria-label="Career Copilot panel">
      <CopilotPanelHeader />
      <ModeTabsRow />

      {!sessionActive && (
        <div className="cp-embedded-panel__cta">
          {!hasKey ? (
            <div className="cp-embedded-panel__keymissing">
              <KeyRound size={18} strokeWidth={2} />
              <div>
                <strong>Anthropic key required</strong>
                <p>
                  Add your Anthropic key in Settings → API Keys to enable
                  live coaching.
                </p>
                <button
                  type="button"
                  className="cp-btn cp-btn--outlined"
                  onClick={() => navigate('settings')}
                >
                  Open Settings
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="cp-btn cp-btn--primary cp-embedded-panel__start"
              onClick={() =>
                void start({
                  mode,
                })
              }
            >
              <Play size={14} strokeWidth={2} fill="currentColor" />
              <span>
                Start {mode === 'pitch' ? 'pitch session' : 'live session'}
              </span>
              <span className="cp-embedded-panel__shortcut">⌘⇧Space</span>
            </button>
          )}
        </div>
      )}

      {sessionActive && <InterviewSessionBar />}

      <LiveTranscript />
      <CopilotAnswerCard />

      {error && (
        <div className="cp-embedded-panel__error" role="alert">
          <AlertTriangle size={14} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      <ModelStatusBar />
      <ConfigurationPanel />
    </section>
  );
}
