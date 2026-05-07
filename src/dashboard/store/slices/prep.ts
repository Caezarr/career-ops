import type { StateCreator } from "zustand";
import type {
  PlanTask,
  PrepCategory,
  PrepChartPeriod,
  PrepQuestion,
  PrepQuestionAttempt,
  PrepQuestionV2,
  PrepSession,
  QuestionFilter,
  QuestionTrack,
} from "../types";
import { SEED_QUESTIONS } from "../../data/prep/index";
import { uid } from "../utils";

// Sprint 3 (audit Reality BLOCKING #1): no fake practice history,
// today's plan, or streak on fresh install. The legacy 6-question
// shape (`prepQuestions`) is unused by the V2 surface — we keep
// the type for back-compat with persisted data but seed empty.
// `todaysPlan` populates from the AI prep generator once the user
// has at least one tracked application.
const seedQuestions: PrepQuestion[] = [];
const seedPlan: PlanTask[] = [];

export interface PrepSlice {
  /** Legacy 6-question shape — still consumed by older Prep
   *  components until they migrate to V2. */
  prepQuestions: PrepQuestion[];
  prepSessions: PrepSession[];
  todaysPlan: PlanTask[];
  prepStreakDays: number;
  prepWeekDots: boolean[];
  prepChartPeriod: PrepChartPeriod;
  prepCategoryFilter: PrepCategory | "All";

  /** V2 question bank. Seeded from `data/prep/index.SEED_QUESTIONS`
   *  on mount; designed to be hydrated from a SQLite back-end later
   *  via the same shape (Tauri sqlx is already wired for CV/Job
   *  storage). */
  prepBank: PrepQuestionV2[];
  /** User's logged attempts against bank questions — drives the
   *  "practised X times, last score Y" chips. Persisted across
   *  reloads. */
  prepAttempts: PrepQuestionAttempt[];
  /** Active filter applied to the QuestionBank surface. Persisted so
   *  the user's last drill-down survives a reload. */
  prepBankFilter: QuestionFilter;
  /** Track currently in focus on the Prep page (drives the tab strip).
   *  `null` = "all tracks" — used to land first-time users in a
   *  general-mix view. */
  prepActiveTrack: QuestionTrack | null;

  togglePlanTask: (id: string) => void;
  addPlanTask: (input: { title: string; duration: string }) => PlanTask;
  removePlanTask: (id: string) => void;

  recordPrepSession: (input: {
    questionId: string;
    scores: PrepSession["scores"];
    feedback: string[];
  }) => PrepSession;

  setPrepChartPeriod: (period: PrepChartPeriod) => void;
  setPrepCategoryFilter: (category: PrepCategory | "All") => void;
  setPracticeScore: (questionId: string, score: number) => void;
  bumpStreak: () => void;

  // ── V2 actions ────────────────────────────────────────────────
  /** Replace / merge the bank in one shot. Useful when we plug in
   *  the AI question generator (per-job tailored questions land
   *  here) or the SQLite hydration. */
  setPrepBank: (bank: PrepQuestionV2[]) => void;
  setPrepBankFilter: (patch: Partial<QuestionFilter>) => void;
  resetPrepBankFilter: () => void;
  setPrepActiveTrack: (track: QuestionTrack | null) => void;
  /** Log an attempt against a question. Returns the recorded entry
   *  so the UI can flash a confirmation. */
  recordPrepAttempt: (input: {
    questionId: string;
    selfScore?: number;
    note?: string;
  }) => PrepQuestionAttempt;
}

export const createPrepSlice: StateCreator<PrepSlice> = (set) => ({
  prepQuestions: seedQuestions,
  prepSessions: [],
  todaysPlan: seedPlan,
  // Sprint 3: streak / week-dots start empty. `bumpStreak` is the
  // only authority that grows them — the prep flow calls it after
  // a real session is recorded.
  prepStreakDays: 0,
  prepWeekDots: [false, false, false, false, false, false, false],
  prepChartPeriod: "8w",
  prepCategoryFilter: "All",
  prepBank: SEED_QUESTIONS,
  prepAttempts: [],
  prepBankFilter: {},
  prepActiveTrack: null,

  togglePlanTask: (id) =>
    set((state) => ({
      todaysPlan: state.todaysPlan.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    })),

  addPlanTask: (input) => {
    const task: PlanTask = {
      id: uid("plan"),
      title: input.title,
      duration: input.duration,
      done: false,
    };
    set((state) => ({ todaysPlan: [...state.todaysPlan, task] }));
    return task;
  },

  removePlanTask: (id) =>
    set((state) => ({
      todaysPlan: state.todaysPlan.filter((t) => t.id !== id),
    })),

  recordPrepSession: (input) => {
    const session: PrepSession = {
      id: uid("sess"),
      questionId: input.questionId,
      scores: input.scores,
      feedback: input.feedback,
      recordedAt: Date.now(),
    };
    set((state) => ({ prepSessions: [session, ...state.prepSessions] }));
    return session;
  },

  setPrepChartPeriod: (prepChartPeriod) => set({ prepChartPeriod }),
  setPrepCategoryFilter: (prepCategoryFilter) => set({ prepCategoryFilter }),
  setPracticeScore: (questionId, score) =>
    set((state) => ({
      prepQuestions: state.prepQuestions.map((q) =>
        q.id === questionId ? { ...q, practiceScore: score } : q,
      ),
    })),
  bumpStreak: () =>
    set((state) => ({ prepStreakDays: state.prepStreakDays + 1 })),

  // ── V2 actions ─────────────────────────────────────────────────
  setPrepBank: (prepBank) => set({ prepBank }),

  setPrepBankFilter: (patch) =>
    set((state) => {
      // Merge patch into the current filter, then strip empty / null
      // values so the resulting object stays minimal — saves bytes
      // on the persisted blob and keeps "no filter" === {}.
      const merged: QuestionFilter = { ...state.prepBankFilter, ...patch };
      (Object.keys(merged) as Array<keyof QuestionFilter>).forEach((k) => {
        const v = merged[k];
        if (v === undefined || v === null || v === "") delete merged[k];
      });
      return { prepBankFilter: merged };
    }),

  resetPrepBankFilter: () => set({ prepBankFilter: {} }),

  setPrepActiveTrack: (prepActiveTrack) => set({ prepActiveTrack }),

  recordPrepAttempt: (input) => {
    const attempt: PrepQuestionAttempt = {
      id: uid("att"),
      questionId: input.questionId,
      recordedAt: Date.now(),
      selfScore: input.selfScore,
      note: input.note,
    };
    set((state) => ({ prepAttempts: [attempt, ...state.prepAttempts] }));
    return attempt;
  },
});
