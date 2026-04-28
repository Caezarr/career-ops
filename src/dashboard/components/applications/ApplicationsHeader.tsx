import { Upload, Plus } from 'lucide-react';

export default function ApplicationsHeader() {
  return (
    <header className="applications__header">
      <div className="applications__header-text">
        <h1 className="applications__title">Track every application clearly</h1>
        <p className="applications__subtitle">
          Monitor stage, follow-ups, documents, and AI next steps across your pipeline.
        </p>
      </div>
      <div className="applications__header-actions">
        <button type="button" className="applications__btn applications__btn--ghost">
          <Upload size={16} strokeWidth={2} />
          <span>Export</span>
        </button>
        <button type="button" className="applications__btn applications__btn--primary">
          <Plus size={16} strokeWidth={2.2} />
          <span>New application</span>
        </button>
      </div>
    </header>
  );
}
