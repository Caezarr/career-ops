import { useEffect, useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Key,
  Mic,
  Volume2,
  User,
} from 'lucide-react';
import { useNavigation } from '../../navigation';
import { useAppStore } from '../../store';
import { readCopilotConfig } from '../../hooks/useAnthropicKey';

/** Configuration row spec — internal to the panel because each row's
 *  click target and value are derived live from the store / ic-config. */
interface ConfigRow {
  id: 'api' | 'in' | 'out' | 'profile';
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  value: string;
  /** Green dot indicates "configured / connected"; absent dot = needs setup. */
  ok: boolean;
  onClick: () => void;
}

/** Configuration card at the bottom of the Copilot panel. Shows a
 *  one-line status for each upstream dependency (API key, mic, output,
 *  profile) and deep-links into the appropriate Settings tab so the
 *  user can fix anything that's missing. Values are derived live from
 *  the persisted ic-config blob and the audio slice — no mock. */
export default function ConfigurationPanel() {
  const { navigate } = useNavigation();
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);
  const audioInputId = useAppStore((s) => s.audioInputId);
  const audioOutputId = useAppStore((s) => s.audioOutputId);
  const user = useAppStore((s) => s.user);

  // Re-read the ic-config blob on mount + on focus so the panel
  // reflects edits made in Settings. We use a tiny tick state to
  // re-render without subscribing to a slice — ic-config is not in
  // the Zustand tree.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const cfg = readCopilotConfig();
  void tick; // mark as used so React re-runs the snapshot when it bumps

  const [collapsed, setCollapsed] = useState(false);

  const goSettings = (tab: 'apiKeys' | 'audio' | 'account') => {
    setSettingsTab(tab);
    navigate('settings');
  };

  const rows: ConfigRow[] = [
    {
      id: 'api',
      Icon: Key,
      label: 'API keys',
      value: cfg.anthropicKey
        ? cfg.assemblyaiKey
          ? 'Anthropic + AssemblyAI'
          : 'Anthropic only'
        : 'Not configured',
      ok: !!cfg.anthropicKey,
      onClick: () => goSettings('apiKeys'),
    },
    {
      id: 'in',
      Icon: Mic,
      label: 'Audio input',
      // The legacy audioDevice label from ic-config wins when set
      // (that's what the Rust pipeline uses); fall back to the audio
      // slice id for the indication-only display.
      value: cfg.audioDevice || (audioInputId ? 'System default' : 'System default'),
      ok: !!cfg.audioDevice || !!audioInputId,
      onClick: () => goSettings('audio'),
    },
    {
      id: 'out',
      Icon: Volume2,
      label: 'Loopback (recruiter audio)',
      value: cfg.loopbackDevice
        ? cfg.loopbackDevice
        : audioOutputId
        ? 'System default'
        : 'Not set',
      ok: !!cfg.loopbackDevice,
      onClick: () => goSettings('audio'),
    },
    {
      id: 'profile',
      Icon: User,
      label: 'Profile',
      value: user.targetRole
        ? `${user.targetRole} · ${cfg.persona}`
        : cfg.persona === 'finance'
        ? 'Finance / PE / IB'
        : cfg.persona === 'tech-ai'
        ? 'Tech / AI Engineering'
        : 'Strategy / Consulting',
      ok: true,
      onClick: () => goSettings('account'),
    },
  ];

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
          {rows.map(({ id, Icon, label, value, ok, onClick }) => (
            <button
              type="button"
              className="cp-config__item"
              key={id}
              aria-label={label}
              onClick={onClick}
            >
              <div className="cp-config__item-left">
                <Icon
                  size={14}
                  strokeWidth={2}
                  className="cp-config__item-icon"
                />
                <span className="cp-config__item-label">{label}</span>
              </div>
              <div className="cp-config__item-right">
                <span
                  className={
                    'cp-config__item-status-dot' +
                    (ok ? '' : ' cp-config__item-status-dot--off')
                  }
                  aria-hidden="true"
                />
                <span className="cp-config__item-value">{value}</span>
                <ChevronRight
                  size={14}
                  strokeWidth={2}
                  className="cp-config__item-chevron"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
