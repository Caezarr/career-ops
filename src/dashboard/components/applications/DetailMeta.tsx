import { Euro, Home, User, Calendar } from 'lucide-react';
import type { ApplicationDetail } from '../../data/applications';

interface DetailMetaProps {
  detail: ApplicationDetail;
}

export default function DetailMeta({ detail }: DetailMetaProps) {
  return (
    <div className="app-detail__meta">
      <span className="app-detail__meta-item">
        <Euro size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>{detail.salary}</span>
      </span>
      <span className="app-detail__meta-item">
        <Home size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>{detail.workMode}</span>
      </span>
      <span className="app-detail__meta-item">
        <User size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>{detail.recruiter}</span>
      </span>
      <span className="app-detail__meta-item">
        <Calendar size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>{detail.appliedDate}</span>
      </span>
    </div>
  );
}
