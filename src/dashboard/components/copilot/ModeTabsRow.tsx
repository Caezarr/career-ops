import { AudioWaveform, Square } from 'lucide-react';

export default function ModeTabsRow() {
  return (
    <div className="cp-mode-tabs">
      <div className="cp-mode-tabs__left">
        <button
          type="button"
          className="cp-mode-tab cp-mode-tab--active"
          aria-pressed="true"
        >
          Q&amp;A
        </button>
        <button type="button" className="cp-mode-tab">
          <span>Pitch</span>
          <span className="cp-pill cp-pill--beta">Beta</span>
        </button>
      </div>

      <div className="cp-mode-tabs__right">
        <button
          type="button"
          className="cp-icon-btn"
          aria-label="Toggle waveform"
          title="Waveform"
        >
          <AudioWaveform size={16} strokeWidth={2} />
        </button>
        <button type="button" className="cp-stop-btn" aria-label="Stop session">
          <Square size={10} strokeWidth={0} fill="currentColor" />
          <span>Stop</span>
        </button>
      </div>
    </div>
  );
}
