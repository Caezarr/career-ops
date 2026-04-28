import { CheckCircle2, Mic, FileText } from 'lucide-react';
import type { ActivityIconKey } from '../../data/copilot';

interface ActivityItemProps {
  iconKey: ActivityIconKey;
  title: string;
  subtitle: string;
  timestamp: string;
}

const ICON_COMPONENTS = {
  check: CheckCircle2,
  mic: Mic,
  file: FileText,
} as const;

const ICON_VARIANTS: Record<ActivityIconKey, string> = {
  check: 'cp-activity-icon--green',
  mic: 'cp-activity-icon--purple',
  file: 'cp-activity-icon--indigo',
};

export default function ActivityItem({
  iconKey,
  title,
  subtitle,
  timestamp,
}: ActivityItemProps) {
  const Icon = ICON_COMPONENTS[iconKey];

  return (
    <div className="cp-activity-item">
      <div className={`cp-activity-icon ${ICON_VARIANTS[iconKey]}`} aria-hidden="true">
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="cp-activity-item__text">
        <span className="cp-activity-item__title">{title}</span>
        <span className="cp-activity-item__subtitle">{subtitle}</span>
      </div>
      <span className="cp-activity-item__timestamp">{timestamp}</span>
    </div>
  );
}
