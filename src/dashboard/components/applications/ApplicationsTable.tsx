import { useMemo, useState } from 'react';
import ApplicationRow from './ApplicationRow';
import PaginationBar from './PaginationBar';
import { useAppStore } from '../../store';
import { filterAndSortApplications } from './filterUtils';
import { NotesDrawer } from '../shared';

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
  const applications = useAppStore((s) => s.applications);
  const jobs = useAppStore((s) => s.jobs);
  const tab = useAppStore((s) => s.applicationsTab);
  const role = useAppStore((s) => s.applicationsRoleFilter);
  const sort = useAppStore((s) => s.applicationsSort);
  const page = useAppStore((s) => s.applicationsPage);
  const setPage = useAppStore((s) => s.setApplicationsPage);
  const pageSize = useAppStore((s) => s.applicationsPageSize);

  const [notesAppId, setNotesAppId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterAndSortApplications(applications, jobs, tab, role, sort),
    [applications, jobs, tab, role, sort],
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const visible = filtered.slice(startIdx, startIdx + pageSize);

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
          {visible.length === 0 ? (
            <div className="ds-empty" style={{ padding: 32 }}>
              <span>No applications match the current view.</span>
            </div>
          ) : (
            visible.map((app) => {
              const job = jobs.find((j) => j.id === app.jobId);
              return (
                <ApplicationRow
                  key={app.id}
                  app={app}
                  company={job?.company ?? ''}
                  role={job?.role ?? ''}
                  onOpenNotes={() => setNotesAppId(app.id)}
                />
              );
            })
          )}
        </div>
      </div>

      <PaginationBar
        total={total}
        startIdx={startIdx}
        endIdx={Math.min(total, startIdx + pageSize)}
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <NotesDrawer
        open={notesAppId !== null}
        onClose={() => setNotesAppId(null)}
        applicationId={notesAppId}
      />
    </section>
  );
}
