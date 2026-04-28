import type { StateCreator } from "zustand";
import type { Job, JobFilters, JobSort } from "../types";
import {
  mockJobs as legacyJobs,
  mockSelectedJob as legacySelectedJob,
} from "../../data/jobs";
import { companyBrand } from "../../data/mock";

// Parse "€90k - €120k" → { min: 90000, max: 120000, currency: "€" }
function parseSalary(raw: string): { min: number; max: number; currency: string } {
  const currency = raw.match(/[€$£]/)?.[0] ?? "€";
  const nums = Array.from(raw.matchAll(/(\d+)\s*k/gi)).map((m) => Number(m[1]) * 1000);
  return {
    min: nums[0] ?? 0,
    max: nums[1] ?? nums[0] ?? 0,
    currency,
  };
}

function convertJob(raw: typeof legacyJobs[number], detail?: typeof legacySelectedJob): Job {
  const { min, max, currency } = parseSalary(raw.salary);
  const brand = companyBrand(raw.company);
  return {
    id: raw.id,
    role: raw.role,
    company: raw.company,
    location: raw.location,
    salaryMin: min,
    salaryMax: max,
    salaryCurrency: currency,
    match: raw.match,
    postedAgo: raw.postedAgo,
    verified: raw.verified,
    bookmarked: false,
    workMode: detail?.workMode,
    type: detail?.type,
    stats: detail?.stats?.map((s) => s.label),
    about: detail?.about,
    whyYouMatch: detail?.whyYouMatch,
    aiSummary: detail?.aiSummary,
    rating: detail?.rating,
    reviews: detail?.reviews,
    avatarColor: brand.bg,
    avatarLabel: brand.label,
  };
}

const seedJobs: Job[] = legacyJobs.map((j, i) =>
  convertJob(j, i === 0 ? legacySelectedJob : undefined),
);

const defaultFilters: JobFilters = {
  location: "Paris, France",
  salary: "€80k - €120k",
  seniority: "Senior",
  sector: "Fintech, Health",
  stage: "Series B+",
  remote: "Hybrid + Remote",
};

export interface JobsSlice {
  jobs: Job[];
  selectedJobId: string | null;
  jobsSearchQuery: string;
  jobsSort: JobSort;
  jobsFilters: JobFilters;

  setSelectedJob: (id: string | null) => void;
  setJobsSearchQuery: (q: string) => void;
  setJobsSort: (s: JobSort) => void;
  setJobsFilter: <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => void;
  resetJobsFilters: () => void;

  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
}

export const createJobsSlice: StateCreator<JobsSlice> = (set, get) => ({
  jobs: seedJobs,
  selectedJobId: seedJobs[0]?.id ?? null,
  jobsSearchQuery: "",
  jobsSort: "match",
  jobsFilters: defaultFilters,

  setSelectedJob: (id) => set({ selectedJobId: id }),
  setJobsSearchQuery: (q) => set({ jobsSearchQuery: q }),
  setJobsSort: (s) => set({ jobsSort: s }),
  setJobsFilter: (key, value) =>
    set((state) => ({ jobsFilters: { ...state.jobsFilters, [key]: value } })),
  resetJobsFilters: () => set({ jobsFilters: defaultFilters }),

  toggleBookmark: (id) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, bookmarked: !j.bookmarked } : j,
      ),
    })),
  isBookmarked: (id) => !!get().jobs.find((j) => j.id === id)?.bookmarked,
});
