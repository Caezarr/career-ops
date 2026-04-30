import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../primitives';
import { useAppStore } from '../../store';
import type { ApplicationsTab, ApplicationsSort } from '../../store';
import { ROLE_FAMILIES, familyFor } from './filterUtils';

const TABS: { value: ApplicationsTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'interviews', label: 'Interviews' },
  { value: 'archived', label: 'Archived' },
];

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

  // Always show every known family in the dropdown — users want to
  // see the full set so they can pre-filter even before they have
  // applications in that bucket. Each entry shows a small count if
  // any of the active applications fall into that family. Families
  // with apps surface first (sorted desc by count); the rest follow
  // in the canonical ROLE_FAMILIES order.
  const familyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of applications) {
      if (a.archived) continue;
      const job = jobs.find((j) => j.id === a.jobId);
      const fam = familyFor(job?.role ?? '');
      if (!fam) continue;
      counts.set(fam, (counts.get(fam) ?? 0) + 1);
    }
    return counts;
  }, [applications, jobs]);

  const orderedFamilies = useMemo(() => {
    const withApps = [...familyCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([fam]) => fam);
    const empty = ROLE_FAMILIES.filter((f) => !familyCounts.has(f));
    return [...withApps, ...empty];
  }, [familyCounts]);

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
            <DropdownMenuItem onSelect={() => setRole('All roles')}>
              All roles
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Families</DropdownMenuLabel>
            {orderedFamilies.map((fam) => {
              const n = familyCounts.get(fam) ?? 0;
              return (
                <DropdownMenuItem key={fam} onSelect={() => setRole(fam)}>
                  <span style={{ flex: 1 }}>{fam}</span>
                  {n > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: 'var(--text-3)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {n}
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
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
