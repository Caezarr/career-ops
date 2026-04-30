import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../primitives';
import { useAppStore } from '../../store';
import type { ApplicationsTab, ApplicationsSort } from '../../store';

const TABS: { value: ApplicationsTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'interviews', label: 'Interviews' },
  { value: 'archived', label: 'Archived' },
];

/** Heuristically classify a job's role text into a coarse bucket so
 *  the dropdown stays short. The role filter accepts a substring
 *  match against the job title, so "Strategy" matches "Strategy &
 *  Ops", "VP IBD Strategy", etc. */
function familyFor(role: string): string | null {
  const r = role.toLowerCase();
  if (/(strategy|consult|ops)/i.test(r)) return 'Strategy';
  if (/(product|pm\b)/i.test(r)) return 'Product';
  if (/(finance|invest|m&a|equity|banking|ibd|pe\b)/i.test(r)) return 'Finance';
  if (/(engineer|developer|software|swe|backend|frontend|fullstack)/i.test(r))
    return 'Engineering';
  if (/(data|analyst|analytics)/i.test(r)) return 'Data';
  if (/(design|ux|ui)/i.test(r)) return 'Design';
  if (/(sales|account|business development|bd\b)/i.test(r)) return 'Sales';
  if (/(market|growth|content)/i.test(r)) return 'Marketing';
  return null;
}

const SORT_OPTIONS: { value: ApplicationsSort; label: string }[] = [
  { value: 'recent', label: 'Last activity' },
  { value: 'applied', label: 'Date applied' },
  { value: 'match', label: 'Match score' },
  { value: 'company', label: 'Company name' },
];

const SORT_LABEL: Record<ApplicationsSort, string> = {
  recent: 'Last activity',
  applied: 'Date applied',
  match: 'Match score',
  company: 'Company name',
  stage: 'Stage',
};

export default function TabFilters() {
  const tab = useAppStore((s) => s.applicationsTab);
  const setTab = useAppStore((s) => s.setApplicationsTab);
  const role = useAppStore((s) => s.applicationsRoleFilter);
  const setRole = useAppStore((s) => s.setApplicationsRoleFilter);
  const sort = useAppStore((s) => s.applicationsSort);
  const setSort = useAppStore((s) => s.setApplicationsSort);
  const applications = useAppStore((s) => s.applications);
  const jobs = useAppStore((s) => s.jobs);

  // Derive the role-filter options from the actual jobs the user has
  // applied to. Always include "All roles" first; everything else is
  // bucketed via `familyFor` so we don't end up with 25 dropdown
  // entries for 25 slightly-different role titles. Sort by frequency
  // so the user's most common track sits near the top.
  const roleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of applications) {
      if (a.archived) continue;
      const job = jobs.find((j) => j.id === a.jobId);
      if (!job?.role) continue;
      const fam = familyFor(job.role);
      if (!fam) continue;
      counts.set(fam, (counts.get(fam) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([fam]) => fam);
    return ['All roles', ...sorted];
  }, [applications, jobs]);

  return (
    <div className="applications__filters">
      <div className="applications__tabs" role="tablist" aria-label="Application status">
        {TABS.map((opt) => {
          const isActive = tab === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`applications__tab${isActive ? ' applications__tab--active' : ''}`}
              onClick={() => setTab(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="applications__dropdowns">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="applications__dropdown applications__dropdown--narrow"
            >
              <span>{role}</span>
              <ChevronDown size={16} className="applications__dropdown-icon" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {roleOptions.map((opt) => (
              <DropdownMenuItem key={opt} onSelect={() => setRole(opt)}>
                {opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="applications__dropdown applications__dropdown--wide"
            >
              <span>Sort: {SORT_LABEL[sort]}</span>
              <ChevronDown size={16} className="applications__dropdown-icon" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => setSort(opt.value)}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
