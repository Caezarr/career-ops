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
import { useAppStore } from '../store';
import { useNavigation, type Page } from '../navigation';
import UserMenu from './menus/UserMenu';
import UserAvatar from './UserAvatar';

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
  'copilot',
  'settings',
];

function isPage(id: string): id is Page {
  return (PAGE_IDS as ReadonlyArray<string>).includes(id);
}

export default function Sidebar() {
  const { page, navigate } = useNavigation();
  const user = useAppStore((s) => s.user);

  const handleNavClick = (id: string) => {
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

        {/* Flex spacer pushes the bottomNav (Settings) down to sit just
             above the user menu — visually pairing them as the
             "account-area" of the sidebar. */}
        <div className="sidebar__nav-spacer" aria-hidden="true" />

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

      <UserMenu
        align="start"
        side="top"
        trigger={
          <button
            type="button"
            className="sidebar__user"
            aria-label={`${user.name} account menu`}
            style={{ width: '100%' }}
          >
            <UserAvatar size={36} className="sidebar__user-avatar" />
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user.name}</span>
              <span className="sidebar__user-badge">
                {user.plan === 'pro' ? 'Pro' : 'Free'}
              </span>
            </div>
            <ChevronUp size={16} className="sidebar__user-chevron" />
          </button>
        }
      />
    </aside>
  );
}
