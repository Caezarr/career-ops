import { ChevronRight, Search, Bell } from 'lucide-react';
import '../styles/topbar.css';
import { mockUser } from '../data/mock';

export default function TopBar() {
  return (
    <header className="topbar">
      <nav className="topbar__breadcrumb" aria-label="Breadcrumb">
        <span className="topbar__breadcrumb-item">Dashboard</span>
        <ChevronRight size={14} className="topbar__breadcrumb-sep" />
        <span className="topbar__breadcrumb-item topbar__breadcrumb-item--current">
          Career Intelligence Hub
        </span>
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
