import { useRef, useState } from 'react';
import { Upload, Video, Target, X } from 'lucide-react';
import { useAppStore, type PrepQuestion, type QuestionTrack } from '../../store';
import { useToast } from '../../primitives';
import PracticeModal from '../shared/PracticeModal';
import { useFocusedJob } from '../../hooks/useAdaptivePrepTrack';
import { getTrack } from '../../data/prep';

const SOURCE_LABEL: Record<'workspace' | 'selected' | 'application', string> = {
  workspace: 'War Room focus',
  selected: 'Selected job',
  application: 'Most-recent application',
};

export default function PrepHeader() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const prepQuestions = useAppStore((s) => s.prepQuestions);
  const filter = useAppStore((s) => s.prepCategoryFilter);
  const setActiveTrack = useAppStore((s) => s.setPrepActiveTrack);
  const activeTrack = useAppStore((s) => s.prepActiveTrack);

  const { focusedJob, source, inferredTrack } = useFocusedJob();
  // Show the "Tailored for" hint only when the user is currently
  // viewing the inferred track — if they manually clicked away from
  // it, the chip would be misleading.
  const trackMeta =
    inferredTrack && activeTrack === inferredTrack
      ? getTrack(inferredTrack as QuestionTrack)
      : null;

  const [practiceTarget, setPracticeTarget] = useState<PrepQuestion | null>(null);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    toast.success(`${f.name} imported`, 'Job brief saved — questions will adapt.');
    if (fileRef.current) fileRef.current.value = '';
  }

  function startMockInterview() {
    const cat = filter === 'All' ? 'Behavioral' : filter;
    const pool = prepQuestions.filter((q) => q.category === cat);
    const pick = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : prepQuestions[0];
    if (!pick) {
      toast.info('No questions yet', 'Add some questions to start a mock interview.');
      return;
    }
    setPracticeTarget(pick);
  }

  return (
    <div className="prep-header">
      <div className="prep-header__text">
        <h1 className="prep-header__title">Prepare sharper. Perform better.</h1>
        <p className="prep-header__subtitle">
          Practice questions, run mock interviews, and improve answer quality with AI feedback.
        </p>
        {focusedJob && trackMeta && (
          <div className="prep-header__tailored" role="status">
            <Target size={12} strokeWidth={2.4} />
            <span>
              Tailored for{' '}
              <strong>
                {focusedJob.company} · {focusedJob.role}
              </strong>
              {' '}— surfacing <strong>{trackMeta.label}</strong> questions
              {source && (
                <span className="prep-header__tailored-source">
                  {' '}({SOURCE_LABEL[source]})
                </span>
              )}
            </span>
            <button
              type="button"
              className="prep-header__tailored-clear"
              onClick={() => setActiveTrack(null)}
              title="Show all tracks instead"
            >
              <X size={12} strokeWidth={2.4} />
              <span>All tracks</span>
            </button>
          </div>
        )}
      </div>
      <div className="prep-header__actions">
        <button
          type="button"
          className="prep-btn prep-btn--ghost"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} strokeWidth={2} />
          <span>Import job brief</span>
        </button>
        <button
          type="button"
          className="prep-btn prep-btn--primary"
          onClick={startMockInterview}
        >
          <Video size={16} strokeWidth={2} />
          <span>Start mock interview</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,.docx,application/pdf,text/plain"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>

      <PracticeModal
        open={!!practiceTarget}
        question={practiceTarget}
        onClose={() => setPracticeTarget(null)}
      />
    </div>
  );
}
