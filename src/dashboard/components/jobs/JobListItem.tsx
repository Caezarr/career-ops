import { BadgeCheck, Bookmark } from 'lucide-react';
import clsx from 'clsx';
import CompanyAvatar from '../CompanyAvatar';
import MatchPill from './MatchPill';
import { useToast } from '../../primitives';
import { toggleBookmarkWithPersist } from '../../lib/ingest';
import type { Job } from '../../store';

interface JobListItemProps {
  job: Job;
  selected?: boolean;
  onSelect: () => void;
  onApply: () => void;
}

function formatSalary(j: Job): string {
  if (!j.salaryMin) return '—';
  const c = j.salaryCurrency;
  const min = `${c}${Math.round(j.salaryMin / 1000)}k`;
  if (!j.salaryMax || j.salaryMax === j.salaryMin) return min;
  return `${min} - ${c}${Math.round(j.salaryMax / 1000)}k`;
}

export default function JobListItem({
  job,
  selected,
  onSelect,
  onApply,
}: JobListItemProps) {
  const toast = useToast();

  function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    void toggleBookmarkWithPersist(job.id);
    toast.success(
      job.bookmarked ? 'Removed from saved jobs' : 'Saved to bookmarks',
    );
  }

  function handleApply(e: React.MouseEvent) {
    e.stopPropagation();
    onApply();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      className={`job-row${selected ? ' job-row--selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <CompanyAvatar company={job.company} size={36} logoUrl={job.companyLogoUrl} />

      <div className="job-row__main">
        <div className="job-row__role">
          <span className="job-row__role-text">{job.role}</span>
          {job.verified && (
            <BadgeCheck
              size={14}
              className="job-row__verified"
              aria-label="Verified"
            />
          )}
        </div>
        <div className="job-row__meta">
          {job.company} · {job.location}
        </div>
      </div>

      <span className="job-row__salary">{formatSalary(job)}</span>
      <MatchPill match={job.match} />
      <span className="job-row__posted">{job.postedAgo}</span>

      <button type="button" className="job-row__apply" onClick={handleApply}>
        Apply
      </button>

      <button
        type="button"
        className="job-row__bookmark"
        aria-label={job.bookmarked ? 'Remove bookmark' : 'Save job'}
        aria-pressed={job.bookmarked}
        onClick={handleBookmark}
      >
        <Bookmark
          size={18}
          className={clsx(job.bookmarked && 'job-row__bookmark-icon--active')}
          fill={job.bookmarked ? 'currentColor' : 'none'}
        />
      </button>
    </div>
  );
}
