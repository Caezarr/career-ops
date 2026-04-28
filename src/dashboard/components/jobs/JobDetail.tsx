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
} from 'lucide-react';
import CompanyAvatar from '../CompanyAvatar';
import InfoTag from './InfoTag';
import StatPill from './StatPill';
import WhyYouMatchCard from './WhyYouMatchCard';
import AISummaryCard from './AISummaryCard';
import { mockSelectedJob } from '../../data/jobs';

export default function JobDetail() {
  const job = mockSelectedJob;

  return (
    <aside className="job-detail" aria-label={`${job.role} at ${job.company}`}>
      <div className="job-detail__topbar">
        <button
          type="button"
          className="job-detail__close"
          aria-label="Close details"
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
            <span className="job-detail__dot">·</span>
            <Star
              size={13}
              className="job-detail__star"
              fill="#f59e0b"
              strokeWidth={0}
            />
            <span className="job-detail__rating">{job.rating}</span>
            <span className="job-detail__reviews">({job.reviews})</span>
            <span className="job-detail__dot">·</span>
            <a href="#company" className="job-detail__link">
              View company
            </a>
          </div>
        </div>
      </div>

      <div className="job-detail__tags">
        <InfoTag icon={MapPin}>{job.location}</InfoTag>
        <InfoTag icon={Euro}>{job.salaryDetail}</InfoTag>
        <InfoTag icon={Briefcase}>{job.type}</InfoTag>
        <InfoTag icon={Calendar}>{job.workMode}</InfoTag>
      </div>

      <div className="job-detail__stats">
        {job.stats.map((s) => (
          <StatPill key={s.label} variant={s.variant}>
            {s.label}
          </StatPill>
        ))}
      </div>

      <section className="job-detail__about">
        <h3 className="job-detail__section-title">About {job.company}</h3>
        {job.about.map((p, i) => (
          <p key={i} className="job-detail__about-text">
            {p}
          </p>
        ))}
      </section>

      <WhyYouMatchCard items={job.whyYouMatch} />

      <AISummaryCard summary={job.aiSummary} />

      <footer className="job-detail__footer">
        <button type="button" className="job-detail__save">
          <Bookmark size={14} />
          <span>Save</span>
        </button>
        <button type="button" className="job-detail__apply">
          <span>Apply now</span>
          <ArrowRight size={14} />
        </button>
      </footer>
    </aside>
  );
}
