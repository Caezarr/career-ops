import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 15;
import JobListItem from './JobListItem';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../primitives';
import { useAppStore } from '../../store';
import type { Job, JobSort } from '../../store';
import { ApplyModal } from '../shared';

const SORT_OPTIONS: { value: JobSort; label: string }[] = [
  { value: 'match', label: 'Best match' },
  { value: 'recent', label: 'Most recent' },
  { value: 'salary', label: 'Highest salary' },
];

const SORT_LABEL: Record<JobSort, string> = {
  match: 'Best match',
  recent: 'Most recent',
  salary: 'Highest salary',
};

function postedAgoToMinutes(s: string): number {
  // Parse "Just now", "2h ago", "1d ago" → minutes since posting (lower = newer)
  if (/just now/i.test(s)) return 0;
  const m = /(\d+)\s*([hdmw])/i.exec(s);
  if (!m) return 9999;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  return unit === 'm'
    ? n
    : unit === 'h'
    ? n * 60
    : unit === 'd'
    ? n * 1440
    : unit === 'w'
    ? n * 10080
    : n;
}

export default function JobList() {
  const jobs = useAppStore((s) => s.jobs);
  const search = useAppStore((s) => s.jobsSearchQuery);
  const filters = useAppStore((s) => s.jobsFilters);
  const sort = useAppStore((s) => s.jobsSort);
  const setSort = useAppStore((s) => s.setJobsSort);
  const selectedId = useAppStore((s) => s.selectedJobId);
  const setSelected = useAppStore((s) => s.setSelectedJob);

  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs
      .filter((j) => {
        if (q) {
          const hay = `${j.role} ${j.company} ${j.location}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (filters.location !== 'Any' && filters.location !== j.location) {
          // loose match — require contains.
          if (!j.location.toLowerCase().includes(filters.location.toLowerCase()))
            return false;
        }
        if (filters.remote !== 'Any' && j.workMode) {
          const wm = j.workMode.toLowerCase();
          if (filters.remote === 'On-site' && !wm.includes('on-site')) return false;
          if (filters.remote === 'Remote' && !wm.includes('remote')) return false;
          if (filters.remote === 'Hybrid' && !wm.includes('hybrid')) return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => {
        if (sort === 'match') return b.match - a.match;
        if (sort === 'salary') return b.salaryMax - a.salaryMax;
        if (sort === 'recent')
          return postedAgoToMinutes(a.postedAgo) - postedAgoToMinutes(b.postedAgo);
        return 0;
      });
  }, [jobs, search, filters, sort]);

  // Pagination — 15 per page. Reset to first page whenever the
  // visible result set changes (search/filters/sort/new ingest).
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    setPage(0);
  }, [search, filters, sort, filtered.length]);

  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const paginated = filtered.slice(pageStart, pageEnd);

  // If the user has a job selected that isn't in the current page,
  // the JobDetail still works (it reads from the global jobs slice
  // by id) so we don't need to clamp selection.

  return (
    <section className="job-list" aria-label="Job results">
      <header className="job-list__header">
        <span className="job-list__count">
          {filtered.length === 0
            ? '0 matches'
            : `${pageStart + 1}–${pageEnd} of ${filtered.length} match${filtered.length === 1 ? '' : 'es'}`}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="job-list__sort">
              <span>Sorted by {SORT_LABEL[sort].toLowerCase()}</span>
              <ChevronDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => setSort(opt.value)}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="job-list__items">
        {filtered.length === 0 ? (
          <div className="ds-empty">
            <span>No matching jobs — try adjusting your filters.</span>
          </div>
        ) : (
          paginated.map((job) => (
            <JobListItem
              key={job.id}
              job={job}
              selected={job.id === selectedId}
              onSelect={() => setSelected(job.id)}
              onApply={() => setApplyJob(job)}
            />
          ))
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="job-list__pagination">
          <button
            type="button"
            className="job-list__page-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <span className="job-list__page-indicator">
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="job-list__page-btn"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            aria-label="Next page"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <ApplyModal
        open={!!applyJob}
        onClose={() => setApplyJob(null)}
        job={applyJob}
      />
    </section>
  );
}
