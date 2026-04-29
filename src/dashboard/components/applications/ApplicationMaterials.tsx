import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '../../primitives';
import { useAppStore, type ApplicationMaterial } from '../../store';

interface ApplicationMaterialsProps {
  materials: ApplicationMaterial[];
  onAdd: () => void;
}

export default function ApplicationMaterials({
  materials,
  onAdd,
}: ApplicationMaterialsProps) {
  const toast = useToast();
  const setApps = useAppStore.setState;
  const selectedId = useAppStore((s) => s.selectedApplicationId);

  function removeMaterial(name: string) {
    if (!selectedId) return;
    setApps((state) => ({
      applications: state.applications.map((a) =>
        a.id === selectedId
          ? { ...a, materials: a.materials.filter((m) => m.name !== name) }
          : a,
      ),
    }));
    toast.success('Material removed');
  }

  return (
    <section className="app-detail__section">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h3 className="app-detail__section-title" style={{ margin: 0 }}>
          Application materials
        </h3>
        <button
          type="button"
          className="app-detail__material-add"
          onClick={onAdd}
        >
          + Add
        </button>
      </div>
      <ul className="app-detail__materials">
        {materials.length === 0 && (
          <li className="ds-empty" style={{ padding: 16 }}>
            <span style={{ fontSize: 12 }}>No materials yet</span>
          </li>
        )}
        {materials.map((m) => (
          <li key={m.type + m.name} className="app-detail__material">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Options for ${m.name}`}
                      style={{ display: 'inline-flex' }}
                    >
                      <ExternalLink
                        size={14}
                        strokeWidth={2}
                        className="app-detail__material-link-icon"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => toast.info(`Opening ${m.name}`)}
                    >
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onAdd}>
                      Replace
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => removeMaterial(m.name)}
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            ) : (
              <span className="app-detail__material-right">
                <span className="app-detail__material-meta">{m.uploaded}</span>
                <button
                  type="button"
                  className="app-detail__material-add"
                  onClick={onAdd}
                >
                  + Add
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
