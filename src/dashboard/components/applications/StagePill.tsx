import type { ApplicationStage } from '../../data/applications';

interface StagePillProps {
  stage: ApplicationStage;
}

const stageClass: Record<ApplicationStage, string> = {
  Interview: 'stage-pill--interview',
  'Phone screen': 'stage-pill--phone',
  Applied: 'stage-pill--applied',
  Offer: 'stage-pill--offer',
  Rejected: 'stage-pill--rejected',
};

export default function StagePill({ stage }: StagePillProps) {
  return <span className={`stage-pill ${stageClass[stage]}`}>{stage}</span>;
}
