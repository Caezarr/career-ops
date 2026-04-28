// Mock data for the Career OS Dashboard
// All static — no backend.

export type StatTrend = 'up' | 'down';

export interface StatItem {
  id: string;
  label: string;
  value: string;
  trendDirection: StatTrend;
  trendText: string;
  iconKey: 'send' | 'users' | 'trending' | 'clock';
  iconBg: string; // CSS var name (without var())
}

export interface PipelineCardData {
  id: string;
  company: string;
  role: string;
  date: string;
  match: number;
  ongoing?: boolean;
}

export interface PipelineColumnData {
  id: string;
  title: string;
  cards: PipelineCardData[];
}

export type TaskUrgency = 'indigo' | 'green' | 'orange' | 'purple';

export interface TaskItemData {
  id: string;
  title: string;
  subtitle: string;
  iconKey: 'mail' | 'calendar' | 'fileText' | 'listChecks';
  color: TaskUrgency;
}

export const mockUser = {
  name: 'Gabriel Rance',
  plan: 'Pro',
  initials: 'GR',
};

export const mockGreeting = {
  greeting: 'Good morning, Gabriel',
  date: 'Tuesday, March 18',
};

export const mockStats: StatItem[] = [
  {
    id: 'active',
    label: 'Active applications',
    value: '12',
    trendDirection: 'up',
    trendText: '2 from last week',
    iconKey: 'send',
    iconBg: '--indigo',
  },
  {
    id: 'interviews',
    label: 'Interviews this week',
    value: '3',
    trendDirection: 'up',
    trendText: '1 from last week',
    iconKey: 'users',
    iconBg: '--purple',
  },
  {
    id: 'response',
    label: 'Response rate',
    value: '34%',
    trendDirection: 'up',
    trendText: '6pp from last week',
    iconKey: 'trending',
    iconBg: '--blue',
  },
  {
    id: 'reply',
    label: 'Avg. time to reply',
    value: '4.2 days',
    trendDirection: 'down',
    trendText: '-0.6 days from last week',
    iconKey: 'clock',
    iconBg: '--green',
  },
];

export const mockPipeline: PipelineColumnData[] = [
  {
    id: 'sourced',
    title: 'Sourced',
    cards: [
      { id: 's1', company: 'BCG', role: 'Consultant', date: 'Mar 16', match: 87 },
      { id: 's2', company: 'Amplitude', role: 'Product Manager', date: 'Mar 15', match: 78 },
      { id: 's3', company: 'Airtable', role: 'Strategy Associate', date: 'Mar 14', match: 74 },
    ],
  },
  {
    id: 'applied',
    title: 'Applied',
    cards: [
      { id: 'a1', company: 'OpenAI', role: 'Product Manager', date: 'Mar 14', match: 96 },
      { id: 'a2', company: 'Stripe', role: 'Strategy & Ops', date: 'Mar 13', match: 89 },
      { id: 'a3', company: 'Notion', role: 'Product Marketing Manager', date: 'Mar 12', match: 84 },
    ],
  },
  {
    id: 'phone',
    title: 'Phone Screen',
    cards: [
      { id: 'p1', company: 'Goldman Sachs', role: 'Associate, IBD', date: 'Mar 17', match: 91 },
      { id: 'p2', company: 'Mistral AI', role: 'AI Product Lead', date: 'Mar 16', match: 94 },
    ],
  },
  {
    id: 'interview',
    title: 'Interview',
    cards: [
      { id: 'i1', company: 'OpenAI', role: 'Product Manager', date: 'Mar 20', match: 96, ongoing: true },
      { id: 'i2', company: 'Mistral AI', role: 'AI Product Lead', date: 'Mar 18', match: 94 },
    ],
  },
  {
    id: 'offer',
    title: 'Offer',
    cards: [
      { id: 'o1', company: 'Stripe', role: 'Strategy & Ops', date: 'Mar 15', match: 89 },
    ],
  },
];

export const mockTasks: TaskItemData[] = [
  {
    id: 't1',
    title: 'Follow up with Goldman Sachs recruiter',
    subtitle: 'Due in 1 hour',
    iconKey: 'mail',
    color: 'indigo',
  },
  {
    id: 't2',
    title: 'Prepare for Mistral interview',
    subtitle: 'Interview in 4 hours',
    iconKey: 'calendar',
    color: 'purple',
  },
  {
    id: 't3',
    title: 'Tailor CV for Stripe Strategy & Ops',
    subtitle: 'ATS score target 90%',
    iconKey: 'fileText',
    color: 'green',
  },
  {
    id: 't4',
    title: 'Review 12 behavioral questions',
    subtitle: 'Prep block 30 min',
    iconKey: 'listChecks',
    color: 'orange',
  },
];

export const mockInsight = {
  interviewsThisWeek: 3,
  qualityImprovement: 18,
};

// Brand color map for company avatars.
// Returns { bg, fg, label } where label is the short text shown.
export interface CompanyBrand {
  bg: string;
  fg: string;
  label: string;
  border?: string;
}

export const companyBrand = (company: string): CompanyBrand => {
  const map: Record<string, CompanyBrand> = {
    BCG: { bg: '#0a4f3a', fg: '#ffffff', label: 'BCG' },
    OpenAI: { bg: '#0f172a', fg: '#ffffff', label: 'OAI' },
    Stripe: { bg: '#635bff', fg: '#ffffff', label: 'S' },
    'Goldman Sachs': { bg: '#1f4ea1', fg: '#ffffff', label: 'GS' },
    'Mistral AI': { bg: '#f97316', fg: '#ffffff', label: 'M' },
    Amplitude: { bg: '#1e6cf2', fg: '#ffffff', label: 'A' },
    Airtable: { bg: '#0f172a', fg: '#ffd166', label: 'AT' },
    Notion: { bg: '#ffffff', fg: '#0f172a', label: 'N', border: '#0f172a' },
    Qonto: { bg: '#0a0a0a', fg: '#ffffff', label: 'Q' },
    Alan: { bg: '#7c3aed', fg: '#ffffff', label: 'A' },
    Doctolib: { bg: '#0084ff', fg: '#ffffff', label: 'd' },
    Pennylane: { bg: '#10b981', fg: '#ffffff', label: 'P' },
    Mirakl: { bg: '#1e3a8a', fg: '#ffffff', label: 'M' },
  };
  return map[company] ?? { bg: '#e2e8f0', fg: '#0f172a', label: company.charAt(0) };
};
