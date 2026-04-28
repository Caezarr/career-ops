import { RotateCcw, Bookmark, ArrowRight } from 'lucide-react';

export default function MockActions() {
  return (
    <div className="prep-mock-actions">
      <button type="button" className="prep-mock-actions__btn prep-mock-actions__btn--ghost">
        <RotateCcw size={15} strokeWidth={2} />
        <span>Retry answer</span>
      </button>
      <button type="button" className="prep-mock-actions__btn prep-mock-actions__btn--ghost">
        <Bookmark size={15} strokeWidth={2} />
        <span>Save feedback</span>
      </button>
      <button type="button" className="prep-mock-actions__btn prep-mock-actions__btn--primary">
        <span>Continue</span>
        <ArrowRight size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
