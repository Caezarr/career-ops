import { useState } from 'react';
import { Plus } from 'lucide-react';
import IntegrationRow from './IntegrationRow';
import IntegrationModal from '../shared/IntegrationModal';
import { useAppStore, type Integration } from '../../store';
import { useToast } from '../../primitives';

export default function APIKeysCard() {
  const integrations = useAppStore((s) => s.integrations);
  const toast = useToast();
  const [active, setActive] = useState<Integration | null>(null);

  return (
    <section
      className="settings-card settings-integrations"
      aria-labelledby="settings-apikeys-title"
    >
      <h2 id="settings-apikeys-title" className="settings-card__title">
        API Keys
      </h2>
      <div className="settings-integrations__list">
        {integrations.map((integration) => (
          <IntegrationRow
            key={integration.id}
            integration={integration}
            onManage={() => setActive(integration)}
          />
        ))}
      </div>
      <button
        type="button"
        className="settings-btn settings-btn--outline"
        style={{ marginTop: 12 }}
        onClick={() => toast.info('Add integration — coming soon')}
      >
        <Plus size={14} />
        <span>Add integration</span>
      </button>

      <IntegrationModal
        open={!!active}
        onClose={() => setActive(null)}
        integration={active}
      />
    </section>
  );
}
