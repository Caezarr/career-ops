import { X } from 'lucide-react';
import CompanyAvatar from '../CompanyAvatar';
import StagePill from './StagePill';
import { useAppStore, type ApplicationStage } from '../../store';
import { useToast } from '../../primitives';

interface DetailHeaderProps {
  company: string;
  role: string;
  location: string;
  stage: ApplicationStage;
}

const STAGE_LABEL: Record<ApplicationStage, string> = {
  sourced: 'Sourced',
  applied: 'Applied',
  phone_screen: 'Phone screen',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export default function DetailHeader({
  company,
  role,
  location,
  stage,
}: DetailHeaderProps) {
  const toast = useToast();
  const setSelected = useAppStore((s) => s.setSelectedApplication);
  const updateStage = useAppStore((s) => s.updateApplicationStage);
  const selectedId = useAppStore((s) => s.selectedApplicationId);

  function handleStageChange(newStage: ApplicationStage) {
    if (!selectedId) return;
    updateStage(selectedId, newStage);
    toast.success(`Moved to ${STAGE_LABEL[newStage]}`);
  }

  return (
    <div className="app-detail__header">
      <CompanyAvatar company={company} size={44} />
      <div className="app-detail__header-text">
        <div className="app-detail__title-row">
          <h2 className="app-detail__title">{role}</h2>
          <StagePill stage={stage} onChange={handleStageChange} />
        </div>
        <p className="app-detail__subtitle">
          {company} &middot; {location}
        </p>
      </div>
      <button
        type="button"
        className="app-detail__close"
        aria-label="Close panel"
        onClick={() => setSelected(null)}
      >
        <X size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
