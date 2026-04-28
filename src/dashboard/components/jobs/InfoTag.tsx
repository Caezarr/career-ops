import type { ComponentType, ReactNode } from 'react';

interface InfoTagProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
}

export default function InfoTag({ icon: Icon, children }: InfoTagProps) {
  return (
    <span className="info-tag">
      <Icon size={14} className="info-tag__icon" />
      <span>{children}</span>
    </span>
  );
}
