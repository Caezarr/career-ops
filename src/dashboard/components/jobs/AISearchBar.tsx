import { Sparkles, ArrowRight } from 'lucide-react';

export default function AISearchBar() {
  return (
    <div className="ai-search">
      <Sparkles size={18} className="ai-search__icon" />
      <input
        type="text"
        className="ai-search__input"
        placeholder="Senior PM roles in Paris, Series B+, 80k–120k, fintech or health"
        aria-label="Describe the roles you want"
      />
      <button type="button" className="ai-search__btn">
        <span>Search</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
