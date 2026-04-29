import { Sparkles } from 'lucide-react';
import CopilotPanelHeader from './CopilotPanelHeader';
import ModeTabsRow from './ModeTabsRow';
import InterviewSessionBar from './InterviewSessionBar';
import LiveTranscript from './LiveTranscript';
import CopilotAnswerCard from './CopilotAnswerCard';
import ModelStatusBar from './ModelStatusBar';
import ConfigurationPanel from './ConfigurationPanel';
import { useAppStore } from '../../store';

export default function EmbeddedCopilotPanel() {
  const visible = useAppStore((s) => s.copilotPanelVisible);
  const minimized = useAppStore((s) => s.copilotPanelMinimized);
  const setVisible = useAppStore((s) => s.setCopilotPanelVisible);
  const setMinimized = useAppStore((s) => s.setCopilotPanelMinimized);

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

  return (
    <section className="cp-embedded-panel" aria-label="Career Copilot panel">
      <CopilotPanelHeader />
      {!minimized && (
        <>
          <ModeTabsRow />
          <InterviewSessionBar />
          <LiveTranscript />
          <CopilotAnswerCard />
          <ModelStatusBar />
          <ConfigurationPanel />
        </>
      )}
      {minimized && (
        <button
          type="button"
          className="cp-show-panel"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => setMinimized(false)}
        >
          <Sparkles size={14} strokeWidth={2} />
          <span>Expand panel</span>
        </button>
      )}
    </section>
  );
}
