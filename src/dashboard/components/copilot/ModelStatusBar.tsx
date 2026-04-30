import { useEffect, useState } from 'react';
import { ChevronDown, CheckCircle2, Copy, AlertTriangle, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  useToast,
} from '../../primitives';
import { useNavigation } from '../../navigation';
import { useAppStore } from '../../store';
import { readClaudeModel } from '../../hooks/useAnthropicKey';

// Models we actually call. Claude Sonnet 3.7 was removed — Career OS
// does not target deprecated models. Keep this list in sync with the
// providers listed in the Settings → API Keys card.
const MODEL_OPTIONS = [
  'Claude Sonnet 4.5',
  'Claude Opus 4.1',
  'Claude Haiku 4.5',
  'GPT-4o',
];

/** Persist the chosen model in the same `ic-config` blob the Tauri
 *  backend reads when it builds CaptureConfig. Writing through this
 *  helper keeps the dashboard and the overlay in sync. */
function writeClaudeModel(model: string) {
  try {
    const raw = window.localStorage.getItem('ic-config');
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.model = model;
    window.localStorage.setItem('ic-config', JSON.stringify(parsed));
  } catch {
    // Best effort — localStorage can throw in private mode.
  }
}

export default function ModelStatusBar() {
  const { navigate } = useNavigation();
  const toast = useToast();
  const sessions = useAppStore((s) => s.copilotSessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const pendingAnswer = useAppStore((s) => s.pendingAnswer);
  const status = useAppStore((s) => s.copilotStatus);
  const error = useAppStore((s) => s.copilotError);

  // Read the persisted model on mount and on every change to the panel.
  // Backed by ic-config so the value matches what the Tauri backend uses.
  const [model, setModel] = useState<string>(() => readClaudeModel() ?? 'Claude Sonnet 4.5');
  useEffect(() => {
    const m = readClaudeModel();
    if (m && m !== model) setModel(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve the latest answer text for the Copy button — prefer
  // in-flight stream, fall back to the most recent committed answer.
  const session =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null;
  const lastAnswer = session?.answers[session.answers.length - 1] ?? null;
  const answerText = pendingAnswer || lastAnswer?.text || '';

  // Surface confidence as a tiny static label for now — once the
  // backend emits a per-answer confidence we plumb it through.
  const confidenceLabel = error
    ? 'Backend error'
    : status === 'thinking'
    ? 'Generating…'
    : status === 'ready' || lastAnswer
    ? 'Answer ready'
    : status === 'listening'
    ? 'Awaiting question'
    : 'Idle';

  async function copyAnswer() {
    if (!answerText) {
      toast.info('Nothing to copy yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(answerText);
      toast.success('Answer copied');
    } catch {
      toast.error('Could not copy');
    }
  }

  function pickModel(m: string) {
    setModel(m);
    writeClaudeModel(m);
    toast.success('Model switched', `Career OS will use ${m} on the next call.`);
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
            <DropdownMenuItem key={m} onSelect={() => pickModel(m)}>
              {m}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="cp-model-bar__right">
        <div className="cp-confidence">
          {error ? (
            <AlertTriangle size={14} strokeWidth={2.2} className="cp-confidence__icon" style={{ color: 'var(--red)' }} />
          ) : (
            <CheckCircle2 size={14} strokeWidth={2.2} className="cp-confidence__icon" />
          )}
          <span className="cp-confidence__text">{confidenceLabel}</span>
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
