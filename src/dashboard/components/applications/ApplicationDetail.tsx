import { FolderOpen, ArrowRight } from 'lucide-react';
import DetailHeader from './DetailHeader';
import DetailMeta from './DetailMeta';
import ApplicationMaterials from './ApplicationMaterials';
import ApplicationTimeline from './ApplicationTimeline';
import AINextStepsCard from './AINextStepsCard';
import { mockApplicationDetail } from '../../data/applications';

export default function ApplicationDetail() {
  const detail = mockApplicationDetail;

  return (
    <div className="app-detail">
      <DetailHeader detail={detail} />
      <DetailMeta detail={detail} />
      <ApplicationMaterials materials={detail.materials} />
      <ApplicationTimeline events={detail.timeline} />
      <AINextStepsCard steps={detail.aiNextSteps} />

      <div className="app-detail__actions">
        <button type="button" className="app-detail__btn app-detail__btn--ghost">
          <FolderOpen size={16} strokeWidth={2} />
          <span>Open documents</span>
        </button>
        <button type="button" className="app-detail__btn app-detail__btn--primary">
          <span>Prepare now</span>
          <ArrowRight size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
