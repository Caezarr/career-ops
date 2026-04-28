// Mock data for the Jobs page — all static, no backend.

export interface Job {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string;
  match: number;
  postedAgo: string;
  verified?: boolean;
}

export const mockJobs: Job[] = [
  {
    id: '1',
    role: 'Senior Product Manager',
    company: 'Qonto',
    location: 'Paris, France',
    salary: '€90k - €120k',
    match: 94,
    postedAgo: '2h ago',
    verified: true,
  },
  {
    id: '2',
    role: 'Senior Product Manager',
    company: 'Alan',
    location: 'Paris, France',
    salary: '€85k - €110k',
    match: 92,
    postedAgo: '4h ago',
  },
  {
    id: '3',
    role: 'Product Manager',
    company: 'Doctolib',
    location: 'Paris, France',
    salary: '€80k - €105k',
    match: 90,
    postedAgo: '6h ago',
  },
  {
    id: '4',
    role: 'Senior Product Manager',
    company: 'Pennylane',
    location: 'Paris, France',
    salary: '€85k - €115k',
    match: 88,
    postedAgo: '8h ago',
  },
  {
    id: '5',
    role: 'Product Manager',
    company: 'Mirakl',
    location: 'Paris, France',
    salary: '€80k - €100k',
    match: 86,
    postedAgo: '12h ago',
  },
  {
    id: '6',
    role: 'Senior Product Manager',
    company: 'Stripe',
    location: 'Paris, France',
    salary: '€100k - €130k',
    match: 85,
    postedAgo: '15h ago',
  },
  {
    id: '7',
    role: 'Product Manager',
    company: 'OpenAI',
    location: 'Paris, France',
    salary: '€110k - €140k',
    match: 84,
    postedAgo: '1d ago',
  },
  {
    id: '8',
    role: 'Product Manager',
    company: 'Mistral AI',
    location: 'Paris, France',
    salary: '€95k - €125k',
    match: 82,
    postedAgo: '1d ago',
  },
];

export type StatPillVariant = 'neutral' | 'indigo' | 'purple';

export interface JobStat {
  label: string;
  variant: StatPillVariant;
}

export interface SelectedJob extends Job {
  rating: number;
  reviews: number;
  workMode: string;
  type: string;
  salaryDetail: string;
  stats: JobStat[];
  about: string[];
  whyYouMatch: string[];
  aiSummary: string;
}

export const mockSelectedJob: SelectedJob = {
  ...mockJobs[0],
  rating: 4.6,
  reviews: 430,
  workMode: 'Hybrid (3 days/wk)',
  type: 'Full-time',
  salaryDetail: '€90k - €120k OTE',
  stats: [
    { label: 'Series C', variant: 'neutral' },
    { label: 'Fintech', variant: 'indigo' },
    { label: 'B2B SaaS', variant: 'purple' },
    { label: '300-500 employees', variant: 'neutral' },
  ],
  about: [
    "Qonto is Europe's leading business finance solution, helping SMEs and startups manage banking, payments, expense management, and accounting in one place.",
    'We operate in 8 countries and are building the financial backbone for businesses across Europe.',
    'Backed by investors including TCV, Accel, Alven, and Tencent.',
  ],
  whyYouMatch: [
    'Strong PM background in B2B SaaS products',
    'Proven track record of 0→1 and scaling products',
    'Experience in fintech or financial services',
    'Comfortable in international, cross-functional teams',
  ],
  aiSummary:
    'This role is an excellent fit based on your product leadership experience and fintech exposure. You match 94% of the must-have criteria. Qonto is scaling rapidly in Europe and investing heavily in product innovation—this role offers high impact and growth potential.',
};

export const mockFilters = [
  { label: 'Location', value: 'Paris, France' },
  { label: 'Salary', value: '€80k - €120k' },
  { label: 'Seniority', value: 'Senior' },
  { label: 'Sector', value: 'Fintech, Health' },
  { label: 'Company stage', value: 'Series B+' },
  { label: 'Remote', value: 'Hybrid + Remote' },
];
