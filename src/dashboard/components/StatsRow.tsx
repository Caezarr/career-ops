import '../styles/stats.css';
import StatCard from './StatCard';
import { mockStats } from '../data/mock';

export default function StatsRow() {
  return (
    <section className="stats-row" aria-label="Key metrics">
      {mockStats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </section>
  );
}
