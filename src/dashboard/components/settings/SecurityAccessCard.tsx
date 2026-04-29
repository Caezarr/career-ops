import { useState } from 'react';
import { Lock, ShieldCheck, Monitor } from 'lucide-react';
import SecurityItem from './SecurityItem';
import { mockSecurity } from '../../data/settings';
import ChangePasswordModal from '../shared/ChangePasswordModal';
import Manage2FAModal from '../shared/Manage2FAModal';
import ManageSessionsModal from '../shared/ManageSessionsModal';

export default function SecurityAccessCard() {
  const [pwOpen, setPwOpen] = useState(false);
  const [tfaOpen, setTfaOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

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
          onAction={() => setPwOpen(true)}
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
          onAction={() => setTfaOpen(true)}
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
          onAction={() => setSessionsOpen(true)}
        />
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <Manage2FAModal open={tfaOpen} onClose={() => setTfaOpen(false)} />
      <ManageSessionsModal open={sessionsOpen} onClose={() => setSessionsOpen(false)} />
    </section>
  );
}
