import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../primitives';
import type { ApplicationStage } from '../../store';

interface StagePillProps {
  stage: ApplicationStage;
  onChange?: (stage: ApplicationStage) => void;
}

const STAGE_INFO: Record<ApplicationStage, { label: string; cls: string }> = {
  sourced: { label: 'Sourced', cls: 'stage-pill--sourced' },
  applied: { label: 'Applied', cls: 'stage-pill--applied' },
  phone_screen: { label: 'Phone screen', cls: 'stage-pill--phone' },
  interview: { label: 'Interview', cls: 'stage-pill--interview' },
  offer: { label: 'Offer', cls: 'stage-pill--offer' },
  rejected: { label: 'Rejected', cls: 'stage-pill--rejected' },
};

const ALL_STAGES: ApplicationStage[] = [
  'sourced',
  'applied',
  'phone_screen',
  'interview',
  'offer',
  'rejected',
];

export default function StagePill({ stage, onChange }: StagePillProps) {
  const info = STAGE_INFO[stage];

  if (!onChange) {
    return <span className={`stage-pill ${info.cls}`}>{info.label}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`stage-pill stage-pill--button ${info.cls}`}
          aria-label={`Stage: ${info.label}, click to change`}
          onClick={(e) => e.stopPropagation()}
        >
          {info.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {ALL_STAGES.map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={() => {
              if (s !== stage) onChange(s);
            }}
          >
            {STAGE_INFO[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
