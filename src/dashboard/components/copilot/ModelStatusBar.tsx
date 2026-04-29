import { useState } from 'react';
import { ChevronDown, CheckCircle2, Copy, Pin, Settings } from 'lucide-react';
import { mockCopilotSession } from '../../data/copilot';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  useToast,
} from '../../primitives';
import { useNavigation } from '../../navigation';

const MODEL_OPTIONS = [
  'Claude 3.7 Sonnet',
  'Claude 3.5 Sonnet',
  'Claude 3.5 Haiku',
  'GPT-4o',
  'GPT-4 Turbo',
];

export default function ModelStatusBar() {
  const { confidence, answer } = mockCopilotSession;
  const { navigate } = useNavigation();
  const toast = useToast();

  const [model, setModel] = useState(mockCopilotSession.model);
  const [pinned, setPinned] = useState(false);

  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(answer);
      toast.success('Answer copied');
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <div className="cp-model-bar">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="cp-model-selector" aria-label="Select model">
            <span className="cp-model-selector__logo" aria-hidden="true">
              A
            </span>
            <span className="cp-model-selector__name">{model}</span>
            <ChevronDown size={14} strokeWidth={2} className="cp-model-selector__chevron" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {MODEL_OPTIONS.map((m) => (
            <DropdownMenuItem
              key={m}
              onSelect={() => {
                setModel(m);
                toast.success('Model switched', `Now using ${m}.`);
              }}
            >
              {m}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

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
          <button
            type="button"
            className="cp-icon-btn"
            aria-label="Copy"
            title="Copy answer"
            onClick={copyAnswer}
          >
            <Copy size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="cp-icon-btn"
            aria-label={pinned ? 'Unpin' : 'Pin'}
            title={pinned ? 'Unpin' : 'Pin'}
            onClick={() => {
              setPinned((v) => !v);
              toast.info(pinned ? 'Answer unpinned' : 'Answer pinned');
            }}
            style={pinned ? { color: 'var(--indigo)' } : undefined}
          >
            <Pin size={15} strokeWidth={2} fill={pinned ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            className="cp-icon-btn"
            aria-label="Settings"
            title="Open settings"
            onClick={() => navigate('settings')}
          >
            <Settings size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
