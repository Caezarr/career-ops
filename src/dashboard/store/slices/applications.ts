import type { StateCreator } from "zustand";
import type {
  Application,
  ApplicationMaterial,
  ApplicationStage,
  ApplicationsSort,
  ApplicationsTab,
  TimelineEvent,
} from "../types";
import {
  mockApplications as legacyApplications,
  mockApplicationDetail,
} from "../../data/applications";
import { mockJobs as legacyJobs } from "../../data/jobs";
import { formatDate, formatDateTime, uid } from "../utils";

const STAGE_MAP: Record<string, ApplicationStage> = {
  Interview: "interview",
  "Phone screen": "phone_screen",
  Applied: "applied",
  Sourced: "sourced",
  Offer: "offer",
  Rejected: "rejected",
};

function findJobIdByCompanyAndRole(company: string, role: string): string {
  const match = legacyJobs.find((j) => j.company === company && j.role === role);
  if (match) return match.id;
  // Fallback: derive a stable synthetic id from company/role.
  return `synthetic-${company.toLowerCase().replace(/\s+/g, "-")}-${role
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
}

function convertApplication(raw: typeof legacyApplications[number]): Application {
  const jobId = findJobIdByCompanyAndRole(raw.company, raw.role);
  const stage = STAGE_MAP[raw.stage] ?? "applied";

  // Use the rich mock detail only for application id "1" (which the legacy detail
  // describes — it's id "1": Stripe Strategy & Ops). For others, generate a small
  // sensible default.
  const isDetailMatch = raw.id === mockApplicationDetail.id;
  const materials: ApplicationMaterial[] = isDetailMatch
    ? (mockApplicationDetail.materials.map((m) => ({
        type: m.type as ApplicationMaterial["type"],
        name: m.name,
        uploaded: m.uploaded,
        state: m.state,
      })))
    : [];
  const timeline: TimelineEvent[] = isDetailMatch
    ? mockApplicationDetail.timeline
    : [
        {
          id: uid("evt"),
          title: "Applied",
          date: `${raw.appliedDate}, 10:00 AM`,
          icon: "check",
          state: "done",
        },
      ];
  const aiNextSteps = isDetailMatch ? mockApplicationDetail.aiNextSteps : [];
  const salary = isDetailMatch ? mockApplicationDetail.salary : undefined;
  const workMode = isDetailMatch ? mockApplicationDetail.workMode : undefined;
  const recruiter = isDetailMatch ? mockApplicationDetail.recruiter : undefined;

  // Synthesise the two timestamps with a small offset — applied 0-30
  // days ago, last activity 0-N days more recent. Lets seed sorts
  // produce sensible orderings out of the box.
  const appliedAt = Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000;
  const lastActivityAt = appliedAt + Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000;
  return {
    id: raw.id,
    jobId,
    cvId: undefined,
    stage,
    appliedDate: raw.appliedDate,
    appliedAt,
    lastActivity: raw.lastActivity,
    lastActivityAt,
    match: raw.match,
    nextStep: raw.nextStep,
    archived: stage === "rejected",
    notes: "",
    salary,
    workMode,
    recruiter,
    materials,
    timeline,
    aiNextSteps,
  };
}

const seedApplications: Application[] = legacyApplications.map(convertApplication);

export interface ApplicationsSlice {
  applications: Application[];
  selectedApplicationId: string | null;
  applicationsTab: ApplicationsTab;
  applicationsSort: ApplicationsSort;
  applicationsRoleFilter: string;
  applicationsPage: number;

  setSelectedApplication: (id: string | null) => void;
  setApplicationsTab: (tab: ApplicationsTab) => void;
  setApplicationsSort: (sort: ApplicationsSort) => void;
  setApplicationsRoleFilter: (role: string) => void;
  setApplicationsPage: (page: number) => void;

  createApplication: (input: {
    jobId: string;
    cvId?: string;
    stage?: ApplicationStage;
    company?: string;
    role?: string;
    match?: number;
    sourceUrl?: string;
    coverLetter?: string;
    salary?: string;
    workMode?: string;
    recruiter?: string;
  }) => Application;
  updateApplicationStage: (id: string, stage: ApplicationStage) => void;
  updateApplicationNotes: (id: string, notes: string) => void;
  archiveApplication: (id: string) => void;
  unarchiveApplication: (id: string) => void;
  deleteApplication: (id: string) => void;
  /** Persist Claude-generated next-step strings on the application
   *  record. Called from `generateApplicationNextSteps()` after the
   *  Rust call returns. */
  setApplicationNextSteps: (id: string, steps: string[]) => void;
  /** Generic patch action for inline editors — salary, workMode,
   *  recruiter, sourceUrl, coverLetter, nextStep. Persists the
   *  patch and stamps lastActivity so the table sort reflects the
   *  edit. */
  updateApplicationFields: (
    id: string,
    patch: Partial<
      Pick<
        Application,
        | 'salary'
        | 'workMode'
        | 'recruiter'
        | 'sourceUrl'
        | 'coverLetter'
        | 'nextStep'
        | 'cvId'
      >
    >,
  ) => void;
}

export const createApplicationsSlice: StateCreator<ApplicationsSlice> = (set) => ({
  applications: seedApplications,
  selectedApplicationId: seedApplications[0]?.id ?? null,
  applicationsTab: "all",
  applicationsSort: "recent",
  applicationsRoleFilter: "All roles",
  applicationsPage: 1,

  setSelectedApplication: (id) => set({ selectedApplicationId: id }),
  setApplicationsTab: (applicationsTab) =>
    set({ applicationsTab, applicationsPage: 1 }),
  setApplicationsSort: (applicationsSort) => set({ applicationsSort }),
  setApplicationsRoleFilter: (applicationsRoleFilter) =>
    set({ applicationsRoleFilter, applicationsPage: 1 }),
  setApplicationsPage: (applicationsPage) => set({ applicationsPage }),

  createApplication: (input) => {
    const now = new Date();
    const app: Application = {
      id: uid("app"),
      jobId: input.jobId,
      cvId: input.cvId,
      stage: input.stage ?? "applied",
      appliedDate: formatDate(now),
      appliedAt: now.getTime(),
      lastActivity: "Just now",
      lastActivityAt: now.getTime(),
      match: input.match ?? 0,
      nextStep: "Send follow-up",
      archived: false,
      notes: "",
      salary: input.salary,
      workMode: input.workMode,
      recruiter: input.recruiter,
      sourceUrl: input.sourceUrl,
      coverLetter: input.coverLetter,
      materials: [],
      timeline: [
        {
          id: uid("evt"),
          title: "Applied",
          date: formatDateTime(now),
          icon: "check",
          state: "done",
        },
      ],
      aiNextSteps: [],
    };
    set((state) => ({ applications: [app, ...state.applications] }));
    return app;
  },

  updateApplicationStage: (id, stage) =>
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id
          ? {
              ...a,
              stage,
              lastActivity: "Just now",
              lastActivityAt: Date.now(),
              // Move-to-rejected auto-archives so the row drops out of
              // the active pipeline. Move-FROM-rejected unarchives so
              // a re-engaged opportunity becomes visible again. Other
              // stage changes preserve whatever the user set manually.
              archived:
                stage === "rejected"
                  ? true
                  : a.stage === "rejected"
                  ? false
                  : a.archived,
              timeline: [
                {
                  id: uid("evt"),
                  title: `Stage changed to ${stage.replace("_", " ")}`,
                  date: formatDateTime(new Date()),
                  icon: "calendar",
                  state: "done" as const,
                },
                ...a.timeline,
              ],
            }
          : a,
      ),
    })),

  updateApplicationNotes: (id, notes) =>
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id
          ? {
              ...a,
              notes,
              lastActivity: "Just now",
              lastActivityAt: Date.now(),
            }
          : a,
      ),
    })),

  archiveApplication: (id) =>
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? { ...a, archived: true } : a,
      ),
    })),

  unarchiveApplication: (id) =>
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? { ...a, archived: false } : a,
      ),
    })),

  deleteApplication: (id) =>
    set((state) => ({
      applications: state.applications.filter((a) => a.id !== id),
      selectedApplicationId:
        state.selectedApplicationId === id ? null : state.selectedApplicationId,
    })),

  setApplicationNextSteps: (id, steps) =>
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? { ...a, aiNextSteps: steps } : a,
      ),
    })),

  updateApplicationFields: (id, patch) =>
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id
          ? {
              ...a,
              ...patch,
              // Stamp lastActivity so "recent" sorts surface the
              // freshly-edited row and the user gets visual
              // confirmation of the save.
              lastActivity: 'Just now',
              lastActivityAt: Date.now(),
            }
          : a,
      ),
    })),
});
