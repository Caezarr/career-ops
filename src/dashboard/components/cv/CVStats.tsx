import StatCard from '../StatCard';
import { mockCVStats } from '../../data/cv';

export default function CVStats() {
  return (
    <section className="cv__stats" aria-label="CV metrics">
      {mockCVStats.map((stat) => (
        <StatCard
          key={stat.id}
          model={{
            label: stat.label,
            value: stat.value,
            iconKey: stat.iconKey,
            iconBg: stat.iconBg,
            trend: stat.trend,
          }}
        />
      ))}
    </section>
  );
}
