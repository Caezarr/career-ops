import { useState } from 'react';
import { Sparkles, Play, AlertTriangle, Lock } from 'lucide-react';
import CopilotPanelHeader from './CopilotPanelHeader';
import ModeTabsRow from './ModeTabsRow';
import InterviewSessionBar from './InterviewSessionBar';
import LiveTranscript from './LiveTranscript';
import CopilotAnswerCard from './CopilotAnswerCard';
import CopilotTeleprompter from './CopilotTeleprompter';
import ModelStatusBar from './ModelStatusBar';
import ConfigurationPanel from './ConfigurationPanel';
import CopilotContextPicker from './CopilotContextPicker';
import UpgradeModal from '../shared/UpgradeModal';
import { useAppStore } from '../../store';
import { useCopilotControls } from '../../hooks/useCopilotSession';
import { usePlanGate } from '../../hooks/usePlanGate';

export default function EmbeddedCopilotPanel() {
  const visible = useAppStore((s) => s.copilotPanelVisible);
  const minimized = useAppStore((s) => s.copilotPanelMinimized);
  const setVisible = useAppStore((s) => s.setCopilotPanelVisible);
  const setMinimized = useAppStore((s) => s.setCopilotPanelMinimized);
  const mode = useAppStore((s) => s.copilotMode);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const error = useAppStore((s) => s.copilotError);
  const { start } = useCopilotControls();
  const gate = usePlanGate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

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

  // No active session → show the linked-context picker + Start CTA.
  // The Anthropic key lives on the Worker (server-managed) so the
  // "key required" gate is gone — auth errors surface via the
  // backend `error` channel if the user's JWT is missing/expired.
  const sessionActive = activeSessionId !== null;

  return (
    <section className="cp-embedded-panel" aria-label="Career Copilot panel">
      <CopilotPanelHeader />
      <ModeTabsRow />

      {!sessionActive && (
        <div className="cp-embedded-panel__cta">
          <>
            {/* Linked-context picker — Career OS reads JD + CV from
                here when the user clicks Start. Picker state is
                persisted so smart defaults survive a reload. */}
            <CopilotContextPicker />
              <button
                type="button"
                className="cp-btn cp-btn--primary cp-embedded-panel__start"
                onClick={() => {
                  if (!gate.canStartCopilotSession) {
                    setUpgradeOpen(true);
                    return;
                  }
                  void start({ mode });
                }}
                title={!gate.canStartCopilotSession ? gate.reason.copilot : undefined}
              >
                {gate.canStartCopilotSession ? (
                  <Play size={14} strokeWidth={2} fill="currentColor" />
                ) : (
                  <Lock size={14} strokeWidth={2} />
                )}
                <span>
                  Start {mode === 'pitch' ? 'pitch session' : 'live session'}
                </span>
                <span className="cp-embedded-panel__shortcut">⌘⇧Space</span>
              </button>
          </>
        </div>
      )}

      {sessionActive && <InterviewSessionBar />}

      {/* Transcript + answer card render ONLY while a session is
          active. On app launch (or after a session ends) the user
          should see a clean "Start a new session" state — not the
          fallback rendering of the most recent past session, which
          made the Copilot look like it was already running and
          confused the start-fresh flow.

          Past sessions remain reviewable via the Recent Sessions
          panel elsewhere on the dashboard. */}
      {sessionActive && <LiveTranscript />}
      {sessionActive && <CopilotAnswerCard />}
      {/* Teleprompter has its own internal `if (!sessionActive)
          return null` guard — safe to leave mounted; it renders
          fragmentary mounts cheaply. */}
      <CopilotTeleprompter />

      {error && (
        <div className="cp-embedded-panel__error" role="alert">
          <AlertTriangle size={14} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      <ModelStatusBar />
      <ConfigurationPanel />
      {upgradeOpen && (
        <UpgradeModal
          feature="copilot"
          reason={gate.reason.copilot}
          onClose={() => setUpgradeOpen(false)}
        />
      )}
    </section>
  );
}
