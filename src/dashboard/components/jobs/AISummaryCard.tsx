import { useState } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '../../primitives';
import { useAppStore } from '../../store';

interface AISummaryCardProps {
  summary: string;
  whyYouMatch?: string[];
  matchScore?: number;
}

export default function AISummaryCard({ summary, whyYouMatch, matchScore }: AISummaryCardProps) {
  const [open, setOpen] = useState(false);
  const cvs = useAppStore((s) => s.cvs);
  const defaultCv = cvs.find((c) => c.isDefault) ?? cvs[0];

  const reasons = whyYouMatch ?? [
    'Strong overlap between your past roles and this job\'s seniority',
    'Industry vocabulary match across CV and JD',
    'Geography compatible with your stated preferences',
  ];

  return (
    <>
      <section className="ai-summary">
        <header className="ai-summary__header">
          <Sparkles size={14} className="ai-summary__icon" />
          <span className="ai-summary__title">AI summary</span>
          <span className="ai-summary__beta">Beta</span>
        </header>
        <p className="ai-summary__body">{summary}</p>
        <button
          type="button"
          className="ai-summary__link"
          onClick={() => setOpen(true)}
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}
        >
          See how we matched you →
        </button>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} size="md" ariaLabel="Match breakdown">
        <ModalHeader title="How we matched you" subtitle="Reasoning behind the AI score." onClose={() => setOpen(false)} />
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: 'var(--green)' }}>
                {matchScore ?? 92}%
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                match · using {defaultCv?.name ?? 'your default CV'}
              </span>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                Why you match
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
                {reasons.map((r, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--text-1)', lineHeight: 1.5 }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
              Match scores combine CV keyword coverage, your stated targets, the role's seniority,
              and industry vocabulary. Improve your score by tailoring your CV to this role.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setOpen(false)}>
            Close
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
