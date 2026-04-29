import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export type SecurityIconTone = 'indigo' | 'green';

interface SecurityItemProps {
  icon: ReactNode;
  iconTone: SecurityIconTone;
  title: string;
  /** Either a subtitle string or a custom node (e.g. an "Enabled" pill). */
  meta: ReactNode;
  actionLabel: string;
  onAction?: () => void;
}

export default function SecurityItem({
  icon,
  iconTone,
  title,
  meta,
  actionLabel,
  onAction,
}: SecurityItemProps) {
  return (
    <div className="settings-security-item">
      <div
        className={`settings-security-item__icon settings-security-item__icon--${iconTone}`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="settings-security-item__body">
        <div className="settings-security-item__title">{title}</div>
        <div className="settings-security-item__meta">{meta}</div>
      </div>
      <button type="button" className="settings-security-item__action" onClick={onAction}>
        <span>{actionLabel}</span>
        <ArrowRight size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
