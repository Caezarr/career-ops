import { BadgeCheck, Bookmark } from 'lucide-react';
import CompanyAvatar from '../CompanyAvatar';
import MatchPill from './MatchPill';
import type { Job } from '../../data/jobs';

interface JobListItemProps {
  job: Job;
  selected?: boolean;
}

export default function JobListItem({ job, selected }: JobListItemProps) {
  return (
    <div
      className={`job-row${selected ? ' job-row--selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >
      <CompanyAvatar company={job.company} size={36} />

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

      <span className="job-row__salary">{job.salary}</span>
      <MatchPill match={job.match} />
      <span className="job-row__posted">{job.postedAgo}</span>

      <button type="button" className="job-row__apply">
        Apply
      </button>

      <button
        type="button"
        className="job-row__bookmark"
        aria-label="Save job"
      >
        <Bookmark size={18} />
      </button>
    </div>
  );
}
