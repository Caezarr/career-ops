import { SlidersHorizontal } from 'lucide-react';
import FilterChip from './FilterChip';
import { mockFilters } from '../../data/jobs';

export default function FilterRow() {
  return (
    <div className="filter-row">
      {mockFilters.map((f) => (
        <FilterChip key={f.label} label={f.label} value={f.value} />
      ))}
      <button type="button" className="filter-chip filter-chip--more">
        <SlidersHorizontal size={16} className="filter-chip__more-icon" />
        <span className="filter-chip__more-label">More filters</span>
      </button>
    </div>
  );
}
