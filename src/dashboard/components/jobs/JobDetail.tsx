import { useState } from 'react';
import {
  X,
  BadgeCheck,
  Star,
  MapPin,
  Euro,
  Briefcase,
  Calendar,
  Bookmark,
  ArrowRight,
  Target,
} from 'lucide-react';
import CompanyAvatar from '../CompanyAvatar';
import InfoTag from './InfoTag';
import StatPill from './StatPill';
import WhyYouMatchCard from './WhyYouMatchCard';
import AISummaryCard from './AISummaryCard';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';
import { useNavigation } from '../../navigation';
import { ApplyModal, CompanyModal } from '../shared';

function formatSalary(min: number, max: number, c: string): string {
  if (!min) return '—';
  const a = `${c}${Math.round(min / 1000)}k`;
  if (!max || max === min) return `${a} OTE`;
  return `${a} - ${c}${Math.round(max / 1000)}k OTE`;
}

export default function JobDetail() {
  const toast = useToast();
  const { navigate } = useNavigation();
  const selectedJob = useAppStore((s) => {
    const id = s.selectedJobId;
    return id ? s.jobs.find((j) => j.id === id) ?? null : null;
  });
  const setSelected = useAppStore((s) => s.setSelectedJob);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const setWorkspaceJobId = useAppStore((s) => s.setWorkspaceJobId);

  const [applyOpen, setApplyOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  /** Open the Job War Room with this job pre-loaded. The workspace
   *  reads `workspaceJobId` from the slice so we set it before
   *  navigating — no URL params, no router context to plumb. */
  function openWarRoom() {
    if (!selectedJob) return;
    setWorkspaceJobId(selectedJob.id);
    navigate('workspace');
  }

  if (!selectedJob) {
    return (
      <aside className="job-detail" aria-label="No job selected">
        <div className="ds-empty" style={{ padding: 48 }}>
          <span>Select a job to see details.</span>
        </div>
      </aside>
    );
  }

  const job = selectedJob;

  function handleSave() {
    toggleBookmark(job.id);
    toast.success(
      job.bookmarked ? 'Removed from saved jobs' : 'Saved to bookmarks',
    );
  }

  return (
    <aside className="job-detail" aria-label={`${job.role} at ${job.company}`}>
      <div className="job-detail__topbar">
        <button
          type="button"
          className="job-detail__close"
          aria-label="Close details"
          onClick={() => setSelected(null)}
        >
          <X size={20} />
        </button>
      </div>

      <div className="job-detail__company">
        <CompanyAvatar company={job.company} size={44} />
        <div className="job-detail__company-text">
          <div className="job-detail__role">
            <span>{job.role}</span>
            {job.verified && (
              <BadgeCheck size={16} className="job-detail__verified" />
            )}
          </div>
          <div className="job-detail__company-meta">
            <span className="job-detail__company-name">{job.company}</span>
            {job.rating != null && (
              <>
                <span className="job-detail__dot">·</span>
                <Star
                  size={13}
                  className="job-detail__star"
                  fill="#f59e0b"
                  strokeWidth={0}
                />
                <span className="job-detail__rating">{job.rating}</span>
                {job.reviews != null && (
                  <span className="job-detail__reviews">({job.reviews})</span>
                )}
              </>
            )}
            <span className="job-detail__dot">·</span>
            <button
              type="button"
              className="job-detail__link"
              onClick={() => setCompanyOpen(true)}
            >
              View company
            </button>
          </div>
        </div>
      </div>

      <div className="job-detail__tags">
        <InfoTag icon={MapPin}>{job.location}</InfoTag>
        <InfoTag icon={Euro}>
          {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
        </InfoTag>
        {job.type && <InfoTag icon={Briefcase}>{job.type}</InfoTag>}
        {job.workMode && <InfoTag icon={Calendar}>{job.workMode}</InfoTag>}
      </div>

      {job.stats && job.stats.length > 0 && (
        <div className="job-detail__stats">
          {job.stats.map((label, i) => (
            <StatPill
              key={label}
              variant={i === 0 ? 'neutral' : i === 1 ? 'indigo' : 'purple'}
            >
              {label}
            </StatPill>
          ))}
        </div>
      )}

      {job.about && job.about.length > 0 && (
        <section className="job-detail__about">
          <h3 className="job-detail__section-title">About {job.company}</h3>
          {job.about.map((p, i) => (
            <p key={i} className="job-detail__about-text">
              {p}
            </p>
          ))}
        </section>
      )}

      {job.whyYouMatch && job.whyYouMatch.length > 0 && (
        <WhyYouMatchCard items={job.whyYouMatch} />
      )}

      {job.aiSummary && (
        <AISummaryCard
          summary={job.aiSummary}
          whyYouMatch={job.whyYouMatch}
          matchScore={job.match}
        />
      )}

      <footer className="job-detail__footer">
        <button type="button" className="job-detail__save" onClick={handleSave}>
          <Bookmark
            size={14}
            fill={job.bookmarked ? 'currentColor' : 'none'}
          />
          <span>{job.bookmarked ? 'Saved' : 'Save'}</span>
        </button>
        <button
          type="button"
          className="job-detail__war-room"
          onClick={openWarRoom}
          title="Open the Job War Room — match analysis, action plan, mock prep"
        >
          <Target size={14} />
          <span>War Room</span>
        </button>
        <button
          type="button"
          className="job-detail__apply"
          onClick={() => setApplyOpen(true)}
        >
          <span>Apply now</span>
          <ArrowRight size={14} />
        </button>
      </footer>

      <ApplyModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={job}
      />
      <CompanyModal
        open={companyOpen}
        onClose={() => setCompanyOpen(false)}
        company={job.company}
        location={job.location}
      />
    </aside>
  );
}
