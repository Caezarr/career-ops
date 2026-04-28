import { X } from 'lucide-react';
import CompanyAvatar from '../CompanyAvatar';
import StagePill from './StagePill';
import type { ApplicationDetail } from '../../data/applications';

interface DetailHeaderProps {
  detail: ApplicationDetail;
}

export default function DetailHeader({ detail }: DetailHeaderProps) {
  return (
    <div className="app-detail__header">
      <CompanyAvatar company={detail.company} size={44} />
      <div className="app-detail__header-text">
        <div className="app-detail__title-row">
          <h2 className="app-detail__title">{detail.role}</h2>
          <StagePill stage={detail.stage} />
        </div>
        <p className="app-detail__subtitle">
          {detail.company} &middot; {detail.location}
        </p>
      </div>
      <button type="button" className="app-detail__close" aria-label="Close panel">
        <X size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
