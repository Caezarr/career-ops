import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export default function PaginationBar() {
  return (
    <div className="applications__pagination">
      <div className="applications__pagination-controls">
        <button
          type="button"
          className="applications__page-nav"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className="applications__page-num applications__page-num--active"
          aria-current="page"
        >
          1
        </button>
        <button type="button" className="applications__page-num">
          2
        </button>
        <button
          type="button"
          className="applications__page-nav"
          aria-label="Next page"
        >
          <ChevronRight size={14} strokeWidth={2.2} />
        </button>
      </div>

      <span className="applications__pagination-range">1-7 of 28</span>

      <button type="button" className="applications__dropdown applications__dropdown--narrow">
        <span>10 / page</span>
        <ChevronDown size={16} className="applications__dropdown-icon" />
      </button>
    </div>
  );
}
