import { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Key,
  Mic,
  Volume2,
  User,
} from 'lucide-react';
import type { ConfigIconKey } from '../../data/copilot';
import { mockCopilotSession } from '../../data/copilot';
import { useNavigation } from '../../navigation';
import IntegrationModal from '../shared/IntegrationModal';
import { useAppStore } from '../../store';

const ICON_COMPONENTS = {
  key: Key,
  mic: Mic,
  volume: Volume2,
  user: User,
} satisfies Record<ConfigIconKey, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>>;

export default function ConfigurationPanel() {
  const { config } = mockCopilotSession;
  const { navigate } = useNavigation();
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);
  const integrations = useAppStore((s) => s.integrations);

  const [collapsed, setCollapsed] = useState(false);
  const [integrationOpenId, setIntegrationOpenId] = useState<null | string>(null);
  const integrationOpen = integrations.find((i) => i.id === integrationOpenId) ?? null;

  function handleItemClick(itemId: string) {
    switch (itemId) {
      case 'api':
        setIntegrationOpenId('openai');
        break;
      case 'in':
        setSettingsTab('audio');
        navigate('settings');
        break;
      case 'out':
        setSettingsTab('audio');
        navigate('settings');
        break;
      case 'profile':
        setSettingsTab('account');
        navigate('settings');
        break;
      default:
        break;
    }
  }

  return (
    <div className="cp-config">
      <button
        type="button"
        className="cp-config__header"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="cp-config__title">Configuration</span>
        {collapsed ? (
          <ChevronDown size={16} strokeWidth={2} className="cp-config__chevron" />
        ) : (
          <ChevronUp size={16} strokeWidth={2} className="cp-config__chevron" />
        )}
      </button>

      {!collapsed && (
        <div className="cp-config__list">
          {config.map((item) => {
            const Icon = ICON_COMPONENTS[item.iconKey];
            return (
              <button
                type="button"
                className="cp-config__item"
                key={item.id}
                aria-label={item.label}
                onClick={() => handleItemClick(item.id)}
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
      )}

      <IntegrationModal
        open={!!integrationOpen}
        integration={integrationOpen}
        onClose={() => setIntegrationOpenId(null)}
      />
    </div>
  );
}
