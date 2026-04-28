import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import SettingsNav from '../components/settings/SettingsNav';
import ProfileCard from '../components/settings/ProfileCard';
import IntegrationsCard from '../components/settings/IntegrationsCard';
import SecurityAccessCard from '../components/settings/SecurityAccessCard';
import PreferencesCard from '../components/settings/PreferencesCard';
import BillingCard from '../components/settings/BillingCard';
import DangerZoneCard from '../components/settings/DangerZoneCard';

export default function Settings() {
  return (
    <div className="dashboard dashboard--settings">
      <Sidebar />

      <main className="dashboard__main">
        <TopBar />
        <div className="dashboard__main-scroll">
          <div className="settings-page">
            <header className="settings-page__header">
              <h1>Settings</h1>
              <p>Manage your account, integrations, and preferences.</p>
            </header>

            <div className="settings-grid">
              <SettingsNav />
              <ProfileCard />
              <IntegrationsCard />
              <SecurityAccessCard />
              <PreferencesCard />
              <BillingCard />
              <DangerZoneCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
