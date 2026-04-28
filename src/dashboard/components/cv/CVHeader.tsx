import { Upload, Plus } from 'lucide-react';

export default function CVHeader() {
  return (
    <header className="cv__header">
      <div className="cv__header-text">
        <h1 className="cv__title">Build a stronger CV</h1>
        <p className="cv__subtitle">
          Manage variants, optimize for ATS, and tailor your resume to each role.
        </p>
      </div>
      <div className="cv__header-actions">
        <button type="button" className="cv__btn cv__btn--ghost">
          <Upload size={16} strokeWidth={2} />
          <span>Import CV</span>
        </button>
        <button type="button" className="cv__btn cv__btn--primary">
          <Plus size={16} strokeWidth={2.2} />
          <span>Create variant</span>
        </button>
      </div>
    </header>
  );
}
