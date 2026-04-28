import ApplicationRow from './ApplicationRow';
import PaginationBar from './PaginationBar';
import { mockApplications } from '../../data/applications';

const HEADERS = [
  'Company',
  'Role',
  'Stage',
  'Applied',
  'Last activity',
  'Match',
  'Next step',
  'Actions',
];

export default function ApplicationsTable() {
  return (
    <section className="applications__table-section" aria-label="Applications table">
      <div className="applications__table" role="table">
        <div className="applications__row applications__row--header" role="row">
          {HEADERS.map((label) => (
            <div key={label} className="applications__header-cell" role="columnheader">
              {label}
            </div>
          ))}
        </div>

        <div className="applications__rows">
          {mockApplications.map((app, idx) => (
            <ApplicationRow key={app.id} app={app} selected={idx === 0} />
          ))}
        </div>
      </div>

      <PaginationBar />
    </section>
  );
}
