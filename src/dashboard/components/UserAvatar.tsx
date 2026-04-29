import { useAppStore } from '../store';

interface UserAvatarProps {
  size?: number;
  className?: string;
  /** Override store user (for ChatBubble that already accepts user-like data). */
  initialsOverride?: string;
  urlOverride?: string;
}

/**
 * Renders the current user's profile photo if `user.avatarUrl` is set,
 * otherwise the initials. Single source of truth for "where the user's
 * face shows up" — Sidebar, TopBar, ProfileCard, transcript bubbles, etc.
 */
export default function UserAvatar({
  size = 36,
  className = '',
  initialsOverride,
  urlOverride,
}: UserAvatarProps) {
  const user = useAppStore((s) => s.user);
  const url = urlOverride ?? user.avatarUrl;
  const initials = initialsOverride ?? user.avatarInitials;

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    background: 'var(--indigo)',
    color: '#ffffff',
    fontSize: Math.max(10, Math.round(size * 0.36)),
    fontWeight: 600,
    letterSpacing: 0.2,
  };

  if (url) {
    return (
      <span className={className} style={style} aria-hidden="true">
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </span>
    );
  }

  return (
    <span className={className} style={style} aria-hidden="true">
      {initials}
    </span>
  );
}
