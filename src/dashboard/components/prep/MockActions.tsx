import { RotateCcw, Bookmark, ArrowRight } from 'lucide-react';

interface MockActionsProps {
  onRetry?: () => void;
  onSave?: () => void;
  onContinue?: () => void;
}

export default function MockActions({ onRetry, onSave, onContinue }: MockActionsProps) {
  return (
    <div className="prep-mock-actions">
      <button
        type="button"
        className="prep-mock-actions__btn prep-mock-actions__btn--ghost"
        onClick={onRetry}
      >
        <RotateCcw size={15} strokeWidth={2} />
        <span>Retry answer</span>
      </button>
      <button
        type="button"
        className="prep-mock-actions__btn prep-mock-actions__btn--ghost"
        onClick={onSave}
      >
        <Bookmark size={15} strokeWidth={2} />
        <span>Save feedback</span>
      </button>
      <button
        type="button"
        className="prep-mock-actions__btn prep-mock-actions__btn--primary"
        onClick={onContinue}
      >
        <span>Continue</span>
        <ArrowRight size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
