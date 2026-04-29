import { Info } from 'lucide-react';
import MonitorToggle from './MonitorToggle';

export default function JobsHeader() {
  return (
    <div className="jobs__header">
      <div className="jobs__header-text">
        <h1 className="jobs__title">Find the right roles faster</h1>
        <p className="jobs__subtitle">
          AI-powered job sourcing and matching, tailored to your profile and goals.
        </p>
      </div>
      <div className="jobs__monitor">
        <span className="jobs__monitor-label">Monitor new matches</span>
        <Info size={14} className="jobs__monitor-info" />
        <MonitorToggle />
      </div>
    </div>
  );
}
