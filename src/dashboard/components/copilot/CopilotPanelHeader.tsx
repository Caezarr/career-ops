import { Sparkles, Minus, X } from 'lucide-react';

export default function CopilotPanelHeader() {
  return (
    <div className="cp-panel-header">
      <div className="cp-panel-header__brand">
        <Sparkles size={17} strokeWidth={2} className="cp-panel-header__sparkles" />
        <span className="cp-panel-header__title">Career Copilot</span>
      </div>

      <div className="cp-panel-header__status">
        <span className="cp-listening-dot" aria-hidden="true" />
        <span>Listening</span>
      </div>

      <div className="cp-panel-header__actions">
        <button
          type="button"
          className="cp-icon-btn"
          aria-label="Minimize"
          title="Minimize"
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="cp-icon-btn"
          aria-label="Close"
          title="Close"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
