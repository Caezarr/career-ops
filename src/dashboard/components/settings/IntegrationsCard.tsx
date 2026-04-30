import { useState } from 'react';
import IntegrationRow from './IntegrationRow';
import IntegrationModal from '../shared/IntegrationModal';
import { useAppStore, type Integration } from '../../store';

export default function IntegrationsCard() {
  const integrations = useAppStore((s) => s.integrations);
  const [active, setActive] = useState<Integration | null>(null);

  return (
    <section
      className="settings-card settings-integrations"
      aria-labelledby="settings-integrations-title"
    >
      <h2 id="settings-integrations-title" className="settings-card__title">
        Providers
      </h2>
      <p className="settings-integrations__lede">
        Career OS calls these providers under the hood. Click <em>Manage</em>
        {' '}to view or rotate the API key, or to disconnect.
      </p>

      <div className="settings-integrations__list">
        {integrations.map((integration) => (
          <IntegrationRow
            key={integration.id}
            integration={integration}
            onManage={() => setActive(integration)}
          />
        ))}
      </div>

      <IntegrationModal
        open={!!active}
        onClose={() => setActive(null)}
        integration={active}
      />
    </section>
  );
}
