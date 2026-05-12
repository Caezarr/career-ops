import { useRef, useState } from 'react';
import { Upload, Plus, Lock } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';
import RenameModal from '../shared/RenameModal';
import UpgradeModal from '../shared/UpgradeModal';
import { usePlanGate } from '../../hooks/usePlanGate';
import { ingestPdfFile } from '../../lib/pdf';

export default function CVHeader() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const createCV = useAppStore((s) => s.createCV);
  const setSelectedCv = useAppStore((s) => s.setSelectedCv);
  const setCvTab = useAppStore((s) => s.setCvTab);
  const toast = useToast();
  const gate = usePlanGate();

  const [createOpen, setCreateOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (fileRef.current) fileRef.current.value = '';

    setImporting(true);
    try {
      const { parsedText, baseName, roleFocus } = await ingestPdfFile(f);
      const cv = createCV({
        name: baseName,
        roleFocus,
        atsScore: 0,
        parsedText,
      });
      setSelectedCv(cv.id);
      setCvTab('manager');
      const wordCount = parsedText.split(/\s+/).filter(Boolean).length;
      toast.success(
        `${f.name} imported`,
        `Parsed ${wordCount} words · detected role focus: ${roleFocus}`,
      );
    } catch (err) {
      toast.error(
        'Could not parse PDF',
        typeof err === 'string' ? err : (err as Error).message ?? 'Unknown error',
      );
    } finally {
      setImporting(false);
    }
  }

  function createVariant(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cv = createCV({ name: trimmed, roleFocus: 'General', atsScore: 75 });
    setSelectedCv(cv.id);
    setCvTab('manager');
    toast.success(`Variant '${trimmed}' created`);
    setCreateOpen(false);
  }

  return (
    <header className="cv__header">
      <div className="cv__header-text">
        <h1 className="cv__title">Build a stronger CV</h1>
        <p className="cv__subtitle">
          Manage variants, optimize for ATS, and tailor your resume to each role.
        </p>
      </div>
      <div className="cv__header-actions">
        <button
          type="button"
          className="cv__btn cv__btn--ghost"
          onClick={() => {
            if (!gate.canCreateCv) {
              setUpgradeOpen(true);
              return;
            }
            fileRef.current?.click();
          }}
          disabled={importing}
          title={!gate.canCreateCv ? gate.reason.cv : undefined}
        >
          {gate.canCreateCv ? (
            <Upload size={16} strokeWidth={2} />
          ) : (
            <Lock size={14} strokeWidth={2} />
          )}
          <span>{importing ? 'Parsing PDF…' : 'Import CV'}</span>
        </button>
        <button
          type="button"
          className="cv__btn cv__btn--primary"
          onClick={() => {
            if (!gate.canCreateCv) {
              setUpgradeOpen(true);
              return;
            }
            setCreateOpen(true);
          }}
          title={!gate.canCreateCv ? gate.reason.cv : undefined}
        >
          {gate.canCreateCv ? (
            <Plus size={16} strokeWidth={2.2} />
          ) : (
            <Lock size={14} strokeWidth={2} />
          )}
          <span>Create variant</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChosen}
        />
      </div>

      <RenameModal
        open={createOpen}
        title="Create new variant"
        label="Variant name"
        initialName=""
        onSave={createVariant}
        onClose={() => setCreateOpen(false)}
      />
      {upgradeOpen && (
        <UpgradeModal
          feature="cv"
          reason={gate.reason.cv}
          onClose={() => setUpgradeOpen(false)}
        />
      )}
    </header>
  );
}
