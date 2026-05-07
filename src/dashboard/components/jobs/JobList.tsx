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

/** Decide whether a job's [min, max] salary range overlaps a filter
 *  bucket label. The labels we ship are "€60k - €80k", "€80k - €120k",
 *  "€120k - €160k", "€160k+", and "Any". When a job has no salary
 *  data (both 0) we EXCLUDE it from any bucket selection — the user
 *  asked for a salary band, hiding "salary unknown" entries is the
 *  better default. Currency mismatches are tolerated (we only compare
 *  numeric magnitudes; the curated buckets are euro-denominated but
 *  we treat $/€ as roughly equivalent for filtering purposes). */
function matchesSalaryBucket(min: number, max: number, bucket: string): boolean {
  if (!min && !max) return false;
  const hi = max || min;
  const lo = min || max;

  // Parse "€60k - €80k" → [60000, 80000]; "€160k+" → [160000, Infinity].
  const plus = /(\d+)\s*k\+/.exec(bucket);
  if (plus) {
    const floor = Number(plus[1]) * 1000;
    return hi >= floor;
  }
  const range = bucket.matchAll(/(\d+)\s*k/gi);
  const nums = Array.from(range).map((m) => Number(m[1]) * 1000);
  if (nums.length < 2) return false;
  const [lowB, highB] = nums;
  // Overlap test: [lo, hi] ∩ [lowB, highB] ≠ ∅
  return lo <= highB && hi >= lowB;
}

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
    // Strict tag-style matching: each whitespace-separated token must
    // be a PREFIX OF A WHOLE WORD in role + company + location. We do
    // NOT search the JD body — that produces too many false positives
    // (a Customer Success role mentioning "we use AI" should not match
    // "AI Engineer"). "ai" → matches "AI" but not "Maintenance".
    // "engineer" → matches both "Engineer" and "Engineering" (prefix).
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    return jobs
      .filter((j) => {
        if (tokens.length > 0) {
          // Sprint 5 (audit Performance P0 #1): tokens are
          // pre-computed once at ingest time on `_searchTokens`
          // (covers role + company + location + derived tags).
          // Falling back to a fresh tokenise covers any in-memory
          // job that pre-dates the migration (legacy seed jobs).
          const words: string[] =
            j._searchTokens ??
            [
              j.role,
              j.company,
              j.location,
              j.seniority ?? '',
              j.sector ?? '',
              j.companyStage ?? '',
              j.companyBatch ?? '',
            ]
              .join(' ')
              .toLowerCase()
              .split(/[^a-z0-9]+/)
              .filter(Boolean);
          for (const t of tokens) {
            if (!words.some((w) => w.startsWith(t))) return false;
          }
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
        if (filters.seniority !== 'Any') {
          if ((j.seniority ?? '') !== filters.seniority) return false;
        }
        if (filters.sector !== 'Any') {
          if ((j.sector ?? '') !== filters.sector) return false;
        }
        if (filters.stage !== 'Any') {
          if ((j.companyStage ?? '') !== filters.stage) return false;
        }
        if (filters.salary !== 'Any') {
          // Filter format: "€80k - €120k", "€160k+", or "Any".
          // We compare the job's max (or min if max is missing) to
          // the bucket boundaries — anything overlapping the bucket
          // counts as a match.
          if (!matchesSalaryBucket(j.salaryMin, j.salaryMax, filters.salary))
            return false;
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
