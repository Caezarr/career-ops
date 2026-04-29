import type {
  Application,
  ApplicationsSort,
  ApplicationsTab,
  Job,
} from '../../store';

export function filterAndSortApplications(
  applications: Application[],
  jobs: Job[],
  tab: ApplicationsTab,
  role: string,
  sort: ApplicationsSort,
): Application[] {
  const byJob = new Map(jobs.map((j) => [j.id, j]));

  const visible = applications.filter((a) => {
    // Tab filter.
    if (tab === 'all' && a.archived) return false;
    if (tab === 'active') {
      if (a.archived) return false;
      if (!['sourced', 'applied', 'phone_screen'].includes(a.stage)) return false;
    }
    if (tab === 'interviews') {
      if (a.archived) return false;
      if (!['interview', 'offer'].includes(a.stage)) return false;
    }
    if (tab === 'archived') {
      if (!a.archived && a.stage !== 'rejected') return false;
    }
    // Role filter (loose contains on job role).
    if (role && role !== 'All roles') {
      const job = byJob.get(a.jobId);
      const haystack = (job?.role ?? '').toLowerCase();
      if (!haystack.includes(role.toLowerCase())) return false;
    }
    return true;
  });

  return visible.slice().sort((a, b) => {
    if (sort === 'recent') return b.appliedAt - a.appliedAt;
    if (sort === 'applied') return b.appliedAt - a.appliedAt;
    if (sort === 'match') return b.match - a.match;
    if (sort === 'company') {
      const ja = byJob.get(a.jobId)?.company ?? '';
      const jb = byJob.get(b.jobId)?.company ?? '';
      return ja.localeCompare(jb);
    }
    if (sort === 'stage') return a.stage.localeCompare(b.stage);
    return 0;
  });
}
