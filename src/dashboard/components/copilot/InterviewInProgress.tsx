import { AudioWaveform, ArrowRight } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { mockInterviewInProgress } from '../../data/copilot';

export default function InterviewInProgress() {
  const { title, company, role, startedAgo } = mockInterviewInProgress;

  const openCopilotOverlay = async () => {
    try {
      await invoke('show_copilot_window');
    } catch (e) {
      console.warn('show_copilot_window failed:', e);
    }
  };

  return (
    <section className="cp-interview-card" aria-label="Interview in progress">
      <div className="cp-interview-card__top">
        <div className="cp-interview-card__avatar" aria-hidden="true">
          <AudioWaveform size={22} strokeWidth={2} />
        </div>
        <div className="cp-interview-card__text">
          <div className="cp-interview-card__title-row">
            <span className="cp-interview-card__title">{title}</span>
            <span className="cp-pill cp-pill--green">Live</span>
          </div>
          <span className="cp-interview-card__subtitle">
            {company} · {role}
          </span>
          <span className="cp-interview-card__started">Started {startedAgo}</span>
        </div>
      </div>

      <div className="cp-interview-card__actions">
        <button
          type="button"
          className="cp-btn cp-btn--outlined"
          onClick={openCopilotOverlay}
        >
          <span>Open Copilot</span>
          <ArrowRight size={14} strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}
