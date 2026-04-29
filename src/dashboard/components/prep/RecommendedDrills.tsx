import { useState } from 'react';
import { mockDrills, type DrillData } from '../../data/prep';
import DrillCard from './DrillCard';
import DrillModal from '../shared/DrillModal';

export default function RecommendedDrills() {
  const [active, setActive] = useState<DrillData | null>(null);

  return (
    <section className="prep-recommended-drills">
      <h3 className="prep-recommended-drills__title">Recommended drills</h3>
      <div className="prep-recommended-drills__grid">
        {mockDrills.map((d) => (
          <DrillCard key={d.id} drill={d} onStart={() => setActive(d)} />
        ))}
      </div>
      <DrillModal open={!!active} onClose={() => setActive(null)} drill={active} />
    </section>
  );
}
