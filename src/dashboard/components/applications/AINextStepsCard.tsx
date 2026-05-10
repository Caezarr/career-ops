import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, AlertTriangle, KeyRound } from 'lucide-react';
import { useToast } from '../../primitives';
import { useAppStore, type Application } from '../../store';
import { generateApplicationNextSteps } from '../../lib/applicationNextSteps';
import { readAnthropicKey } from '../../hooks/useAnthropicKey';

interface AINextStepsCardProps {
  application: Application;
  /** Job for the linked posting — provides JD text and company/role
   *  for the prompt. */
  job: { company: string; role: string; jdText?: string } | null;
  /** Optional CV text to feed Claude as candidate context. */
  cvText?: string;
}

/** AI-generated next-step suggestions for the application. The list
 *  is persisted on `application.aiNextSteps` — empty by default for
 *  new applications. The card has three states:
 *
 *    1. Empty: shows a "Generate next steps" CTA. Disabled with a
 *       hint when the Anthropic key isn't set.
 *    2. Loading: spinner + "Generating…" — disables the button.
 *    3. Populated: bulleted list + a "Regenerate" link in the header.
 *
 *  Click on a step copies it to the clipboard and toasts. We avoided
 *  inline checkboxes for now — the steps are advisory (not tasks)
 *  and accumulating completion state per app is scope creep. */
export default function AINextStepsCard({
  application,
  job,
  cvText,
}: AINextStepsCardProps) {
  const toast = useToast();
  const setApplicationNextSteps = useAppStore((s) => s.setApplicationNextSteps);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = application.aiNextSteps;
  const hasKey = !!readAnthropicKey();

  async function generate() {
    if (!hasKey) {
      setError('Set your Anthropic key in Settings → API Keys.');
      return;
    }
    if (!job) {
      setError('Link a job to this application first — Claude needs the company / role context.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await generateApplicationNextSteps({
        company: job.company,
        role: job.role,
        stage: application.stage,
        jdText: job.jdText,
        cvText,
      });
      setApplicationNextSteps(application.id, result);
      toast.success('Next steps generated', `${result.length} actions queued for this application.`);
    } catch (e) {
      setError(typeof e === 'string' ? e : (e as Error).message ?? 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function copyStep(step: string) {
    try {
      await navigator.clipboard.writeText(step);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy');
    }
  }

  // ── Empty state ────────────────────────────────────────────────
  if (steps.length === 0) {
    return (
      <section className="ai-next-steps">
        <header className="ai-next-steps__header">
          <Sparkles size={16} strokeWidth={2} className="ai-next-steps__header-icon" />
          <span className="ai-next-steps__title">AI next steps</span>
        </header>
        <div className="ai-next-steps__empty">
          {!hasKey ? (
            <div className="ai-next-steps__notice">
              <KeyRound size={14} />
              <span>
                Add your Anthropic key in Settings → API Keys to generate
                tailored next steps.
              </span>
            </div>
          ) : (
            <p className="ai-next-steps__empty-text">
              Get 3-5 concrete actions Claude tailored to this application's
              stage, the JD, and your CV.
            </p>
          )}
          {error && (
            <div className="ai-next-steps__error" role="alert">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}
          <button
            type="button"
            className="ai-next-steps__generate"
            disabled={busy || !hasKey || !job}
            onClick={() => void generate()}
          >
            {busy ? (
              <>
                <Loader2 size={14} className="ai-next-steps__spin" />
                <span>Generating…</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Generate next steps</span>
              </>
            )}
          </button>
        </div>
      </section>
    );
  }

  // ── Populated state ───────────────────────────────────────────
  return (
    <section className="ai-next-steps">
      <header className="ai-next-steps__header">
        <Sparkles size={16} strokeWidth={2} className="ai-next-steps__header-icon" />
        <span className="ai-next-steps__title">AI next steps</span>
        <button
          type="button"
          className="ai-next-steps__regen"
          disabled={busy || !hasKey || !job}
          onClick={() => void generate()}
          title="Regenerate based on the current stage + context"
        >
          {busy ? (
            <Loader2 size={12} className="ai-next-steps__spin" />
          ) : (
            <RefreshCw size={12} strokeWidth={2} />
          )}
          <span>{busy ? 'Generating…' : 'Regenerate'}</span>
        </button>
      </header>

      {error && (
        <div className="ai-next-steps__error" role="alert">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      <ul className="ai-next-steps__list">
        {steps.map((step) => (
          <li
            key={step}
            className="ai-next-steps__item ai-next-steps__item--hover"
            onClick={() => void copyStep(step)}
            title="Click to copy"
          >
            <span className="ai-next-steps__dot" aria-hidden="true" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
