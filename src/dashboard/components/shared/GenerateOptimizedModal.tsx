import { useEffect, useState } from 'react';
import { ArrowRight, AlertTriangle, KeyRound, Sparkles, FileDown, FilePlus } from 'lucide-react';
import { Modal, ModalBody, ModalFooter, ModalHeader, useToast } from '../../primitives';
import { useAppStore } from '../../store';
import { getCvParsedText } from '../../store/slices/cvs';
import { readAnthropicKey, readClaudeModel } from '../../hooks/useAnthropicKey';
import {
  generateOptimizedCv,
  isProfileReadyForCv,
  type OptimizedCvResult,
} from '../../lib/optimize';
import { open as openPath } from '@tauri-apps/plugin-shell';

interface GenerateOptimizedModalProps {
  open: boolean;
  onClose: () => void;
  /** Source CV id. Defaults to the selected variant. */
  cvId?: string;
  /** Target role label — used in the header + naming the new variant. */
  targetRole: string;
  /** Optional override of the JD; defaults to atsAnalyzerJd in store. */
  jdText?: string;
  /** Called when the user clicks 'Save as variant'. */
  onCreate: (result: OptimizedCvResult) => void;
}

type Phase = 'idle' | 'running' | 'done' | 'error' | 'key-missing' | 'profile-incomplete';

export default function GenerateOptimizedModal({
  open,
  onClose,
  cvId,
  targetRole,
  jdText,
  onCreate,
}: GenerateOptimizedModalProps) {
  const toast = useToast();
  const cvs = useAppStore((s) => s.cvs);
  const selectedCvId = useAppStore((s) => s.selectedCvId);
  const atsByCv = useAppStore((s) => s.atsByCv);
  const user = useAppStore((s) => s.user);
  const atsAnalyzerJd = useAppStore((s) => s.atsAnalyzerJd);

  const targetCvId = cvId ?? selectedCvId ?? cvs[0]?.id;
  const targetCv = cvs.find((c) => c.id === targetCvId);
  const effectiveJd = (jdText ?? atsAnalyzerJd ?? '').trim();
  const analysis = targetCvId ? atsByCv[targetCvId] : undefined;

  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizedCvResult | null>(null);

  useEffect(() => {
    if (!open) return;

    setResult(null);
    setErrorMsg(null);

    if (!readAnthropicKey()) {
      setPhase('key-missing');
      return;
    }
    if (!isProfileReadyForCv(user)) {
      setPhase('profile-incomplete');
      return;
    }
    if (!targetCv) {
      setPhase('error');
      setErrorMsg('No source CV selected.');
      return;
    }

    const cvText = getCvParsedText(targetCv).trim();
    if (!cvText) {
      setPhase('error');
      setErrorMsg('Source CV has no parsed text — re-upload the PDF.');
      return;
    }
    if (!effectiveJd) {
      setPhase('error');
      setErrorMsg(
        'No job description available. Paste one in ATS Analyzer or set a target role with a JD.',
      );
      return;
    }

    let cancelled = false;
    setPhase('running');

    generateOptimizedCv({
      cvText,
      jdText: effectiveJd,
      analysis: analysis ?? null,
      user,
      anthropicKey: readAnthropicKey() ?? '',
      model: readClaudeModel(),
    })
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setPhase('done');
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMsg(typeof e === 'string' ? e : (e as Error).message ?? 'Generation failed');
        setPhase('error');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetCvId, effectiveJd]);

  const variantName = `Optimized for ${targetRole}`;
  const beforeScore = analysis?.atsScore ?? targetCv?.atsScore ?? 0;
  const afterScore = analysis?.projectedAtsScore ?? Math.min(beforeScore + 12, 95);

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Generate optimized CV">
      <ModalHeader
        title={
          phase === 'running'
            ? 'Generating optimized CV…'
            : phase === 'key-missing'
            ? 'Anthropic key required'
            : phase === 'profile-incomplete'
            ? 'Complete your profile'
            : phase === 'error'
            ? 'Generation failed'
            : 'CV ready'
        }
        subtitle={
          phase === 'running'
            ? `Compiling LaTeX for ${targetRole}`
            : result
            ? `${variantName} · ${result.compiler}`
            : ''
        }
        onClose={onClose}
      />
      <ModalBody>
        {phase === 'running' && (
          <div className="ds-shared-loader" aria-live="polite">
            <span className="ds-shared-loader__dot" />
            <span className="ds-shared-loader__dot" />
            <span className="ds-shared-loader__dot" />
          </div>
        )}

        {phase === 'key-missing' && (
          <div className="ats-setup">
            <KeyRound size={28} />
            <div>
              <h3>Add your Anthropic API key</h3>
              <p>
                Generation calls Claude. Open the Copilot overlay (sidebar →
                <strong> Copilot</strong> → <em>Open Copilot →</em>), paste your key
                in Settings, then come back here.
              </p>
            </div>
          </div>
        )}

        {phase === 'profile-incomplete' && (
          <div className="ats-setup">
            <Sparkles size={28} />
            <div>
              <h3>Add your contact details</h3>
              <p>
                The CV header needs at least your name, email, and one of phone /
                LinkedIn. Open <strong>Settings → Account</strong> to fill them in,
                then come back.
              </p>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="ats-error" role="alert">
            <AlertTriangle size={18} />
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{errorMsg}</pre>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="ds-shared-stack">
            <div
              className="ds-shared-info"
              style={{ background: 'var(--green-soft)', color: 'var(--green)' }}
            >
              <Sparkles size={16} />
              <span style={{ color: 'var(--text-1)' }}>
                Compiled with <strong>{result.compiler}</strong> ·{' '}
                <strong>{variantName}</strong>
              </span>
            </div>
            <div className="ds-optimized-scores">
              <div className="ds-optimized-score">
                <div className="ds-optimized-score-label">Before</div>
                <div className="ds-optimized-score-value ds-optimized-score-value--before">
                  {beforeScore}%
                </div>
              </div>
              <ArrowRight size={20} color="var(--text-3)" />
              <div className="ds-optimized-score">
                <div className="ds-optimized-score-label">Projected</div>
                <div className="ds-optimized-score-value ds-optimized-score-value--after">
                  {afterScore}%
                </div>
              </div>
            </div>
            <div className="ds-optimized-paths">
              <div>
                <span className="ds-optimized-path-label">PDF</span>
                <code className="ds-optimized-path">{result.pdfPath}</code>
              </div>
              <div>
                <span className="ds-optimized-path-label">LaTeX</span>
                <code className="ds-optimized-path">{result.texPath}</code>
              </div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Close
        </button>
        {phase === 'done' && result && (
          <>
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={() => {
                openPath(result.pdfPath).catch(() => {
                  toast.error("Couldn't open PDF", 'Try opening it from the path above.');
                });
              }}
            >
              <FileDown size={14} />
              <span style={{ marginLeft: 6 }}>Open PDF</span>
            </button>
            <button
              type="button"
              className="ds-btn ds-btn--primary"
              onClick={() => {
                onCreate(result);
                toast.success('Variant saved', `${variantName} added to CV Manager.`);
                onClose();
              }}
            >
              <FilePlus size={14} />
              <span style={{ marginLeft: 6 }}>Save as variant</span>
            </button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
