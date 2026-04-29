import type { StateCreator } from "zustand";
import type { PlanTask, PrepCategory, PrepChartPeriod, PrepQuestion, PrepSession } from "../types";
import { mockPrepQuestions as legacyQuestions, mockTodaysPlan } from "../../data/prep";
import { uid } from "../utils";

// Explicit per-question category mapping (matches the spec).
// Falls back to a framework-based derivation if a question id isn't listed.
const CATEGORY_BY_ID: Record<string, PrepCategory> = {
  q1: "Behavioral",
  q2: "Behavioral",
  q3: "Culture Fit",
  q4: "Technical",
  q5: "Behavioral",
  q6: "Case",
};

function deriveCategory(framework: string): PrepCategory {
  const fw = framework.toLowerCase();
  if (fw.includes("mece") || fw.includes("pyramid")) return "Case";
  if (fw.includes("motivation")) return "Culture Fit";
  if (fw.includes("star")) return "Behavioral";
  return "Technical";
}

const seedQuestions: PrepQuestion[] = legacyQuestions.map((q) => ({
  id: q.id,
  index: q.index,
  category: CATEGORY_BY_ID[q.id] ?? deriveCategory(q.framework),
  question: q.question,
  difficulty: q.difficulty,
  framework: q.framework,
  practiceScore: q.practiceScore,
}));

const seedPlan: PlanTask[] = mockTodaysPlan.map((t) => ({
  id: t.id,
  title: t.title,
  duration: t.duration,
  done: t.done,
}));

export interface PrepSlice {
  prepQuestions: PrepQuestion[];
  prepSessions: PrepSession[];
  todaysPlan: PlanTask[];
  prepStreakDays: number;
  prepWeekDots: boolean[];
  prepChartPeriod: PrepChartPeriod;
  prepCategoryFilter: PrepCategory | "All";

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
}

export const createPrepSlice: StateCreator<PrepSlice> = (set) => ({
  prepQuestions: seedQuestions,
  prepSessions: [],
  todaysPlan: seedPlan,
  prepStreakDays: 12,
  prepWeekDots: [true, true, true, true, false, false, false],
  prepChartPeriod: "8w",
  prepCategoryFilter: "All",

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
});
