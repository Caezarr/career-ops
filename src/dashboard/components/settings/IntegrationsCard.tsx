import { ArrowRight } from 'lucide-react';
import IntegrationRow from './IntegrationRow';
import { mockIntegrations } from '../../data/settings';

export default function IntegrationsCard() {
  return (
    <section
      className="settings-card settings-integrations"
      aria-labelledby="settings-integrations-title"
    >
      <h2 id="settings-integrations-title" className="settings-card__title">
        API Keys &amp; Integrations
      </h2>

      <div className="settings-integrations__list">
        {mockIntegrations.map((integration) => (
          <IntegrationRow key={integration.id} integration={integration} />
        ))}
      </div>

      <button type="button" className="settings-integrations__view-all">
        <span>View all integrations</span>
        <ArrowRight size={14} strokeWidth={2} />
      </button>
    </section>
  );
}
