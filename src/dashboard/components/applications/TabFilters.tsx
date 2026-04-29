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

const ROLE_OPTIONS = [
  'All roles',
  'Product',
  'Strategy',
  'Finance',
  'Engineering',
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
            {ROLE_OPTIONS.map((opt) => (
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
