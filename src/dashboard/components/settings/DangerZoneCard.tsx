import { AlertTriangle } from 'lucide-react';

export default function DangerZoneCard() {
  return (
    <section
      className="settings-card settings-danger"
      aria-labelledby="settings-danger-title"
    >
      <div className="settings-danger__left">
        <div className="settings-danger__icon" aria-hidden="true">
          <AlertTriangle size={20} strokeWidth={2} />
        </div>
        <div className="settings-danger__text">
          <h2 id="settings-danger-title" className="settings-danger__title">
            Danger zone
          </h2>
          <p className="settings-danger__copy">
            Permanently delete your account and all of your data. This action cannot be undone.
          </p>
        </div>
      </div>
      <button type="button" className="settings-danger__btn">
        Delete account
      </button>
    </section>
  );
}
