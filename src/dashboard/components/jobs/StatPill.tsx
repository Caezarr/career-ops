import type { StatPillVariant } from '../../data/jobs';

interface StatPillProps {
  variant: StatPillVariant;
  children: string;
}

export default function StatPill({ variant, children }: StatPillProps) {
  return (
    <span className={`stat-pill stat-pill--${variant}`}>{children}</span>
  );
}
