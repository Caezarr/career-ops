// Centralized types for the global Zustand store.
// These wrap and extend the original mock-data shapes from src/dashboard/data/*.ts.
// Existing data files remain the seed source — they are not deleted.

import type { Page } from "../navigation";

export type { Page };

// ─── User ───────────────────────────────────────────────────────────────────
export interface User {
  name: string;
  email: string;
  plan: "free" | "pro";
  persona: "finance" | "tech-ai" | "consulting";
  timezone: string;
  language: string;
  location: string;
  avatarInitials: string;
  /** Optional data-URL or remote URL for the user's profile photo. */
  avatarUrl?: string;
  targetRole: string;
  targetCompany: string;
  // ── Optimization-CV contact block (used in the LaTeX header).
  // All optional — empty fields are simply omitted from the generated CV.
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  /** Free-form Markdown narrative about the user — background, experiences,
   *  anecdotes, optimisations, what they care about. Fed to Claude alongside
   *  the structured fields so the CV generator and the Copilot have richer
   *  context than just bullets in a CV. Think of it as a 'profile.md'. */
  profileMarkdown?: string;
  /** True once the user has completed (or skipped) the onboarding flow. */
  onboardingComplete?: boolean;
}

// ─── Notifications ──────────────────────────────────────────────────────────
export type NotificationType = "interview" | "application" | "insight" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number; // epoch ms
  read: boolean;
  link?: { page: Page; id?: string };
}

// ─── Jobs ───────────────────────────────────────────────────────────────────
export interface Job {
  id: string;
  role: string;
  company: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  match: number;
  postedAgo: string;
  verified?: boolean;
  bookmarked: boolean;
  jdText?: string;
  workMode?: string;
  type?: string;
  stats?: string[];
  about?: string[];
  whyYouMatch?: string[];
  aiSummary?: string;
  rating?: number;
  reviews?: number;
  avatarColor: string;
  avatarLabel: string;
}

export type JobSort = "match" | "recent" | "salary";

export interface JobFilters {
  location: string;
  salary: string;
  seniority: string;
  sector: string;
  stage: string;
  remote: string;
}

// ─── Applications ───────────────────────────────────────────────────────────
export type ApplicationStage =
  | "sourced"
  | "applied"
  | "phone_screen"
  | "interview"
  | "offer"
  | "rejected";

export interface ApplicationMaterial {
  type: "CV" | "Cover letter" | "Portfolio";
  name: string;
  uploaded: string;
  state: "uploaded" | "missing";
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  icon: "check" | "eye" | "calendar" | "bell" | "note";
  state: "done" | "upcoming" | "alert";
}

export interface Application {
  id: string;
  jobId: string;
  cvId?: string;
  stage: ApplicationStage;
  appliedDate: string;
  appliedAt: number;
  lastActivity: string;
  match: number;
  nextStep: string;
  archived: boolean;
  notes: string;
  salary?: string;
  workMode?: string;
  recruiter?: string;
  materials: ApplicationMaterial[];
  timeline: TimelineEvent[];
  aiNextSteps: string[];
}

export type ApplicationsTab = "all" | "active" | "interviews" | "archived";
export type ApplicationsSort = "recent" | "applied" | "match" | "company" | "stage";

// ─── CVs ────────────────────────────────────────────────────────────────────
export interface CV {
  id: string;
  name: string;
  lastEdited: string;
  fileType: "PDF";
  roleFocus: string;
  atsScore: number;
  isDefault: boolean;
  /** Parsed CV text — fed to the AI for ATS analysis + tailoring,
   *  and rendered in the right-panel preview. Optional for legacy seeds. */
  parsedText?: string;
  /** Variant-specific summary headline shown in the preview. */
  summary?: string;
}

export type CVTab = "manager" | "ats" | "history";

// ── ATS analysis (mirrors lib/ai.ts) ───────────────────────────────────────────
export interface StoreAtsSuggestion {
  type: "add" | "reword" | "remove";
  original: string;
  suggested: string;
  rationale: string;
}

export interface StoreAtsAnalysis {
  atsScore: number;
  matchScore: number;
  /** ATS score AFTER applying all suggestions (from Claude). */
  projectedAtsScore: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  suggestions: StoreAtsSuggestion[];
  /** Score before this analysis was run, captured from cv.atsScore at call-time. */
  scoreBefore?: number;
  /** When the analysis was run (epoch ms). */
  ranAt: number;
  /** JD text used (truncated, optional). */
  jdSnippet?: string;
}

// ─── Prep ───────────────────────────────────────────────────────────────────
export type PrepCategory = "Behavioral" | "Technical" | "Case" | "Culture Fit";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface PrepQuestion {
  id: string;
  index: number;
  category: PrepCategory;
  question: string;
  difficulty: Difficulty;
  framework: string;
  practiceScore: number | null;
}

export interface PrepSession {
  id: string;
  questionId: string;
  scores: {
    structure: number;
    conciseness: number;
    evidence: number;
    memorability: number;
  };
  feedback: string[];
  recordedAt: number;
}

export interface PlanTask {
  id: string;
  title: string;
  duration: string;
  done: boolean;
}

export type PrepChartPeriod = "4w" | "8w" | "12w";

// ─── Tasks (Dashboard) ──────────────────────────────────────────────────────
export interface DashboardTask {
  id: string;
  title: string;
  subtitle: string;
  subtitleColor: "indigo" | "green" | "orange" | "red";
  icon: "mail" | "calendar" | "file" | "list";
  done: boolean;
}

// ─── Preferences ────────────────────────────────────────────────────────────
export interface Preferences {
  keyboardShortcuts: boolean;
  startOnLogin: boolean;
  emailNotifications: boolean;
  weeklyInsights: boolean;
  aiActivitySummaries: boolean;
}

// ─── Integrations ───────────────────────────────────────────────────────────
export interface Integration {
  id: "anthropic" | "openai" | "assemblyai";
  name: string;
  model: string;
  connected: boolean;
  brandColor: string;
  brandBg: string;
  letter: string;
}
