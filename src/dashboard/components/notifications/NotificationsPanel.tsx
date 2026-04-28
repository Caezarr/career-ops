import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  BellRing,
  Briefcase,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { resolvePortalRoot } from "../../primitives/portal";
import { useAppStore, type Notification, type NotificationType } from "../../store";
import { useNavigation } from "../../navigation";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

const ICON_MAP: Record<NotificationType, typeof Bell> = {
  interview: BellRing,
  application: Briefcase,
  insight: Sparkles,
  system: CheckCircle2,
};

const ACCENT_MAP: Record<NotificationType, string> = {
  interview: "var(--orange)",
  application: "var(--indigo)",
  insight: "var(--purple)",
  system: "var(--green)",
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export default function NotificationsPanel({
  open,
  onClose,
  anchorRef,
}: NotificationsPanelProps) {
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const { navigate } = useNavigation();

  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const right = window.innerWidth - rect.right;
    setPos({ top: rect.bottom + 8, right });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  const portal = resolvePortalRoot();

  const handleClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link.page);
    onClose();
  };

  return createPortal(
    <div
      ref={panelRef}
      className="notifications-panel"
      style={{ top: pos?.top ?? -9999, right: pos?.right ?? 16 }}
      role="dialog"
      aria-label="Notifications"
    >
      <div className="notifications-panel__header">
        <span className="notifications-panel__title">Notifications</span>
        <button
          type="button"
          className="notifications-panel__action"
          onClick={() => markAllRead()}
        >
          Mark all read
        </button>
      </div>
      <div className="notifications-panel__list">
        {notifications.length === 0 ? (
          <div className="notifications-panel__empty">You're all caught up.</div>
        ) : (
          notifications.slice(0, 8).map((n) => {
            const Icon = ICON_MAP[n.type];
            return (
              <button
                type="button"
                key={n.id}
                className={clsx(
                  "notifications-panel__item",
                  !n.read && "notifications-panel__item--unread",
                )}
                onClick={() => handleClick(n)}
              >
                <span
                  className="notifications-panel__icon"
                  style={{ color: ACCENT_MAP[n.type], background: "var(--bg-soft)" }}
                >
                  <Icon size={14} />
                </span>
                <span className="notifications-panel__body">
                  <span className="notifications-panel__row">
                    <span className="notifications-panel__item-title">{n.title}</span>
                    {!n.read && <span className="notifications-panel__dot" aria-hidden="true" />}
                  </span>
                  <span className="notifications-panel__description">{n.description}</span>
                  <span className="notifications-panel__time">{relativeTime(n.timestamp)}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
      <div className="notifications-panel__footer">
        <button type="button" className="notifications-panel__view-all">
          View all
        </button>
      </div>
    </div>,
    portal,
  );
}
