import { Sparkles, Minus, X } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';
import type { CopilotStatus } from '../../store/slices/copilotSessions';

interface StatusPresentation {
  text: string;
  className: string;
}

/** Map every backend status into something a human reads at a glance.
 *  `idle` returns null so the header shows nothing — there's no
 *  session, nothing to report. */
function presentation(status: CopilotStatus): StatusPresentation | null {
  switch (status) {
    case 'listening':
      return { text: 'Listening', className: 'cp-listening-dot' };
    case 'recording':
      return { text: 'Recording', className: 'cp-recording-dot' };
    case 'thinking':
      return { text: 'Thinking', className: 'cp-thinking-dot' };
    case 'ready':
      return { text: 'Ready', className: 'cp-ready-dot' };
    case 'error':
      return { text: 'Error', className: 'cp-error-dot' };
    case 'idle':
    default:
      return null;
  }
}

export default function CopilotPanelHeader() {
  const minimized = useAppStore((s) => s.copilotPanelMinimized);
  const setMinimized = useAppStore((s) => s.setCopilotPanelMinimized);
  const setVisible = useAppStore((s) => s.setCopilotPanelVisible);
  const status = useAppStore((s) => s.copilotStatus);
  const toast = useToast();

  const present = presentation(status);

  return (
    <div className="cp-panel-header">
      <div className="cp-panel-header__brand">
        <Sparkles size={17} strokeWidth={2} className="cp-panel-header__sparkles" />
        <span className="cp-panel-header__title">Career Copilot</span>
      </div>

      {present && (
        <div className="cp-panel-header__status">
          <span className={present.className} aria-hidden="true" />
          <span>{present.text}</span>
        </div>
      )}

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
