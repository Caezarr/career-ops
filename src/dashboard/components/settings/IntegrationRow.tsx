import { useState } from 'react';
import type { Integration } from '../../store';
import anthropicLogo from '../../assets/integrations/anthropic.svg';
import openaiLogo from '../../assets/integrations/openai.svg';
import assemblyaiLogo from '../../assets/integrations/assemblyai.png';

/** Resolve the brand logo for a given integration id. Vite handles the
 *  hashed asset URLs at build time. If we add new providers, drop the file
 *  in src/dashboard/assets/integrations/ and add the mapping here. */
const LOGO_BY_ID: Record<string, string> = {
  anthropic: anthropicLogo,
  openai: openaiLogo,
  assemblyai: assemblyaiLogo,
};

interface IntegrationRowProps {
  integration: Integration;
  onManage?: () => void;
}

export default function IntegrationRow({ integration, onManage }: IntegrationRowProps) {
  const { id, name, model, connected, brandColor, brandBg, letter } = integration;
  const logo = LOGO_BY_ID[id];
  // If the asset fails to load (rename, missing file), fall back to the
  // brand-coloured letter tile so we never render a broken image.
  const [imgFailed, setImgFailed] = useState(false);
  const showLogo = Boolean(logo) && !imgFailed;

  return (
    <div className="settings-integration-row">
      <div className="settings-integration-row__left">
        <div
          className="settings-integration-row__logo"
          style={
            showLogo
              ? undefined
              : { background: brandBg, borderColor: brandColor, color: brandColor }
          }
          aria-hidden="true"
        >
          {showLogo ? (
            <img
              src={logo}
              alt=""
              className="settings-integration-row__logo-img"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="settings-integration-row__letter">{letter}</span>
          )}
        </div>
        <div className="settings-integration-row__text">
          <div className="settings-integration-row__name">{name}</div>
          <div className="settings-integration-row__model">{model}</div>
        </div>
      </div>

      <div className="settings-integration-row__right">
        {connected ? (
          <span className="settings-pill settings-pill--green">Connected</span>
        ) : (
          <span
            className="settings-pill"
            style={{ background: 'var(--bg-soft)', color: 'var(--text-3)' }}
          >
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
