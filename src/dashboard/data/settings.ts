// Mock data for the Settings page — no backend.

export interface SettingsProfile {
  name: string;
  email: string;
  plan: string;
  timezone: string;
  language: string;
  location: string;
}

export interface IntegrationData {
  id: string;
  name: string;
  model: string;
  connected: boolean;
  brandColor: string;
  brandBg: string;
  letter: string;
}

export type PreferenceIcon =
  | 'keyboard'
  | 'power'
  | 'mail'
  | 'activity'
  | 'sparkles';

export interface PreferenceData {
  id: string;
  icon: PreferenceIcon;
  title: string;
  subtitle: string;
  enabled: boolean;
}


export const mockSettingsProfile: SettingsProfile = {
  name: 'Gabriel Rance',
  email: 'gabriel.rance@example.com',
  plan: 'Pro',
  timezone: '(GMT+01:00) Paris',
  language: 'English (US)',
  location: 'Paris, France',
};

export const mockIntegrations: IntegrationData[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    model: 'Claude Sonnet 4.5',
    connected: true,
    brandColor: '#cc785c',
    brandBg: '#fde7d8',
    letter: 'A',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    model: 'GPT-4o',
    connected: true,
    brandColor: '#10a37f',
    brandBg: '#e6f4ef',
    letter: '◎',
  },
  {
    id: 'assemblyai',
    name: 'AssemblyAI',
    model: 'Speech-to-text',
    connected: true,
    brandColor: '#5e3eff',
    brandBg: '#ece8ff',
    letter: '▲',
  },
];

export const mockPreferences: PreferenceData[] = [
  {
    id: 'kbd',
    icon: 'keyboard',
    title: 'Keyboard shortcuts',
    subtitle: 'Enable global keyboard shortcuts',
    enabled: true,
  },
  {
    id: 'login',
    icon: 'power',
    title: 'Start on login',
    subtitle: 'Open Dashboard when you log in',
    enabled: true,
  },
  {
    id: 'email',
    icon: 'mail',
    title: 'Email notifications',
    subtitle: 'Receive important updates via email',
    enabled: true,
  },
  {
    id: 'insights',
    icon: 'activity',
    title: 'Weekly insights',
    subtitle: 'Get weekly career insights and tips',
    enabled: true,
  },
  {
    id: 'ai',
    icon: 'sparkles',
    title: 'AI activity summaries',
    subtitle: 'Receive summaries of your AI interactions',
    enabled: true,
  },
];

// mockBilling was removed — the BillingCard now reads live data
// from the billing slice (current plan + Stripe-shaped fields) and
// the local-usage hook. The BillingData / UsageStat shapes died
// with it.
