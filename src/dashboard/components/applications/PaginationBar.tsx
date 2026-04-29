import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../primitives';
import { useAppStore } from '../../store';

interface PaginationBarProps {
  total: number;
  startIdx: number;
  endIdx: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function PaginationBar({
  total,
  startIdx,
  endIdx,
  page,
  totalPages,
  onPageChange,
}: PaginationBarProps) {
  const pageSize = useAppStore((s) => s.applicationsPageSize);
  const setPageSize = useAppStore((s) => s.setApplicationsPageSize);

  // Build page numbers — keep it concise (max 5 page buttons).
  const pagesToShow: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pagesToShow.push(i);

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="applications__pagination">
      <div className="applications__pagination-controls">
        <button
          type="button"
          className="applications__page-nav"
          aria-label="Previous page"
          disabled={prevDisabled}
          onClick={() => onPageChange(page - 1)}
          style={prevDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        >
          <ChevronLeft size={14} strokeWidth={2.2} />
        </button>
        {pagesToShow.map((p) => (
          <button
            key={p}
            type="button"
            className={`applications__page-num${
              p === page ? ' applications__page-num--active' : ''
            }`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="applications__page-nav"
          aria-label="Next page"
          disabled={nextDisabled}
          onClick={() => onPageChange(page + 1)}
          style={nextDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        >
          <ChevronRight size={14} strokeWidth={2.2} />
        </button>
      </div>

      <span className="applications__pagination-range">
        {total === 0 ? '0 of 0' : `${startIdx + 1}-${endIdx} of ${total}`}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="applications__dropdown applications__dropdown--narrow"
          >
            <span>{pageSize} / page</span>
            <ChevronDown size={16} className="applications__dropdown-icon" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt}
              onSelect={() => {
                setPageSize(opt);
                onPageChange(1);
              }}
            >
              {opt} / page
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
