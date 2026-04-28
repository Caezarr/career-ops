import {
  ChevronUp,
  ChevronRight,
  Key,
  Mic,
  Volume2,
  User,
} from 'lucide-react';
import type { ConfigIconKey } from '../../data/copilot';
import { mockCopilotSession } from '../../data/copilot';

const ICON_COMPONENTS = {
  key: Key,
  mic: Mic,
  volume: Volume2,
  user: User,
} satisfies Record<ConfigIconKey, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>>;

export default function ConfigurationPanel() {
  const { config } = mockCopilotSession;

  return (
    <div className="cp-config">
      <button type="button" className="cp-config__header" aria-expanded="true">
        <span className="cp-config__title">Configuration</span>
        <ChevronUp size={16} strokeWidth={2} className="cp-config__chevron" />
      </button>

      <div className="cp-config__list">
        {config.map((item) => {
          const Icon = ICON_COMPONENTS[item.iconKey];
          return (
            <button
              type="button"
              className="cp-config__item"
              key={item.id}
              aria-label={item.label}
            >
              <div className="cp-config__item-left">
                <Icon
                  size={14}
                  strokeWidth={2}
                  className="cp-config__item-icon"
                />
                <span className="cp-config__item-label">{item.label}</span>
              </div>
              <div className="cp-config__item-right">
                {item.showStatusDot && (
                  <span
                    className="cp-config__item-status-dot"
                    aria-hidden="true"
                  />
                )}
                <span className="cp-config__item-value">{item.value}</span>
                <ChevronRight
                  size={14}
                  strokeWidth={2}
                  className="cp-config__item-chevron"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
