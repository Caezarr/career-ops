import { ChevronDown } from 'lucide-react';
import JobListItem from './JobListItem';
import { mockJobs } from '../../data/jobs';

export default function JobList() {
  return (
    <section className="job-list" aria-label="Job results">
      <header className="job-list__header">
        <span className="job-list__count">152 matches found</span>
        <button type="button" className="job-list__sort">
          <span>Sorted by best match</span>
          <ChevronDown size={14} />
        </button>
      </header>

      <div className="job-list__items">
        {mockJobs.map((job, idx) => (
          <JobListItem key={job.id} job={job} selected={idx === 0} />
        ))}
      </div>
    </section>
  );
}
