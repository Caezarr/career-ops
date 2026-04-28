import type { IntegrationData } from '../../data/settings';

interface IntegrationRowProps {
  integration: IntegrationData;
}

export default function IntegrationRow({ integration }: IntegrationRowProps) {
  const { name, model, connected, brandColor, brandBg, letter } = integration;

  return (
    <div className="settings-integration-row">
      <div className="settings-integration-row__left">
        <div
          className="settings-integration-row__logo"
          style={{
            background: brandBg,
            borderColor: brandColor,
            color: brandColor,
          }}
          aria-hidden="true"
        >
          <span className="settings-integration-row__letter">{letter}</span>
        </div>
        <div className="settings-integration-row__text">
          <div className="settings-integration-row__name">{name}</div>
          <div className="settings-integration-row__model">{model}</div>
        </div>
      </div>

      <div className="settings-integration-row__right">
        {connected && (
          <span className="settings-pill settings-pill--green">Connected</span>
        )}
        <button type="button" className="settings-btn settings-btn--outline settings-btn--sm">
          Manage
        </button>
      </div>
    </div>
  );
}
