import { useState } from 'react';
import { Upload, Plus } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';
import { downloadCSV } from '../../utils/csv';
import { NewApplicationModal } from '../shared';
import { filterAndSortApplications } from './filterUtils';

export default function ApplicationsHeader() {
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const applications = useAppStore((s) => s.applications);
  const jobs = useAppStore((s) => s.jobs);
  const tab = useAppStore((s) => s.applicationsTab);
  const role = useAppStore((s) => s.applicationsRoleFilter);
  const sort = useAppStore((s) => s.applicationsSort);

  function handleExport() {
    const filtered = filterAndSortApplications(applications, jobs, tab, role, sort);
    if (filtered.length === 0) {
      toast.info('Nothing to export', 'No applications match the current view.');
      return;
    }
    const rows = filtered.map((a) => {
      const job = jobs.find((j) => j.id === a.jobId);
      return {
        company: job?.company ?? '',
        role: job?.role ?? '',
        stage: a.stage,
        applied: a.appliedDate,
        lastActivity: a.lastActivity,
        match: a.match,
        nextStep: a.nextStep,
        notes: a.notes,
      };
    });
    downloadCSV('applications.csv', rows);
    toast.success(`Exported ${rows.length} application${rows.length === 1 ? '' : 's'}`);
  }

  return (
    <header className="applications__header">
      <div className="applications__header-text">
        <h1 className="applications__title">Track every application clearly</h1>
        <p className="applications__subtitle">
          Monitor stage, follow-ups, documents, and AI next steps across your pipeline.
        </p>
      </div>
      <div className="applications__header-actions">
        <button
          type="button"
          className="applications__btn applications__btn--ghost"
          onClick={handleExport}
        >
          <Upload size={16} strokeWidth={2} />
          <span>Export</span>
        </button>
        <button
          type="button"
          className="applications__btn applications__btn--primary"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} strokeWidth={2.2} />
          <span>New application</span>
        </button>
      </div>

      <NewApplicationModal open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
