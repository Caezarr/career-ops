import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import IntegrationRow from './IntegrationRow';
import IntegrationModal from '../shared/IntegrationModal';
import { useAppStore, type Integration } from '../../store';
import { useToast } from '../../primitives';

export default function IntegrationsCard() {
  const integrations = useAppStore((s) => s.integrations);
  const toast = useToast();
  const [active, setActive] = useState<Integration | null>(null);

  return (
    <section
      className="settings-card settings-integrations"
      aria-labelledby="settings-integrations-title"
    >
      <h2 id="settings-integrations-title" className="settings-card__title">
        API Keys &amp; Integrations
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
        className="settings-integrations__view-all"
        onClick={() => toast.info('All integrations coming soon')}
      >
        <span>View all integrations</span>
        <ArrowRight size={14} strokeWidth={2} />
      </button>

      <IntegrationModal
        open={!!active}
        onClose={() => setActive(null)}
        integration={active}
      />
    </section>
  );
}
