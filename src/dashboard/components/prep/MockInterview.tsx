import { useState } from 'react';
import { AudioWaveform, Maximize2 } from 'lucide-react';
import { mockMockInterview } from '../../data/prep';
import VideoPreview from './VideoPreview';
import ChatBubble from './ChatBubble';
import ScoreMetric from './ScoreMetric';
import AIFeedback from './AIFeedback';
import MockActions from './MockActions';
import Tooltip from '../shared/Tooltip';
import {
  Modal,
  ModalBody,
  ModalHeader,
  useToast,
} from '../../primitives';
import { useAppStore } from '../../store';

const SCORE_TOOLTIPS: Record<string, string> = {
  Structure: 'Pyramid adherence',
  Conciseness: 'Word economy',
  Evidence: 'Numbers, facts, names',
  Memorability: 'Top 1% factor',
};

export default function MockInterview() {
  const toast = useToast();
  const prepQuestions = useAppStore((s) => s.prepQuestions);

  const { conversation: initialConversation, scores, feedback } = mockMockInterview;

  const [conversation, setConversation] = useState(initialConversation);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  function handleRetry() {
    toast.info('Retry coming soon');
  }

  function handleSave() {
    toast.success('Feedback saved');
  }

  function handleContinue() {
    toast.info('Loading next question…');
    window.setTimeout(() => {
      const nextIdx = (questionIndex + 1) % prepQuestions.length;
      const nextQ = prepQuestions[nextIdx];
      setQuestionIndex(nextIdx);
      setConversation([
        {
          id: `m-ai-${nextIdx}`,
          from: 'ai' as const,
          text: nextQ.question,
          timestamp: '00:02',
        },
        {
          id: `m-user-${nextIdx}`,
          from: 'user' as const,
          text: 'Take a breath, structure your answer using the framework, and lead with the impact.',
          timestamp: '00:30',
        },
      ]);
    }, 1000);
  }

  function MockBody() {
    return (
      <>
        <VideoPreview />

        <div className="prep-mock__chat">
          {conversation.map((m) => (
            <ChatBubble key={m.id} from={m.from} text={m.text} timestamp={m.timestamp} />
          ))}
        </div>

        <div className="prep-mock__metrics">
          {scores.map((s) => (
            <Tooltip key={s.label} content={SCORE_TOOLTIPS[s.label] ?? s.label}>
              <span style={{ display: 'block', flex: 1 }}>
                <ScoreMetric label={s.label} value={s.value} />
              </span>
            </Tooltip>
          ))}
        </div>

        <AIFeedback items={feedback} />

        <MockActions onRetry={handleRetry} onSave={handleSave} onContinue={handleContinue} />
      </>
    );
  }

  return (
    <section className="prep-mock">
      <div className="prep-mock__header">
        <h2 className="prep-mock__title">Mock interview</h2>
        <div className="prep-mock__header-right">
          <span className="prep-mock__live">
            <span className="prep-mock__live-dot" aria-hidden="true" />
            <span>Live</span>
          </span>
          <button
            type="button"
            className="prep-mock__icon-btn"
            aria-label="Audio"
            onClick={() => toast.info('Audio settings (coming soon)')}
          >
            <AudioWaveform size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="prep-mock__icon-btn"
            aria-label="Expand"
            onClick={() => setExpandedOpen(true)}
          >
            <Maximize2 size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <MockBody />

      <Modal
        open={expandedOpen}
        onClose={() => setExpandedOpen(false)}
        size="xl"
        ariaLabel="Mock interview"
      >
        <ModalHeader title="Mock interview" onClose={() => setExpandedOpen(false)} />
        <ModalBody>
          <MockBody />
        </ModalBody>
      </Modal>
    </section>
  );
}
