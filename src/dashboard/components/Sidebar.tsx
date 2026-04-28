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

interface NavEntry {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  active?: boolean;
}

const topNav: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'cv', label: 'CV', icon: IdCard },
  { id: 'prep', label: 'Prep', icon: Zap },
  { id: 'copilot', label: 'Copilot', icon: Sparkles },
];

const bottomNav: NavEntry[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
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
    // Other nav items are no-op for now (pages not built yet).
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">Career</div>

      <nav className="sidebar__nav" aria-label="Primary">
        {topNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar__nav-item${item.active ? ' sidebar__nav-item--active' : ''}`}
              aria-current={item.active ? 'page' : undefined}
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
          return (
            <button
              key={item.id}
              type="button"
              className="sidebar__nav-item"
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
