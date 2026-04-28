// Mock data for the CV page.
// All static — no backend.

export interface CVVariant {
  id: string;
  name: string;
  lastEdited: string;
  fileType: 'PDF';
  roleFocus: string;
  atsScore: number;
}

export const mockCVVariants: CVVariant[] = [
  {
    id: '1',
    name: 'Consulting CV',
    lastEdited: 'Today at 9:41 AM',
    fileType: 'PDF',
    roleFocus: 'Consulting',
    atsScore: 89,
  },
  {
    id: '2',
    name: 'Product CV',
    lastEdited: 'May 14, 2024',
    fileType: 'PDF',
    roleFocus: 'Product Management',
    atsScore: 78,
  },
  {
    id: '3',
    name: 'Finance CV',
    lastEdited: 'May 8, 2024',
    fileType: 'PDF',
    roleFocus: 'Finance / FP&A',
    atsScore: 82,
  },
  {
    id: '4',
    name: 'General CV',
    lastEdited: 'Apr 30, 2024',
    fileType: 'PDF',
    roleFocus: 'General',
    atsScore: 74,
  },
];

export type StatTrendDirection = 'up' | 'down' | 'none';

export interface CVStat {
  id: string;
  label: string;
  value: string;
  trend: { value: string; direction: StatTrendDirection };
  iconKey: 'fileText' | 'trending' | 'calendar' | 'clock';
  iconBg: string; // CSS variable name (without var())
}

export const mockCVStats: CVStat[] = [
  {
    id: 'variants',
    label: 'CV variants',
    value: '4',
    trend: { value: '1 from last month', direction: 'up' },
    iconKey: 'fileText',
    iconBg: '--purple',
  },
  {
    id: 'atsScore',
    label: 'Average ATS score',
    value: '84%',
    trend: { value: '6% from last month', direction: 'up' },
    iconKey: 'trending',
    iconBg: '--green',
  },
  {
    id: 'rolesTailored',
    label: 'Roles tailored this month',
    value: '17',
    trend: { value: '4 from last month', direction: 'up' },
    iconKey: 'calendar',
    iconBg: '--purple',
  },
  {
    id: 'lastOptim',
    label: 'Last optimization',
    value: '2h ago',
    trend: { value: 'Today at 9:41 AM', direction: 'none' },
    iconKey: 'clock',
    iconBg: '--orange',
  },
];

export interface TailoringData {
  targetRole: string;
  baseCV: string;
  beforeMatch: number;
  afterMatch: number;
  missingKeywords: string[];
  suggestedEdits: string[];
  removeReduce: string[];
  addStrengthen: string[];
}

export const mockTailoring: TailoringData = {
  targetRole: 'Strategy Associate · Bain & Company',
  baseCV: 'Consulting CV',
  beforeMatch: 61,
  afterMatch: 89,
  missingKeywords: ['stakeholder management', 'market sizing', 'executive communication'],
  suggestedEdits: [
    'Quantify deal impact with % improvement or $ value.',
    'Add a stakeholder management example with outcome.',
    'Include a market sizing framework or sizing example.',
  ],
  removeReduce: [
    'Responsible for supporting analyses and research',
    'Worked on various projects across different industries',
    'Assisted in developing slides and presentations',
  ],
  addStrengthen: [
    'Led analysis that improved forecast accuracy by 18%',
    'Managed stakeholders across C-suite and VP level',
    'Conducted market sizing for $2B addressable opportunity',
  ],
};

export interface CVPreviewExperience {
  role: string;
  company: string;
  location: string;
  period: string;
  bullets: string[];
}

export interface CVPreviewEducation {
  degree: string;
  school: string;
  year: string;
}

export interface CVPreviewData {
  name: string;
  title: string;
  contact: string;
  summary: string;
  experience: CVPreviewExperience[];
  education: CVPreviewEducation[];
}

export const mockCVPreview: CVPreviewData = {
  name: 'GABRIEL RANCE',
  title: 'Consultant',
  contact: 'gabrielrance@email.com    +33 6 12 34 56 78    Paris, France    LinkedIn',
  summary:
    'Consultant with 3+ years of experience in strategy and transactions. Proven track record of solving complex business problems and delivering measurable impact.',
  experience: [
    {
      role: 'Consultant, Strategy & Operations',
      company: 'Monitor Deloitte',
      location: 'Paris, France',
      period: '2022 - Present',
      bullets: [
        'Led commercial due diligence for 5+ transactions with deal values up to €150M.',
        'Developed growth strategies that improved EBITDA by 12-18%.',
        'Built financial models and conducted market sizing for new market entry.',
      ],
    },
    {
      role: 'Business Analyst',
      company: 'Roland Berger',
      location: 'Paris, France',
      period: '2020 - 2022',
      bullets: [
        'Supported strategy projects across retail, industrials, and TMT sectors.',
        'Conducted competitor benchmarking and customer insights analysis.',
        'Prepared executive presentations for C-level stakeholders.',
      ],
    },
  ],
  education: [
    { degree: 'MSc in Management', school: 'HEC Paris', year: '2020' },
    { degree: 'BSc in Economics', school: 'University of Manchester', year: '2018' },
  ],
};

export interface CVAnalysisData {
  ats: { score: number; label: string; description: string };
  strengths: string[];
  aiSuggestions: string[];
}

export const mockCVAnalysis: CVAnalysisData = {
  ats: { score: 89, label: 'Great match', description: 'Well optimized for ATS' },
  strengths: ['Clear impact metrics', 'Strong leadership signals', 'Relevant strategy keywords'],
  aiSuggestions: [
    'Add one PE-style deal bullet',
    'Tighten summary section',
    'Mirror Bain wording',
  ],
};
