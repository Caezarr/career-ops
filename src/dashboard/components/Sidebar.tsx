import {
  LayoutDashboard,
  Briefcase,
  FileText,
  IdCard,
  Zap,
  Sparkles,
  Settings,
  ChevronUp,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { mockUser } from '../data/mock';
import { useNavigation, type Page } from '../navigation';

interface NavEntry {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const topNav: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'cv', label: 'CV', icon: IdCard },
  { id: 'prep', label: 'Prep', icon: Zap },
  { id: 'copilot', label: 'Copilot', icon: Sparkles },
];

const bottomNav: NavEntry[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
];

const PAGE_IDS: ReadonlyArray<Page> = [
  'dashboard',
  'jobs',
  'applications',
  'cv',
  'prep',
  'settings',
];

function isPage(id: string): id is Page {
  return (PAGE_IDS as ReadonlyArray<string>).includes(id);
}

export default function Sidebar() {
  const { page, navigate } = useNavigation();

  const handleNavClick = async (id: string) => {
    if (id === 'copilot') {
      try {
        await invoke('show_copilot_window');
      } catch (e) {
        // Best-effort — surface to console; other nav items are no-op.
        console.warn('show_copilot_window failed:', e);
      }
      return;
    }
    if (isPage(id)) {
      navigate(id);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">Career</div>

      <nav className="sidebar__nav" aria-label="Primary">
        {topNav.map((item) => {
          const Icon = item.icon;
          const active = isPage(item.id) && page === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar__nav-item${active ? ' sidebar__nav-item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => handleNavClick(item.id)}
            >
              <Icon size={18} strokeWidth={2} className="sidebar__nav-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="sidebar__nav-divider" />

        {bottomNav.map((item) => {
          const Icon = item.icon;
          const active = isPage(item.id) && page === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar__nav-item${active ? ' sidebar__nav-item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => handleNavClick(item.id)}
            >
              <Icon size={18} strokeWidth={2} className="sidebar__nav-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar__user">
        <div className="sidebar__user-avatar">
          {mockUser.initials}
        </div>
        <div className="sidebar__user-info">
          <span className="sidebar__user-name">{mockUser.name}</span>
          <span className="sidebar__user-badge">{mockUser.plan}</span>
        </div>
        <ChevronUp size={16} className="sidebar__user-chevron" />
      </div>
    </aside>
  );
}
