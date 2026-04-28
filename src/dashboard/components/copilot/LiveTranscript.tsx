import { Maximize2 } from 'lucide-react';
import TranscriptBubble from './TranscriptBubble';
import { mockCopilotSession } from '../../data/copilot';

export default function LiveTranscript() {
  return (
    <div className="cp-live-transcript">
      <div className="cp-live-transcript__header">
        <span className="cp-section-eyebrow">Live transcript</span>
        <div className="cp-live-transcript__header-right">
          <span className="cp-pill cp-pill--green cp-pill--small">Live</span>
          <button
            type="button"
            className="cp-icon-btn"
            aria-label="Expand transcript"
            title="Expand"
          >
            <Maximize2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="cp-live-transcript__list">
        {mockCopilotSession.transcript.map((item) => (
          <TranscriptBubble
            key={item.id}
            from={item.from}
            name={item.name}
            text={item.text}
            timestamp={item.timestamp}
          />
        ))}
      </div>
    </div>
  );
}
