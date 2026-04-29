import { useRef, useState } from 'react';
import { Upload, Plus } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';
import RenameModal from '../shared/RenameModal';

export default function CVHeader() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const createCV = useAppStore((s) => s.createCV);
  const setSelectedCv = useAppStore((s) => s.setSelectedCv);
  const setCvTab = useAppStore((s) => s.setCvTab);
  const toast = useToast();

  const [createOpen, setCreateOpen] = useState(false);

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const baseName = f.name.replace(/\.pdf$/i, '').slice(0, 60) || 'Imported CV';
    const cv = createCV({ name: baseName, roleFocus: 'General', atsScore: 80 });
    setSelectedCv(cv.id);
    setCvTab('manager');
    toast.success(`${f.name} imported`);
    if (fileRef.current) fileRef.current.value = '';
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
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} strokeWidth={2} />
          <span>Import CV</span>
        </button>
        <button
          type="button"
          className="cv__btn cv__btn--primary"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} strokeWidth={2.2} />
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
    </header>
  );
}
