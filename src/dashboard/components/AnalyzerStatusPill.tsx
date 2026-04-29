import { Sparkles } from 'lucide-react';
import { useAppStore } from '../store';
import { useNavigation } from '../navigation';

/** Tiny global indicator that shows N/M progress while the multi-CV ATS
 *  analyzer is running. Visible on every page so the user knows the
 *  background run is still going after they navigate away. Click → jump
 *  to the CV → ATS Analyzer tab. */
export default function AnalyzerStatusPill() {
  const { navigate } = useNavigation();
  const running = useAppStore((s) => s.analyzerRunning);
  const progress = useAppStore((s) => s.analyzerProgress);
  const setCvTab = useAppStore((s) => s.setCvTab);

  if (!running) return null;

  const entries = Object.values(progress);
  const total = entries.length;
  const done = entries.filter(
    (e) => e.status === 'done' || e.status === 'error' || e.status === 'skipped-cached',
  ).length;
  const currentlyRunning = entries.find((e) => e.status === 'running');

  return (
    <button
      type="button"
      className="analyzer-pill"
      onClick={() => {
        navigate('cv');
        setCvTab('ats');
      }}
      title="Jump to ATS Analyzer"
      aria-label={`ATS analyzer running: ${done} of ${total}`}
    >
      <span className="analyzer-pill__dot" aria-hidden="true" />
      <Sparkles size={13} strokeWidth={2.2} />
      <span className="analyzer-pill__label">
        Analyzing CVs · {done}/{total}
        {currentlyRunning ? ' · running' : ''}
      </span>
    </button>
  );
}
