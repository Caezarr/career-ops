import { useState } from 'react';
import { Target, ChevronDown, LineChart, Sparkles } from 'lucide-react';
import KeywordMatchSection from './KeywordMatchSection';
import MissingKeywords from './MissingKeywords';
import SuggestedEdits from './SuggestedEdits';
import DiffSection from './DiffSection';
import { mockTailoring } from '../../data/cv';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '../../primitives';
import { useAppStore } from '../../store';
import AnalyzeMatchModal from '../shared/AnalyzeMatchModal';
import GenerateOptimizedModal from '../shared/GenerateOptimizedModal';

const TARGET_ROLES = [
  'Strategy Associate · Bain & Company',
  'Senior Product Manager · Stripe',
  'VP IBD · Goldman Sachs',
  'AI Product Lead · Mistral AI',
  'Strategy & Ops · Stripe',
];

export default function TailoringWorkspace() {
  const toast = useToast();
  const cvs = useAppStore((s) => s.cvs);
  const tailoringTarget = useAppStore((s) => s.tailoringTarget);
  const setTailoringTarget = useAppStore((s) => s.setTailoringTarget);
  const createCV = useAppStore((s) => s.createCV);
  const setSelectedCv = useAppStore((s) => s.setSelectedCv);

  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const baseCv = cvs.find((c) => c.id === tailoringTarget.baseCvId) ?? cvs[0];

  return (
    <section className="cv-workspace" aria-label="Tailoring workspace">
      <h2 className="cv-workspace__title">Tailoring workspace</h2>

      <div className="cv-workspace__top">
        <div className="cv-workspace__field">
          <label className="cv-workspace__label">Target role</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="cv-workspace__dropdown cv-workspace__dropdown--wide"
              >
                <span className="cv-workspace__dropdown-left">
                  <Target size={14} strokeWidth={2.2} className="cv-workspace__dropdown-icon" />
                  <span className="cv-workspace__dropdown-text">{tailoringTarget.role}</span>
                </span>
                <ChevronDown size={16} className="cv-workspace__dropdown-chevron" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {TARGET_ROLES.map((role) => (
                <DropdownMenuItem
                  key={role}
                  onSelect={() => setTailoringTarget({ role })}
                >
                  {role}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="cv-workspace__field">
          <label className="cv-workspace__label">Base CV</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cv-workspace__dropdown">
                <span className="cv-workspace__dropdown-left">
                  <span className="cv-pdf-badge cv-pdf-badge--mini" aria-hidden="true">PDF</span>
                  <span className="cv-workspace__dropdown-text">
                    {baseCv?.name ?? 'Choose CV'}
                  </span>
                </span>
                <ChevronDown size={16} className="cv-workspace__dropdown-chevron" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {cvs.map((cv) => (
                <DropdownMenuItem
                  key={cv.id}
                  onSelect={() => setTailoringTarget({ baseCvId: cv.id })}
                >
                  {cv.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="cv-workspace__actions">
          <button
            type="button"
            className="cv-workspace__btn cv-workspace__btn--ghost"
            onClick={() => setAnalyzeOpen(true)}
          >
            <LineChart size={14} strokeWidth={2} />
            <span>Analyze match</span>
          </button>
          <button
            type="button"
            className="cv-workspace__btn cv-workspace__btn--primary"
            onClick={() => setGenerateOpen(true)}
          >
            <Sparkles size={14} strokeWidth={2.2} />
            <span>Generate optimized CV</span>
          </button>
        </div>
      </div>

      <div className="cv-workspace__analysis">
        <KeywordMatchSection
          before={mockTailoring.beforeMatch}
          after={mockTailoring.afterMatch}
        />
        <MissingKeywords keywords={mockTailoring.missingKeywords} />
        <SuggestedEdits edits={mockTailoring.suggestedEdits} />
      </div>

      <DiffSection
        removeReduce={mockTailoring.removeReduce}
        addStrengthen={mockTailoring.addStrengthen}
      />

      <AnalyzeMatchModal
        open={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        onApply={() => toast.success('Suggestions applied')}
      />

      <GenerateOptimizedModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        targetRole={tailoringTarget.role}
        onCreate={() => {
          const cv = createCV({
            name: `Optimized for ${tailoringTarget.role}`,
            roleFocus: tailoringTarget.role,
            atsScore: 89,
          });
          setSelectedCv(cv.id);
          toast.success('Optimized CV created');
        }}
      />
    </section>
  );
}
