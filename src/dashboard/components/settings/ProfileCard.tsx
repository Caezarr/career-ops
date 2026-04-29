import { useEffect, useState } from 'react';
import { Camera, ChevronDown, MapPin } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';
import ChangePhotoModal from '../shared/ChangePhotoModal';

export default function ProfileCard() {
  const toast = useToast();
  const user = useAppStore((s) => s.user);
  const updateUser = useAppStore((s) => s.updateUser);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [timezone, setTimezone] = useState(user.timezone);
  const [language, setLanguage] = useState(user.language);
  const [location, setLocation] = useState(user.location);
  const [photoOpen, setPhotoOpen] = useState(false);

  // Re-sync if the underlying store changes (e.g. another component edits it).
  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setTimezone(user.timezone);
    setLanguage(user.language);
    setLocation(user.location);
  }, [user]);

  const dirty =
    name !== user.name ||
    email !== user.email ||
    timezone !== user.timezone ||
    language !== user.language ||
    location !== user.location;

  function discard() {
    setName(user.name);
    setEmail(user.email);
    setTimezone(user.timezone);
    setLanguage(user.language);
    setLocation(user.location);
  }

  function save() {
    updateUser({ name, email, timezone, language, location });
    toast.success('Profile updated');
  }

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <section className="settings-card settings-profile" aria-labelledby="settings-profile-title">
      <h2 id="settings-profile-title" className="settings-card__title">
        Profile
      </h2>

      <div className="settings-profile__top">
        <div className="settings-profile__identity">
          <div className="settings-profile__avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="settings-profile__identity-text">
            <div className="settings-profile__name">{user.name}</div>
            <div className="settings-profile__email">{user.email}</div>
            <span className="settings-profile__plan">
              {user.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="settings-btn settings-btn--outline"
          onClick={() => setPhotoOpen(true)}
        >
          <Camera size={14} strokeWidth={2} />
          <span>Change photo</span>
        </button>
      </div>

      <div className="settings-profile__form">
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="profile-name">
            Full name
          </label>
          <input
            id="profile-name"
            type="text"
            className="settings-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label className="settings-field__label" htmlFor="profile-email">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            className="settings-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label className="settings-field__label" htmlFor="profile-timezone">
            Timezone
          </label>
          <div className="settings-select-wrap">
            <select
              id="profile-timezone"
              className="settings-input settings-select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="(GMT+01:00) Paris">(GMT+01:00) Paris</option>
              <option value="(GMT+00:00) London">(GMT+00:00) London</option>
              <option value="(GMT-05:00) New York">(GMT-05:00) New York</option>
              <option value="(GMT-08:00) Los Angeles">(GMT-08:00) Los Angeles</option>
            </select>
            <ChevronDown size={16} className="settings-select__chevron" />
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-field__label" htmlFor="profile-language">
            Language
          </label>
          <div className="settings-select-wrap">
            <select
              id="profile-language"
              className="settings-input settings-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="English (US)">English (US)</option>
              <option value="English (UK)">English (UK)</option>
              <option value="Français">Français</option>
              <option value="Deutsch">Deutsch</option>
            </select>
            <ChevronDown size={16} className="settings-select__chevron" />
          </div>
        </div>

        <div className="settings-field settings-field--full">
          <label className="settings-field__label" htmlFor="profile-location">
            Location
          </label>
          <div className="settings-input-wrap">
            <input
              id="profile-location"
              type="text"
              className="settings-input settings-input--with-icon"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <MapPin size={16} className="settings-input__icon" />
          </div>
        </div>

        <div className="settings-profile__form-actions">
          <button
            type="button"
            className="settings-btn settings-btn--outline"
            disabled={!dirty}
            onClick={discard}
          >
            Discard
          </button>
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            disabled={!dirty}
            onClick={save}
          >
            Save changes
          </button>
        </div>
      </div>

      <ChangePhotoModal
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        initials={initials}
      />
    </section>
  );
}
