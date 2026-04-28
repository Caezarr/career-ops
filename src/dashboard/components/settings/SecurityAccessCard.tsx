import { Lock, ShieldCheck, Monitor } from 'lucide-react';
import SecurityItem from './SecurityItem';
import { mockSecurity } from '../../data/settings';

export default function SecurityAccessCard() {
  return (
    <section className="settings-card settings-security" aria-labelledby="settings-security-title">
      <h2 id="settings-security-title" className="settings-card__title">
        Security &amp; access
      </h2>

      <div className="settings-security__grid">
        <SecurityItem
          iconTone="indigo"
          icon={<Lock size={18} strokeWidth={2} />}
          title="Password"
          meta={
            <span className="settings-security-item__sub">
              Last changed {mockSecurity.passwordChangedAgo}
            </span>
          }
          actionLabel="Change password"
        />
        <SecurityItem
          iconTone="green"
          icon={<ShieldCheck size={18} strokeWidth={2} />}
          title="Two-factor authentication"
          meta={
            <span className="settings-pill settings-pill--green">
              {mockSecurity.twoFactor.enabled ? 'Enabled' : 'Disabled'}
            </span>
          }
          actionLabel="Manage 2FA"
        />
        <SecurityItem
          iconTone="indigo"
          icon={<Monitor size={18} strokeWidth={2} />}
          title="Active sessions"
          meta={
            <span className="settings-security-item__sub">
              {mockSecurity.activeSessions} active sessions
            </span>
          }
          actionLabel="Manage sessions"
        />
      </div>
    </section>
  );
}
