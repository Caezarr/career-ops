import { Square } from 'lucide-react';
import CompanyAvatar from '../CompanyAvatar';
import { mockCopilotSession } from '../../data/copilot';

export default function InterviewSessionBar() {
  const { company, role, timer } = mockCopilotSession;

  return (
    <div className="cp-session-bar">
      <CompanyAvatar company={company} size={32} />

      <div className="cp-session-bar__text">
        <span className="cp-session-bar__title">
          {company} · {role}
        </span>
        <div className="cp-session-bar__timer-row">
          <span className="cp-rec-dot" aria-hidden="true" />
          <span className="cp-session-bar__timer">{timer}</span>
        </div>
      </div>

      <button type="button" className="cp-stop-btn" aria-label="Stop session">
        <Square size={10} strokeWidth={0} fill="currentColor" />
        <span>Stop</span>
      </button>
    </div>
  );
}
