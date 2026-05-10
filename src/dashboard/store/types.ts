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
  /** Legacy first-launch flag, retained so older persisted stores keep
   *  reading correctly. Mirrored to / from `onboarded` by the user
   *  slice so consumers can use either. */
  onboardingComplete?: boolean;
  /** True once the user has completed (or skipped past) the first-launch
   *  setup wizard. Drives whether `<Onboarding />` mounts on app boot. */
  onboarded?: boolean;
  /** Last step index the user reached in the wizard (0..3). Used to
   *  resume mid-flow if the app is closed before completion. */
  onboardingStep?: number;
  /** École (HEC, ESCP, Polytechnique, …) captured during onboarding.
   *  Free-form when the user picks "Autre". */
  school?: string;
  /** Diplôme principal (e.g. "MSc Management", "Bachelor CS",
   *  "MBA"). Optional — onboarding asks but doesn't gate. */
  degree?: string;
  /** Year of (expected) graduation. Optional. Number rather than
   *  string so date math (years-of-experience inference) doesn't
   *  need parsing. */
  gradYear?: number;
  /** Target firm/track tags chosen during onboarding (e.g. "Conseil",
   *  "IB / PE / VC"). Surfaced to the AI prompts so generations match
   *  the user's actual goals. */
  targetTracks?: string[];
  // ── Sprint 6 — extended onboarding (CV OCR + background) ──────
  /** Self-declared seniority bracket. Used by the AI prompts to
   *  modulate tone (e.g. avoid "Lead an engineering team" prep
   *  questions for a fresh graduate). All values are optional —
   *  user can skip the question. */
  experienceLevel?: "student" | "graduate" | "1-3" | "3-7" | "7+";
  /** Geographies the user is targeting (Paris, London, NYC, SF,
   *  Remote, Other). Multi-select; empty = "didn't say". */
  targetGeo?: string[];
  /** Contract type the user is hunting for. */
  contractType?: "cdi" | "stage" | "alternance" | "freelance" | "any";
  /** Target compensation range — annual gross, in the user's
   *  primary currency (defaulted to EUR for FR users). Optional;
   *  surfaced to filter / score job postings. */
  salaryMin?: number;
  salaryMax?: number;
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
  /** Provenance for jobs pulled from external boards. Absent for hand-created jobs. */
  source?: JobSource;
  /** Derived from role title via regex (Junior / Mid / Senior / Staff / VP+). */
  seniority?: string;
  /** Looked up from a curated company → sector map. */
  sector?: string;
  /** Looked up from companyMeta or derived from YC batch (e.g. "Seed", "Series B"). */
  companyStage?: string;
  /** YC batch identifier (e.g. "S25", "W26") — only set for YC postings. */
  companyBatch?: string;
  /** Absolute URL to the company logo. Currently set by the Job
   *  Teaser bridge scraper (extracted from the card <img>). When
   *  present, JobListItem / JobDetail / WarRoom render this image
   *  instead of the avatarLabel + avatarColor fallback. */
  companyLogoUrl?: string;
  /** Sprint 5 (audit Performance P0 #1): pre-tokenised search
   *  haystack — lowercased ≥1-char alphanumeric words pulled once
   *  at ingest time from role + company + location + seniority +
   *  sector + companyStage + companyBatch. JobList's filter loop
   *  reads this directly instead of re-tokenising on every
   *  keystroke (was ~105k string ops × every keystroke). */
  _searchTokens?: string[];
}

// ─── Job ingestion (external boards) ────────────────────────────────────────
export type IngestProvider =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "ycombinator"
  | "jobteaser";

export interface JobSource {
  provider: IngestProvider;
  /** Board / company slug. Empty for YC (flat feed). */
  identifier?: string;
  /** The provider's own job ID — used for dedup. */
  sourceId: string;
  /** Canonical apply URL. */
  sourceUrl: string;
  fetchedAt: number;
}

export interface IngestSource {
  id: string;
  provider: IngestProvider;
  /** Board / company slug. Empty for YC. For Job Teaser this is the
   *  user's `career_center_slug` captured at SSO time. */
  identifier: string;
  /** User-facing label (e.g., "Anthropic · Greenhouse"). */
  label: string;
  enabled: boolean;
  addedAt: number;
  lastSyncedAt?: number;
  lastError?: string;
  /** Job Teaser only: the human-readable school name from the user's
   *  profile (e.g., "Arts et Métiers · Career Center"). */
  schoolDisplayName?: string;
}

export interface IngestRunError {
  provider: IngestProvider;
  identifier?: string;
  message: string;
}

