import { AudioWaveform, Maximize2 } from 'lucide-react';
import { mockMockInterview } from '../../data/prep';
import VideoPreview from './VideoPreview';
import ChatBubble from './ChatBubble';
import ScoreMetric from './ScoreMetric';
import AIFeedback from './AIFeedback';
import MockActions from './MockActions';

export default function MockInterview() {
  const { conversation, scores, feedback } = mockMockInterview;

  return (
    <section className="prep-mock">
      <div className="prep-mock__header">
        <h2 className="prep-mock__title">Mock interview</h2>
        <div className="prep-mock__header-right">
          <span className="prep-mock__live">
            <span className="prep-mock__live-dot" aria-hidden="true" />
            <span>Live</span>
          </span>
          <button type="button" className="prep-mock__icon-btn" aria-label="Audio">
            <AudioWaveform size={16} strokeWidth={2} />
          </button>
          <button type="button" className="prep-mock__icon-btn" aria-label="Expand">
            <Maximize2 size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <VideoPreview />

      <div className="prep-mock__chat">
        {conversation.map((m) => (
          <ChatBubble key={m.id} from={m.from} text={m.text} timestamp={m.timestamp} />
        ))}
      </div>

      <div className="prep-mock__metrics">
        {scores.map((s) => (
          <ScoreMetric key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      <AIFeedback items={feedback} />

      <MockActions />
    </section>
  );
}
