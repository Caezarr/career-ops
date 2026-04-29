import { Euro, Home, User, Calendar } from 'lucide-react';

interface DetailMetaProps {
  salary: string;
  workMode: string;
  recruiter: string;
  appliedDate: string;
}

export default function DetailMeta({
  salary,
  workMode,
  recruiter,
  appliedDate,
}: DetailMetaProps) {
  return (
    <div className="app-detail__meta">
      <span className="app-detail__meta-item">
        <Euro size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>{salary}</span>
      </span>
      <span className="app-detail__meta-item">
        <Home size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>{workMode}</span>
      </span>
      <span className="app-detail__meta-item">
        <User size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>{recruiter}</span>
      </span>
      <span className="app-detail__meta-item">
        <Calendar size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>{appliedDate}</span>
      </span>
    </div>
  );
}
