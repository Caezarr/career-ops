import { mockDrills } from '../../data/prep';
import DrillCard from './DrillCard';

export default function RecommendedDrills() {
  return (
    <section className="prep-recommended-drills">
      <h3 className="prep-recommended-drills__title">Recommended drills</h3>
      <div className="prep-recommended-drills__grid">
        {mockDrills.map((d) => (
          <DrillCard key={d.id} drill={d} />
        ))}
      </div>
    </section>
  );
}
