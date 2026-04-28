import { Fragment } from 'react';
import { ChevronRight, Search, Bell } from 'lucide-react';
import '../styles/topbar.css';
import { mockUser } from '../data/mock';
import { useNavigation, type Page } from '../navigation';

interface BreadcrumbSpec {
  parts: string[];
}

const BREADCRUMBS: Record<Page, BreadcrumbSpec> = {
  dashboard: { parts: ['Dashboard', 'Career Intelligence Hub'] },
  jobs: { parts: ['Jobs'] },
  applications: { parts: ['Applications'] },
  cv: { parts: ['CV'] },
  prep: { parts: ['Prep'] },
  settings: { parts: ['Settings'] },
};

export default function TopBar() {
  const { page } = useNavigation();
  const { parts } = BREADCRUMBS[page];

  return (
    <header className="topbar">
      <nav className="topbar__breadcrumb" aria-label="Breadcrumb">
        {parts.map((part, idx) => {
          const isLast = idx === parts.length - 1;
          return (
            <Fragment key={`${part}-${idx}`}>
              <span
                className={
                  'topbar__breadcrumb-item' +
                  (isLast && parts.length > 1 ? ' topbar__breadcrumb-item--current' : '')
                }
              >
                {part}
              </span>
              {!isLast && (
                <ChevronRight size={14} className="topbar__breadcrumb-sep" />
              )}
            </Fragment>
          );
        })}
      </nav>

      <div className="topbar__search">
        <div className="topbar__search-inner" role="search">
          <Search size={16} className="topbar__search-icon" />
          <input
            type="text"
            className="topbar__search-input"
            placeholder="Search anything..."
            aria-label="Search"
          />
          <span className="topbar__search-kbd">⌘K</span>
        </div>
      </div>

      <div className="topbar__actions">
        <button type="button" className="topbar__bell" aria-label="Notifications">
          <Bell size={18} strokeWidth={2} />
          <span className="topbar__bell-dot" aria-hidden="true" />
        </button>
        <div className="topbar__avatar" aria-label={mockUser.name}>
          {mockUser.initials}
        </div>
      </div>
    </header>
  );
}
