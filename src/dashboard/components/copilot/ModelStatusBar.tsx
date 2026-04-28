import { ChevronDown, CheckCircle2, Copy, Pin, Settings } from 'lucide-react';
import { mockCopilotSession } from '../../data/copilot';

export default function ModelStatusBar() {
  const { model, confidence } = mockCopilotSession;

  return (
    <div className="cp-model-bar">
      <button type="button" className="cp-model-selector" aria-label="Select model">
        <span className="cp-model-selector__logo" aria-hidden="true">
          A
        </span>
        <span className="cp-model-selector__name">{model}</span>
        <ChevronDown size={14} strokeWidth={2} className="cp-model-selector__chevron" />
      </button>

      <div className="cp-model-bar__right">
        <div className="cp-confidence">
          <CheckCircle2
            size={14}
            strokeWidth={2.2}
            className="cp-confidence__icon"
          />
          <span className="cp-confidence__text">{confidence}</span>
        </div>
        <div className="cp-model-bar__actions">
          <button type="button" className="cp-icon-btn" aria-label="Copy" title="Copy">
            <Copy size={15} strokeWidth={2} />
          </button>
          <button type="button" className="cp-icon-btn" aria-label="Pin" title="Pin">
            <Pin size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="cp-icon-btn"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
