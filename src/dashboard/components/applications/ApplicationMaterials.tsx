import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import type { ApplicationMaterial } from '../../data/applications';

interface ApplicationMaterialsProps {
  materials: ApplicationMaterial[];
}

export default function ApplicationMaterials({ materials }: ApplicationMaterialsProps) {
  return (
    <section className="app-detail__section">
      <h3 className="app-detail__section-title">Application materials</h3>
      <ul className="app-detail__materials">
        {materials.map((m) => (
          <li key={m.type} className="app-detail__material">
            {m.state === 'uploaded' ? (
              <CheckCircle2
                size={18}
                strokeWidth={2}
                className="app-detail__material-icon app-detail__material-icon--done"
              />
            ) : (
              <Circle
                size={18}
                strokeWidth={2}
                className="app-detail__material-icon app-detail__material-icon--missing"
              />
            )}
            <span className="app-detail__material-name">{m.name}</span>
            {m.state === 'uploaded' ? (
              <span className="app-detail__material-right">
                <span className="app-detail__material-meta">{m.uploaded}</span>
                <ExternalLink size={14} strokeWidth={2} className="app-detail__material-link-icon" />
              </span>
            ) : (
              <span className="app-detail__material-right">
                <span className="app-detail__material-meta">{m.uploaded}</span>
                <a href="#" className="app-detail__material-add">+ Add</a>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
