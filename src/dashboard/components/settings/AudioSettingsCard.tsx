import { useState } from 'react';
import { ChevronDown, AudioWaveform } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '../../primitives';

const INPUTS = [
  'MacBook Pro Microphone',
  'AirPods',
  'External USB Mic',
];

const OUTPUTS = [
  'MacBook Pro Speakers',
  'AirPods',
  'External USB Headphones',
];

export default function AudioSettingsCard() {
  const toast = useToast();
  const [input, setInput] = useState(INPUTS[0]);
  const [output, setOutput] = useState(OUTPUTS[0]);

  return (
    <section className="settings-card" aria-labelledby="settings-audio-title">
      <h2 id="settings-audio-title" className="settings-card__title">
        Audio
      </h2>
      <div style={{ display: 'grid', gap: 16, paddingTop: 4 }}>
        <div className="ds-shared-row">
          <span className="ds-shared-label">Audio input device</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="ds-shared-select">
                <span>{input}</span>
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {INPUTS.map((opt) => (
                <DropdownMenuItem key={opt} onSelect={() => setInput(opt)}>
                  {opt}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ds-shared-row">
          <span className="ds-shared-label">Audio output device</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="ds-shared-select">
                <span>{output}</span>
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {OUTPUTS.map((opt) => (
                <DropdownMenuItem key={opt} onSelect={() => setOutput(opt)}>
                  {opt}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => toast.info('Testing audio (coming soon)')}
          >
            <AudioWaveform size={14} />
            <span>Test audio</span>
          </button>
        </div>
      </div>
    </section>
  );
}