export interface IngestRun {
  id: string;
  startedAt: number;
  finishedAt?: number;
  /** Empty when running all sources. */
  source?: IngestProvider;
  fetchedCount: number;
  newCount: number;
  errors: IngestRunError[];
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
  /** Unix ms of the last user-facing edit (stage change, notes, next
   *  step rename, etc.). Backs the "Last activity" sort so "recent"
   *  is actually different from "Date applied". Optional for legacy
   *  seeded apps that pre-date the field. */
  lastActivityAt?: number;
  match: number;
  nextStep: string;
  archived: boolean;
  notes: string;
  salary?: string;
  workMode?: string;
  recruiter?: string;
  /** URL of the original job posting (LinkedIn, careers page…). */
  sourceUrl?: string;
  /** Cover-letter draft attached to this application. */
  coverLetter?: string;
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

/** Legacy 6-question shape — still in use until the QuestionBank UI
 *  migration completes. Kept alive so existing components compile. */
export interface PrepQuestion {
  id: string;
  index: number;
  category: PrepCategory;
  question: string;
  difficulty: Difficulty;
  framework: string;
  practiceScore: number | null;
}

// ─── Prep — V2 question bank ───────────────────────────────────────────────
//
// Designed to scale from 50 → 50,000+ questions. The shape is locked
// so a future SQLite back-end (Tauri sqlx) can hydrate the slice from
// a query without changing call sites.

/** Top-level career track. Adding a new track is a 3-line change in
 *  `data/prep/tracks.ts` plus appended topics + questions; consumers
 *  use `QuestionTrack` so unknown ids fail at compile time. */
export type QuestionTrack =
  | "finance"
  | "consulting"
  | "product"
  | "swe"
  | "ai"
  | "data"
  | "design"
  | "general";

/** How the question is asked / what the format implies for prep. */
export type QuestionFormat =
  | "behavioral"
  | "motivation"
  | "technical"
  | "case"
  | "coding"
  | "system-design"
  | "fit"
  | "brain-teaser";

/** Refined difficulty scale — lets advanced questions (LBO modeling
 *  with PIK, transformer attention from scratch) get an "expert" tag
 *  while keeping the leetcode-easy buckets honest. */
export type QuestionDifficulty = "easy" | "medium" | "hard" | "expert";

/** A single question in the bank. Keep all fields except question /
 *  track / format / topicIds / difficulty optional so a thin import
 *  path (raw question text + minimal metadata) can land without
 *  blowing up validation. */
export interface PrepQuestionV2 {
  id: string;
  track: QuestionTrack;
  format: QuestionFormat;
  /** 1+ topic ids — most questions belong to a single topic, but
   *  cross-cutting prompts (a finance behavioural with STAR
   *  references) tag both topics so search hits either way. */
  topicIds: string[];
  difficulty: QuestionDifficulty;
  /** Free-form filterable atoms — frameworks (STAR, MECE), keywords
   *  (DCF, transformer), or domain hints. Always lowercase normalised
   *  on read so partial-match search behaves. */
  tags: string[];
  /** The full prompt the candidate is asked. */
  question: string;
  /** Common follow-up probes — surfaced in the detail panel so the
   *  user can prep for the second-order questions. */
  followUps?: string[];
  /** Skeleton of a strong answer. Optional because the AI-generated
   *  variant fills this on demand for questions that ship without
   *  one. */
  modelAnswer?: string;
  /** Suggested time to spend (mins). Used by the UI to size sessions
   *  and to drive the today's-plan time budget. */
  durationMin?: number;
  /** Where the question comes from (Hull, LeetCode, BCG archive,
   *  Bouzouba, …). Surfaced as a footnote so users trust the source. */
  source?: string;
  /** Companies known to ask this exact / very similar question. Drives
   *  the War Room "this firm is known for asking…" surface. Always
   *  treated as case-sensitive labels (display strings). */
  knownAtCompanies?: string[];
}

/** Aggregate filter applied to the question bank in the UI. Every
 *  field is optional — omitted means "no filter on this dimension". */
export interface QuestionFilter {
  track?: QuestionTrack;
  topicId?: string;
  difficulty?: QuestionDifficulty;
  format?: QuestionFormat;
  /** Free-text query — matched against question text + tags
   *  (case-insensitive). */
  query?: string;
  /** Restrict to questions that have any of these companies in
   *  `knownAtCompanies`. Drives "questions Goldman has asked"
   *  surfaces. */
  company?: string;
}

/** A single attempt the user has logged against a question. The slice
 *  keeps these in `prepAttempts` so the question bank can show
 *  "practised X times, last score Y". */
export interface PrepQuestionAttempt {
  id: string;
  questionId: string;
  /** Unix ms. */
  recordedAt: number;
  /** 0-10 self-rating, optional — when missing we just count the
   *  attempt without scoring it. */
  selfScore?: number;
  /** Optional free-form note. */
  note?: string;
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
