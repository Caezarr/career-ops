import CopilotPanelHeader from './CopilotPanelHeader';
import ModeTabsRow from './ModeTabsRow';
import InterviewSessionBar from './InterviewSessionBar';
import LiveTranscript from './LiveTranscript';
import CopilotAnswerCard from './CopilotAnswerCard';
import ModelStatusBar from './ModelStatusBar';
import ConfigurationPanel from './ConfigurationPanel';

export default function EmbeddedCopilotPanel() {
  return (
    <section className="cp-embedded-panel" aria-label="Career Copilot panel">
      <CopilotPanelHeader />
      <ModeTabsRow />
      <InterviewSessionBar />
      <LiveTranscript />
      <CopilotAnswerCard />
      <ModelStatusBar />
      <ConfigurationPanel />
    </section>
  );
}
