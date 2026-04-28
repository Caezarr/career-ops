import StatCard from '../StatCard';
import { mockApplicationStats } from '../../data/applications';

export default function ApplicationsStats() {
  return (
    <section className="applications__stats" aria-label="Applications metrics">
      {mockApplicationStats.map((stat) => (
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
