// Mock data for the in-dashboard Copilot page.
// All static — no backend.

export const mockInterviewInProgress = {
  title: 'Interview in progress',
  company: 'Goldman Sachs',
  role: 'VP IBD Interview',
  startedAgo: '12:47 ago',
};

export const mockNextUp = {
  category: 'Technical case practice',
  topic: 'Market sizing – European fintech',
  inMinutes: 45,
  durationMinutes: 60,
};

export const mockPrepStreak = {
  days: 12,
  // M T W T F S S
  weekDots: [true, true, true, true, false, false, false],
};

export type ActivityIconKey = 'check' | 'mic' | 'file';

export interface ActivityItemData {
  id: string;
  iconKey: ActivityIconKey;
  title: string;
  subtitle: string;
  timestamp: string;
}

export const mockRecentActivity: ActivityItemData[] = [
  {
    id: 'a1',
    iconKey: 'check',
    title: 'Mock interview completed',
    subtitle: 'Behavioral · Technical',
    timestamp: 'Today, 9:41 AM',
  },
  {
    id: 'a2',
    iconKey: 'mic',
    title: 'AI feedback received',
    subtitle: 'Goldman Sachs · VP IBD',
    timestamp: 'Today, 9:15 AM',
  },
  {
    id: 'a3',
    iconKey: 'file',
    title: 'Resume tailored',
    subtitle: 'VP IBD · Goldman Sachs',
    timestamp: 'Yesterday, 6:22 PM',
  },
];

export type TranscriptFrom = 'ai' | 'user';

export interface TranscriptItem {
  id: string;
  from: TranscriptFrom;
  name: string;
  text: string;
  timestamp: string;
}

export type ScoreColor = 'green' | 'orange';
export type ScoreIcon = 'check' | 'star';

export interface ScoreChipData {
  label: string;
  color: ScoreColor;
  icon: ScoreIcon;
}

export type ConfigIconKey = 'key' | 'mic' | 'volume' | 'user';

export interface ConfigItemData {
  id: string;
  iconKey: ConfigIconKey;
  label: string;
  value: string;
  showStatusDot?: boolean;
}

export const mockCopilotSession = {
  company: 'Goldman Sachs',
  role: 'VP IBD Interview',
  timer: '00:12:47',
  status: 'Listening' as const,
  transcript: [
    {
      id: 't1',
      from: 'ai' as const,
      name: 'AI interviewer',
      text: 'Walk me through a recent deal you worked on.',
      timestamp: '00:12:05',
    },
    {
      id: 't2',
      from: 'user' as const,
      name: 'You',
      text: 'Sure. I worked on the sale of a software business to a strategic buyer.…',
      timestamp: '00:12:18',
    },
    {
      id: 't3',
      from: 'ai' as const,
      name: 'AI interviewer',
      text: 'What was your specific role in the process?',
      timestamp: '00:12:31',
    },
  ] as TranscriptItem[],
  answer:
    'Lead with the deal size, your role, the core challenge, and the measurable outcome. Then explain how you managed the process end to end.',
  scores: [
    { label: 'Structure', color: 'green', icon: 'check' },
    { label: 'Conciseness', color: 'green', icon: 'check' },
    { label: 'Evidence', color: 'green', icon: 'check' },
    { label: 'Memorability', color: 'orange', icon: 'star' },
  ] as ScoreChipData[],
  model: 'Claude Sonnet 4.5',
  confidence: 'High confidence',
  config: [
    {
      id: 'api',
      iconKey: 'key',
      label: 'API keys',
      value: 'OpenAI · Active',
      showStatusDot: true,
    },
    {
      id: 'in',
      iconKey: 'mic',
      label: 'Audio input',
      value: 'MacBook Pro Microphone',
    },
    {
      id: 'out',
      iconKey: 'volume',
      label: 'Audio output',
      value: 'MacBook Pro Speakers',
    },
    {
      id: 'profile',
      iconKey: 'user',
      label: 'Profile',
      value: 'VP IBD · Finance',
    },
  ] as ConfigItemData[],
};
