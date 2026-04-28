import { MessageCircle, MoreHorizontal } from 'lucide-react';
import CompanyAvatar from '../CompanyAvatar';
import MatchPill from '../jobs/MatchPill';
import StagePill from './StagePill';
import type { Application } from '../../data/applications';

interface ApplicationRowProps {
  app: Application;
  selected?: boolean;
}

export default function ApplicationRow({ app, selected = false }: ApplicationRowProps) {
  return (
    <div
      className={`applications__row${selected ? ' applications__row--selected' : ''}`}
      role="row"
      tabIndex={0}
    >
      <div className="applications__cell applications__cell--company" role="cell">
        <CompanyAvatar company={app.company} size={28} />
        <span className="applications__company-name">{app.company}</span>
      </div>
      <div className="applications__cell applications__cell--role" role="cell">
        {app.role}
      </div>
      <div className="applications__cell" role="cell">
        <StagePill stage={app.stage} />
      </div>
      <div className="applications__cell applications__cell--muted" role="cell">
        {app.appliedDate}
      </div>
      <div className="applications__cell applications__cell--muted" role="cell">
        {app.lastActivity}
      </div>
      <div className="applications__cell" role="cell">
        <MatchPill match={app.match} />
      </div>
      <div className="applications__cell applications__cell--next-step" role="cell">
        <a href="#" className="applications__next-step-link">
          {app.nextStep}
        </a>
      </div>
      <div className="applications__cell applications__cell--actions" role="cell">
        <button
          type="button"
          className="applications__icon-btn"
          aria-label="Comments"
        >
          <MessageCircle size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="applications__icon-btn"
          aria-label="More options"
        >
          <MoreHorizontal size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
