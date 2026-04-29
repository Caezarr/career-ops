import type { Integration } from '../../store';

interface IntegrationRowProps {
  integration: Integration;
  onManage?: () => void;
}

export default function IntegrationRow({ integration, onManage }: IntegrationRowProps) {
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
        {!connected && (
          <span className="settings-pill" style={{ background: 'var(--bg-soft)', color: 'var(--text-3)' }}>
            Disconnected
          </span>
        )}
        <button
          type="button"
          className="settings-btn settings-btn--outline settings-btn--sm"
          onClick={onManage}
        >
          Manage
        </button>
      </div>
    </div>
  );
}
