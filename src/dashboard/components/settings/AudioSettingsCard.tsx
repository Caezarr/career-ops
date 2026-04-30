import { useState } from 'react';
import { ChevronDown, AudioWaveform, ShieldAlert, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../primitives';
import { useAppStore } from '../../store';
import { useAudioDevices } from '../../hooks/useAudioDevices';
import MicLevelMeter from './MicLevelMeter';

const SYSTEM_DEFAULT_LABEL = 'System default';

export default function AudioSettingsCard() {
  const audioInputId = useAppStore((s) => s.audioInputId);
  const audioOutputId = useAppStore((s) => s.audioOutputId);
  const setAudioInputId = useAppStore((s) => s.setAudioInputId);
  const setAudioOutputId = useAppStore((s) => s.setAudioOutputId);

  const { inputs, outputs, permission, error, refresh, requestAccess } =
    useAudioDevices();
  const [testing, setTesting] = useState(false);

  // Resolve the chosen device's label for the trigger button. If the saved
  // id is no longer in the list (device removed), fall back to "System
  // default" rather than displaying a stale string.
  function resolveLabel(id: string | null, list: { deviceId: string; label: string }[]) {
    if (id === null) return SYSTEM_DEFAULT_LABEL;
    const match = list.find((d) => d.deviceId === id);
    return match?.label || SYSTEM_DEFAULT_LABEL;
  }

  const inputLabel = resolveLabel(audioInputId, inputs);
  const outputLabel = resolveLabel(audioOutputId, outputs);
  const labelsHidden =
    permission !== 'granted' && inputs.every((d) => !d.label);

  return (
    <section className="settings-card" aria-labelledby="settings-audio-title">
      <h2 id="settings-audio-title" className="settings-card__title">
        Audio devices
      </h2>
      <p className="settings-audio__lede">
        Career OS uses these devices for the live Copilot session — the
        Copilot listens through the input and (optionally) plays back the
        suggested answers through the output.
      </p>

      {labelsHidden && (
        <div className="settings-audio__perm" role="status">
          <ShieldAlert size={16} />
          <div>
            <strong>Microphone access required.</strong>
            <span>
              {' '}macOS hides device labels until you grant permission once.
            </span>
          </div>
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={requestAccess}
          >
            Grant access
          </button>
        </div>
      )}

      {error && permission !== 'granted' && (
        <div className="settings-audio__error" role="alert">
          {error}
        </div>
      )}

      <div className="settings-audio__form">
        <DeviceField
          label="Input (microphone)"
          value={inputLabel}
          options={[
            { id: null, label: SYSTEM_DEFAULT_LABEL },
            ...inputs.map((d) => ({ id: d.deviceId, label: d.label || 'Unnamed mic' })),
          ]}
          onSelect={(id) => setAudioInputId(id)}
        />
        <DeviceField
          label="Output (speakers / headphones)"
          value={outputLabel}
          options={[
            { id: null, label: SYSTEM_DEFAULT_LABEL },
            ...outputs.map((d) => ({ id: d.deviceId, label: d.label || 'Unnamed output' })),
          ]}
          onSelect={(id) => setAudioOutputId(id)}
          // Most Chromium-based runtimes don't yet support sinkId for
          // <audio> elements; we still let the user pick because Tauri
          // mac WKWebView routing follows the system default. Hint about
          // the limit so they don't blame us if Spotify still plays in
          // the wrong speaker.
          hint="Output routing may follow your macOS default until WKWebView exposes sinkId."
        />
      </div>

      <div className="settings-audio__test">
        <div className="settings-audio__test-header">
          <span className="settings-audio__test-label">Live mic level</span>
          <div className="settings-audio__test-actions">
            <button
              type="button"
              className="settings-btn settings-btn--outline settings-btn--sm"
              onClick={refresh}
              title="Refresh device list"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={() => setTesting((v) => !v)}
              disabled={permission === 'denied'}
            >
              <AudioWaveform size={14} />
              <span>{testing ? 'Stop test' : 'Test mic'}</span>
            </button>
          </div>
        </div>
        <MicLevelMeter deviceId={audioInputId} active={testing} />
        <p className="settings-audio__test-hint">
          {testing
            ? 'Speak into your mic — segments should light up. Aim for steady mid-range, not red.'
            : 'Click Test mic to see live level. Career OS only opens the mic while testing.'}
        </p>
      </div>
    </section>
  );
}

interface DeviceFieldProps {
  label: string;
  value: string;
  options: { id: string | null; label: string }[];
  onSelect: (id: string | null) => void;
  hint?: string;
}

function DeviceField({ label, value, options, onSelect, hint }: DeviceFieldProps) {
  return (
    <div className="settings-audio__field">
      <span className="settings-audio__field-label">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="ds-shared-select settings-audio__select">
            <span>{value}</span>
            <ChevronDown size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {options.map((opt) => (
            <DropdownMenuItem
              key={opt.id ?? '__default'}
              onSelect={() => onSelect(opt.id)}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {hint && <span className="settings-audio__field-hint">{hint}</span>}
    </div>
  );
}
