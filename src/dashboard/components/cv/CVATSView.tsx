import { useState } from 'react';
import { LineChart } from 'lucide-react';
import AnalyzeMatchModal from '../shared/AnalyzeMatchModal';
import { useToast } from '../../primitives';

export default function CVATSView() {
  const toast = useToast();
  const [jd, setJd] = useState('');
  const [analyzeOpen, setAnalyzeOpen] = useState(false);

  return (
    <section className="cv-ats-analyzer" aria-label="ATS analyzer">
      <h2 className="cv-workspace__title">Paste a job description to analyze ATS match</h2>
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-2)',
          marginTop: 4,
          marginBottom: 16,
        }}
      >
        We'll compare keywords, phrasing and structure against your selected CV.
      </p>
      <textarea
        className="ds-shared-textarea"
        rows={10}
        placeholder="Paste the full job description here…"
        value={jd}
        onChange={(e) => setJd(e.target.value)}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button
          type="button"
          className="cv-workspace__btn cv-workspace__btn--primary"
          disabled={!jd.trim()}
          onClick={() => setAnalyzeOpen(true)}
        >
          <LineChart size={14} strokeWidth={2} />
          <span>Analyze</span>
        </button>
      </div>

      <AnalyzeMatchModal
        open={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        onApply={() => toast.success('Suggestions applied')}
      />
    </section>
  );
}
