// Mock data for the Applications page.
// All static — no backend.

export type ApplicationStage =
  | 'Interview'
  | 'Phone screen'
  | 'Applied'
  | 'Offer'
  | 'Rejected';

export interface Application {
  id: string;
  company: string;
  role: string;
  stage: ApplicationStage;
  appliedDate: string; // "Mar 15"
  lastActivity: string; // "2h ago", "Today", "1d ago"
  match: number; // 89
  nextStep: string; // "Review case notes"
}

export const mockApplications: Application[] = [
  {
    id: '1',
    company: 'Stripe',
    role: 'Strategy & Ops',
    stage: 'Interview',
    appliedDate: 'Mar 15',
    lastActivity: '2h ago',
    match: 89,
    nextStep: 'Review case notes',
  },
  {
    id: '2',
    company: 'Goldman Sachs',
    role: 'Associate, IBD',
    stage: 'Phone screen',
    appliedDate: 'Mar 17',
    lastActivity: '4h ago',
    match: 91,
    nextStep: 'Prep 12 questions',
  },
  {
    id: '3',
    company: 'OpenAI',
    role: 'Product Manager',
    stage: 'Applied',
    appliedDate: 'Mar 20',
    lastActivity: '1d ago',
    match: 96,
    nextStep: 'Send follow-up',
  },
  {
    id: '4',
    company: 'Mistral AI',
    role: 'AI Product Lead',
    stage: 'Interview',
    appliedDate: 'Mar 18',
    lastActivity: 'Today',
    match: 94,
    nextStep: 'Mock interview',
  },
  {
    id: '5',
    company: 'Notion',
    role: 'Product Marketing Manager',
    stage: 'Applied',
    appliedDate: 'Mar 12',
    lastActivity: '2d ago',
    match: 84,
    nextStep: 'Tailor CV',
  },
  {
    id: '6',
    company: 'Airtable',
    role: 'Strategy Associate',
    stage: 'Rejected',
    appliedDate: 'Mar 14',
    lastActivity: '3d ago',
    match: 74,
    nextStep: 'Archive',
  },
  {
    id: '7',
    company: 'Qonto',
    role: 'Senior Product Manager',
    stage: 'Offer',
    appliedDate: 'Mar 10',
    lastActivity: 'Today',
    match: 93,
    nextStep: 'Review offer',
  },
];

export type MaterialState = 'uploaded' | 'missing';

export interface ApplicationMaterial {
  type: string;
  name: string;
  uploaded: string;
  state: MaterialState;
}

export type TimelineIcon = 'check' | 'eye' | 'calendar' | 'bell';
export type TimelineState = 'done' | 'upcoming' | 'alert';

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  icon: TimelineIcon;
  state: TimelineState;
}

export interface ApplicationDetail {
  id: string;
  company: string;
  role: string;
  location: string;
  stage: ApplicationStage;
  salary: string;
  workMode: string;
  recruiter: string;
  appliedDate: string;
  materials: ApplicationMaterial[];
  timeline: TimelineEvent[];
  aiNextSteps: string[];
}

export const mockApplicationDetail: ApplicationDetail = {
  id: '1',
  company: 'Stripe',
  role: 'Strategy & Ops',
  location: 'Paris, France',
  stage: 'Interview',
  salary: '€95k - €125k',
  workMode: 'Hybrid (3 days/wk)',
  recruiter: 'Sachs recruiter',
  appliedDate: 'Applied Mar 15, 2024',
  materials: [
    {
      type: 'CV',
      name: 'CV - v3.1.pdf',
      uploaded: 'Uploaded Mar 15',
      state: 'uploaded',
    },
    {
      type: 'Cover letter',
      name: 'Cover letter - Stripe.pdf',
      uploaded: 'Uploaded Mar 15',
      state: 'uploaded',
    },
    {
      type: 'Portfolio',
      name: 'Portfolio / notes',
      uploaded: 'Not added',
      state: 'missing',
    },
  ],
  timeline: [
    {
      id: 't1',
      title: 'Applied',
      date: 'Mar 15, 10:24 AM',
      icon: 'check',
      state: 'done',
    },
    {
      id: 't2',
      title: 'Recruiter viewed profile',
      date: 'Mar 15, 2:18 PM',
      icon: 'eye',
      state: 'done',
    },
    {
      id: 't3',
      title: 'Interview scheduled',
      date: 'Mar 18, 11:00 AM',
      icon: 'calendar',
      state: 'upcoming',
    },
    {
      id: 't4',
      title: 'Reminder: prepare case',
      date: 'Mar 18, 9:00 AM',
      icon: 'bell',
      state: 'alert',
    },
  ],
  aiNextSteps: [
    'Review likely business case topics',
    'Refine 90-second pitch',
    'Research Stripe expansion narrative',
  ],
};

// mockApplicationStats lived here as fixed copy ("28 total / 9 in
// review / …"). The Applications page now computes those counters
// live from the slice, so the export was dropped. The trend
// direction type remains in StatCard.tsx where it actually belongs.
