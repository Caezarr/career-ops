import { useEffect, useState } from 'react';
import { AlertCircle, Bug, Lightbulb, Heart, Send, Copy, Loader2 } from 'lucide-react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useToast,
} from '../../primitives';
import { useNavigation } from '../../navigation';
import {
  captureDiagnostics,
  copyToClipboard,
  formatFeedbackBody,
  submitFeedback,
  type FeedbackSeverity,
} from '../../lib/feedback';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

interface SeverityOption {
  id: FeedbackSeverity;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ size?: number }>;
}

const SEVERITY_OPTIONS: SeverityOption[] = [
  {
    id: 'crash',
    label: 'Crash',
    hint: 'The app froze, white-screened, or quit unexpectedly.',
    Icon: AlertCircle,
  },
  {
    id: 'bug',
    label: 'Bug',
    hint: 'Something behaves wrong but the app keeps running.',
    Icon: Bug,
  },
  {
    id: 'idea',
    label: 'Idea',
    hint: 'A suggestion or a missing capability you want.',
    Icon: Lightbulb,
  },
  {
    id: 'praise',
    label: 'Praise',
    hint: 'Tell us what works — it helps us prioritise.',
    Icon: Heart,
  },
];

/** Captured snapshot of runtime context — refreshed when the modal
 *  opens so the report reflects the moment the user hit Report. */
interface Diagnostics {
  appVersion: string;
  tauriVersion: string;
  userAgent: string;
  page: string;
  capturedAt: string;
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const toast = useToast();
  const { page } = useNavigation();
  const [severity, setSeverity] = useState<FeedbackSeverity>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [busy, setBusy] = useState(false);

  // Snapshot diagnostics on open so the values reflect the user's
  // actual moment of frustration. We avoid re-snapshotting on every
  // change to keep the displayed values stable while they type.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    captureDiagnostics(page).then((d) => {
      if (!cancelled) setDiagnostics(d);
    });
    return () => {
      cancelled = true;
    };
  }, [open, page]);

  // Reset the form when the modal closes — beta reports are one-shot,
  // we don't want a stale crash report leaking into the next session.
  useEffect(() => {
    if (open) return;
    setSeverity('bug');
    setTitle('');
    setDescription('');
    setSteps('');
    setDiagnostics(null);
    setBusy(false);
  }, [open]);

  const canSend = description.trim().length > 5 && !busy;

  async function handleSend() {
    if (!diagnostics || !canSend) return;
    setBusy(true);
    const result = await submitFeedback({
      severity,
      title: title.trim() || description.trim().slice(0, 80),
      description,
      steps,
      ...diagnostics,
    });
    setBusy(false);
    if (result.mailOpened || result.copied) {
      toast.success(
        'Feedback packaged',
        result.mailOpened
          ? 'Your mail client opened with the report. Hit send when you are ready.'
          : 'Report copied to clipboard — paste it wherever you reach us.',
      );
      onClose();
    } else {
      toast.error(
        'Could not send feedback',
        'Both clipboard and mail client failed. Try copying the diagnostics below manually.',
      );
    }
  }

  async function handleCopyOnly() {
    if (!diagnostics) return;
    const body = formatFeedbackBody({
      severity,
      title: title.trim() || description.trim().slice(0, 80),
      description,
      steps,
      ...diagnostics,
    });
    const ok = await copyToClipboard(body);
    if (ok) {
      toast.success('Report copied', 'Paste it in Linear / GitHub / a DM.');
    } else {
      toast.error('Clipboard unavailable', 'Use the Send button instead.');
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Send feedback">
      <ModalHeader
        title="Help us shape the beta"
        subtitle="Tell us what broke, what feels off, or what's missing."
        onClose={onClose}
      />
      <ModalBody>
        <div className="ds-shared-stack">
          {/* Severity picker — segmented buttons */}
          <div className="settings-feedback__severity" role="radiogroup" aria-label="Type">
            {SEVERITY_OPTIONS.map(({ id, label, hint, Icon }) => {
              const selected = severity === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={
                    'settings-feedback__sev-btn' +
                    (selected ? ' settings-feedback__sev-btn--active' : '') +
                    ` settings-feedback__sev-btn--${id}`
                  }
                  onClick={() => setSeverity(id)}
                  title={hint}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <label className="ds-shared-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span className="ds-shared-label">Headline (optional)</span>
            <input
              type="text"
              className="ds-shared-input"
              placeholder="A one-liner — we'll generate one if you skip it"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </label>

          <label className="ds-shared-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span className="ds-shared-label">
              What happened? <span style={{ color: 'var(--text-3)' }}>(required)</span>
            </span>
            <textarea
              className="ds-shared-input settings-feedback__textarea"
              rows={5}
              placeholder="Describe what you saw, what you expected, and how it differed."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="ds-shared-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span className="ds-shared-label">Steps to reproduce (optional)</span>
            <textarea
              className="ds-shared-input settings-feedback__textarea"
              rows={3}
              placeholder={'1. Click X\n2. Type Y\n3. Press Z and observe…'}
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
          </label>

          {/* Auto-attached diagnostics — collapsible-like read-only summary */}
          <div className="settings-feedback__diag">
            <span className="settings-feedback__diag-title">
              Auto-attached diagnostics
            </span>
            {diagnostics ? (
              <ul className="settings-feedback__diag-list">
                <li>
                  <strong>Page:</strong> {diagnostics.page}
                </li>
                <li>
                  <strong>App version:</strong> {diagnostics.appVersion}
                </li>
                <li>
                  <strong>Tauri:</strong> {diagnostics.tauriVersion}
                </li>
                <li>
                  <strong>User agent:</strong>{' '}
                  <code className="settings-feedback__diag-code">
                    {diagnostics.userAgent.slice(0, 80)}
                    {diagnostics.userAgent.length > 80 ? '…' : ''}
                  </code>
                </li>
              </ul>
            ) : (
              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                Capturing context…
              </span>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--secondary"
          onClick={handleCopyOnly}
          disabled={!description.trim() || busy}
          title="Copy the formatted report to your clipboard"
        >
          <Copy size={13} />
          <span style={{ marginLeft: 6 }}>Copy report</span>
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={handleSend}
          disabled={!canSend}
        >
          {busy ? (
            <>
              <Loader2 size={13} className="settings-danger-modal__spin" />
              <span style={{ marginLeft: 6 }}>Sending…</span>
            </>
          ) : (
            <>
              <Send size={13} />
              <span style={{ marginLeft: 6 }}>Send feedback</span>
            </>
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}
