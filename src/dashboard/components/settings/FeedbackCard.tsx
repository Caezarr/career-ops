import { useEffect, useState } from 'react';
import { AlertCircle, Bug, Lightbulb, Heart, Send, Copy, Loader2 } from 'lucide-react';
import { useToast } from '../../primitives';
import { useNavigation } from '../../navigation';
import {
  captureDiagnostics,
  copyToClipboard,
  formatFeedbackBody,
  submitFeedback,
  type FeedbackSeverity,
} from '../../lib/feedback';

interface SeverityOption {
  id: FeedbackSeverity;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ size?: number }>;
}

const SEVERITY_OPTIONS: SeverityOption[] = [
  { id: 'crash', label: 'Crash', hint: 'The app froze or quit.', Icon: AlertCircle },
  { id: 'bug', label: 'Bug', hint: 'Something behaves wrong.', Icon: Bug },
  { id: 'idea', label: 'Idea', hint: 'A suggestion or missing capability.', Icon: Lightbulb },
  { id: 'praise', label: 'Praise', hint: 'Tell us what works.', Icon: Heart },
];

interface Diagnostics {
  appVersion: string;
  tauriVersion: string;
  userAgent: string;
  page: string;
  capturedAt: string;
}

/**
 * In-page feedback form — same content as FeedbackModal but rendered as
 * a settings card. The two share captureDiagnostics + submitFeedback so
 * the report shape is identical regardless of entry point.
 */
export default function FeedbackCard() {
  const toast = useToast();
  const { page } = useNavigation();
  const [severity, setSeverity] = useState<FeedbackSeverity>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    captureDiagnostics(page).then((d) => {
      if (!cancelled) setDiagnostics(d);
    });
    return () => {
      cancelled = true;
    };
  }, [page]);

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
          ? 'Your mail client opened with the report.'
          : 'Report copied to clipboard.',
      );
      // Clear the form so the user knows it was sent.
      setTitle('');
      setDescription('');
      setSteps('');
    } else {
      toast.error('Could not send feedback', 'Try again or copy manually.');
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
    if (ok) toast.success('Report copied', 'Paste it in Linear / GitHub / a DM.');
    else toast.error('Clipboard unavailable', 'Use the Send button instead.');
  }

  return (
    <section className="settings-card" aria-labelledby="settings-feedback-title">
      <h2 id="settings-feedback-title" className="settings-card__title">
        Help us shape the beta
        <span className="settings-feedback__beta-pill">Beta</span>
      </h2>
      <p className="settings-feedback__lede">
        Career OS is in early beta — every report you send shapes the
        next release. We auto-capture the runtime context so you don't
        have to dig for version numbers.
      </p>

      {/* Severity picker */}
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

      <div className="settings-feedback__form">
        <label className="settings-feedback__field">
          <span className="settings-feedback__field-label">
            Headline <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
          </span>
          <input
            type="text"
            className="ds-shared-input"
            placeholder="A one-liner — we'll generate one if you skip it"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
        </label>

        <label className="settings-feedback__field">
          <span className="settings-feedback__field-label">
            What happened? <span style={{ color: 'var(--red)', fontWeight: 400 }}>(required)</span>
          </span>
          <textarea
            className="ds-shared-input settings-feedback__textarea"
            rows={5}
            placeholder="Describe what you saw, what you expected, and how it differed."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="settings-feedback__field">
          <span className="settings-feedback__field-label">
            Steps to reproduce{' '}
            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
          </span>
          <textarea
            className="ds-shared-input settings-feedback__textarea"
            rows={3}
            placeholder={'1. Click X\n2. Type Y\n3. Press Z and observe…'}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
          />
        </label>
      </div>

      {/* Auto-attached diagnostics */}
      <div className="settings-feedback__diag">
        <span className="settings-feedback__diag-title">Auto-attached diagnostics</span>
        {diagnostics ? (
          <ul className="settings-feedback__diag-list">
            <li><strong>Page:</strong> {diagnostics.page}</li>
            <li><strong>App version:</strong> {diagnostics.appVersion}</li>
            <li><strong>Tauri:</strong> {diagnostics.tauriVersion}</li>
            <li>
              <strong>User agent:</strong>{' '}
              <code className="settings-feedback__diag-code">
                {diagnostics.userAgent.slice(0, 80)}
                {diagnostics.userAgent.length > 80 ? '…' : ''}
              </code>
            </li>
          </ul>
        ) : (
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Capturing context…</span>
        )}
      </div>

      <div className="settings-feedback__actions">
        <button
          type="button"
          className="ds-btn ds-btn--secondary"
          onClick={handleCopyOnly}
          disabled={!description.trim() || busy}
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
      </div>
    </section>
  );
}
