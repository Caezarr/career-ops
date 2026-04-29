import { Sparkles, Minus, X } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';

export default function CopilotPanelHeader() {
  const minimized = useAppStore((s) => s.copilotPanelMinimized);
  const setMinimized = useAppStore((s) => s.setCopilotPanelMinimized);
  const setVisible = useAppStore((s) => s.setCopilotPanelVisible);
  const toast = useToast();

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
          aria-label={minimized ? 'Expand' : 'Minimize'}
          title={minimized ? 'Expand' : 'Minimize'}
          onClick={() => setMinimized(!minimized)}
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="cp-icon-btn"
          aria-label="Close"
          title="Close panel"
          onClick={() => {
            setVisible(false);
            toast.info('Copilot panel hidden', 'Click "Show Copilot" to bring it back.');
          }}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
