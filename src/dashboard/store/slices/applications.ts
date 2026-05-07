import type { StateCreator } from "zustand";
import type {
  Application,
  ApplicationsSort,
  ApplicationsTab,
  ApplicationStage,
} from "../types";
import { formatDate, formatDateTime, uid } from "../utils";

// Sprint 3 (audit Reality BLOCKING #1): no fake applications on
// fresh install. Real entries land via `createApplication` after
// the user clicks "Apply & Track" on a Job. The previous seed path
// (mock applications wired through `findJobIdByCompanyAndRole` +
// `convertApplication`) is dropped — when SQLite hydration lands,
// it'll map DB rows to the `Application` shape directly without
// needing the legacy `data/applications.ts` adapter.
const seedApplications: Application[] = [];

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
