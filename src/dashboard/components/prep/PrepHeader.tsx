import { Upload, Video } from 'lucide-react';

export default function PrepHeader() {
  return (
    <div className="prep-header">
      <div className="prep-header__text">
        <h1 className="prep-header__title">Prepare sharper. Perform better.</h1>
        <p className="prep-header__subtitle">
          Practice questions, run mock interviews, and improve answer quality with AI feedback.
        </p>
      </div>
      <div className="prep-header__actions">
        <button type="button" className="prep-btn prep-btn--ghost">
          <Upload size={16} strokeWidth={2} />
          <span>Import job brief</span>
        </button>
        <button type="button" className="prep-btn prep-btn--primary">
          <Video size={16} strokeWidth={2} />
          <span>Start mock interview</span>
        </button>
      </div>
    </div>
  );
}
