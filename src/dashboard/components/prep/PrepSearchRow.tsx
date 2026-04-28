import { Search, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function PrepSearchRow() {
  return (
    <div className="prep-search-row">
      <div className="prep-search">
        <Search size={16} strokeWidth={2} className="prep-search__icon" />
        <input
          type="text"
          className="prep-search__input"
          placeholder="Prepare for Goldman Sachs, VP IBD role"
          aria-label="Prepare search"
        />
      </div>

      <button type="button" className="prep-track-dropdown" aria-label="Interview track">
        <div className="prep-track-dropdown__col">
          <span className="prep-track-dropdown__label">Interview track</span>
          <span className="prep-track-dropdown__value">Behavioral + Technical</span>
        </div>
        <ChevronDown size={16} strokeWidth={2} className="prep-track-dropdown__chevron" />
      </button>

      <span className="prep-session-pill">
        <CheckCircle2 size={16} strokeWidth={2} />
        <span>Session-ready</span>
      </span>
    </div>
  );
}
