import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import SettingsNav from '../components/settings/SettingsNav';
import ProfileCard from '../components/settings/ProfileCard';
import IntegrationsCard from '../components/settings/IntegrationsCard';
import JobSourcesCard from '../components/settings/JobSourcesCard';
import PreferencesCard from '../components/settings/PreferencesCard';
import AudioSettingsCard from '../components/settings/AudioSettingsCard';
import AppearanceSettingsCard from '../components/settings/AppearanceSettingsCard';
import NotificationsSettingsCard from '../components/settings/NotificationsSettingsCard';
import BillingCard from '../components/settings/BillingCard';
import BillingTab from '../components/settings/BillingTab';
import DangerZoneCard from '../components/settings/DangerZoneCard';
import FeedbackCard from '../components/settings/FeedbackCard';
import { useAppStore } from '../store';

/** Title + helper copy for each tab. Keeps the page header self-explanatory
 *  without needing per-card duplication. */
const TAB_META = {
  account: {
    title: 'Account',
    hint: 'Your identity, contact details, and the career narrative every CV draws from.',
  },
  apiKeys: {
    title: 'API Keys & Integrations',
    hint: 'Connect Career OS to the AI providers it calls under the hood.',
  },
  jobSources: {
    title: 'Job sources',
    hint: 'Companies and boards Career OS pulls from when you click Sync all jobs.',
  },
  audio: {
    title: 'Audio',
    hint: 'Microphone and speaker selection for the live Copilot session.',
  },
  appearance: {
    title: 'Appearance',
    hint: 'Theme — applied immediately across the app.',
  },
  notifications: {
    title: 'Notifications',
    hint: 'Choose what nudges Career OS surfaces and through which channel.',
  },
  billing: {
    title: 'Billing & plan',
    hint: 'Your current plan, real usage counters, and account-level actions.',
  },
  feedback: {
    title: 'Feedback',
    hint: "Career OS is in beta — tell us what's broken, missing, or working.",
  },
} as const;

export default function Settings() {
  const tab = useAppStore((s) => s.settingsTab);
  const meta = TAB_META[tab];

  return (
    <div className="dashboard dashboard--settings">
      <Sidebar />
      <TopBar />

      <main className="dashboard__main">
        <div className="dashboard__main-scroll">
          <div className="settings-page">
            <header className="settings-page__header">
              <h1>Settings</h1>
              <p>Manage your account, integrations, and preferences.</p>
            </header>

            <div className="settings-shell">
              <SettingsNav />

              <div className="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`}>
                <header className="settings-panel__header">
                  <h2 className="settings-panel__title">{meta.title}</h2>
                  <p className="settings-panel__hint">{meta.hint}</p>
                </header>

                <div className="settings-panel__body">
                  {tab === 'account' && <ProfileCard />}
                  {tab === 'apiKeys' && <IntegrationsCard />}
                  {tab === 'jobSources' && <JobSourcesCard />}
                  {tab === 'audio' && <AudioSettingsCard />}
                  {tab === 'appearance' && <AppearanceSettingsCard />}
                  {tab === 'notifications' && (
                    <>
                      <NotificationsSettingsCard />
                      <PreferencesCard />
                    </>
                  )}
                  {tab === 'billing' && (
                    <>
                      {/* Post-beta Stripe Checkout entry point. Renders
                          above the legacy Sprint billing card so the
                          subscription state is the first thing the user
                          sees. The Sprint card stays for now while the
                          two pricing models coexist. */}
                      <BillingTab />
                      <BillingCard />
                      <DangerZoneCard />
                    </>
                  )}
                  {tab === 'feedback' && <FeedbackCard />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
