import { Fragment, useRef } from 'react';
import { ChevronRight, Search, Bell } from 'lucide-react';
import clsx from 'clsx';
import '../styles/topbar.css';
import { useNavigation, type Page } from '../navigation';
import { useAppStore } from '../store';
import NotificationsPanel from './notifications/NotificationsPanel';
import UserMenu from './menus/UserMenu';
import UserAvatar from './UserAvatar';

interface BreadcrumbSpec {
  parts: string[];
}

const BREADCRUMBS: Record<Page, BreadcrumbSpec> = {
  dashboard: { parts: ['Dashboard', 'Career Intelligence Hub'] },
  jobs: { parts: ['Jobs'] },
  applications: { parts: ['Applications'] },
  cv: { parts: ['CV'] },
  prep: { parts: ['Prep'] },
  copilot: { parts: ['Copilot'] },
  settings: { parts: ['Settings'] },
};

export default function TopBar() {
  const { page } = useNavigation();
  const { parts } = BREADCRUMBS[page];

  const user = useAppStore((s) => s.user);
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const notificationsOpen = useAppStore((s) => s.notificationsPanelOpen);
  const toggleNotifications = useAppStore((s) => s.toggleNotificationsPanel);
  const setNotificationsOpen = useAppStore((s) => s.setNotificationsPanelOpen);
  const openCommandPalette = useAppStore((s) => s.setCommandPaletteOpen);

  const bellRef = useRef<HTMLButtonElement | null>(null);

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
        <button
          type="button"
          className="topbar__search-inner"
          aria-label="Open command palette"
          onClick={() => openCommandPalette(true)}
        >
          <Search size={16} className="topbar__search-icon" />
          <span
            className="topbar__search-input"
            style={{ color: 'var(--text-3)', textAlign: 'left' }}
          >
            Search anything...
          </span>
          <span className="topbar__search-kbd">⌘K</span>
        </button>
      </div>

      <div className="topbar__actions">
        <button
          ref={bellRef}
          type="button"
          className="topbar__bell"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
          aria-haspopup="dialog"
          aria-expanded={notificationsOpen}
          onClick={() => toggleNotifications()}
        >
          <Bell size={18} strokeWidth={2} />
          {unreadCount > 0 && (
            <span
              className={clsx('topbar__bell-dot', 'topbar__bell-dot--unread')}
              aria-hidden="true"
            />
          )}
        </button>
        <NotificationsPanel
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          anchorRef={bellRef}
        />
        <UserMenu
          align="end"
          side="bottom"
          trigger={
            <button
              type="button"
              className="topbar__avatar"
              aria-label={`${user.name} menu`}
              style={{ background: 'transparent', padding: 0 }}
            >
              <UserAvatar size={40} />
            </button>
          }
        />
      </div>
    </header>
  );
}
