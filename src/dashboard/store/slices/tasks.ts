import type { StateCreator } from "zustand";
import type { DashboardTask } from "../types";
import { uid } from "../utils";

// Sprint 3 (audit Reality BLOCKING #1): no fake "today's tasks" on
// fresh install. Real entries land via `addDashboardTask` (called
// by the AI prep generator + the timeline event handlers once the
// user has tracked at least one application).
const seedTasks: DashboardTask[] = [];

export interface TasksSlice {
  todaysTasks: DashboardTask[];
  toggleDashboardTask: (id: string) => void;
  addDashboardTask: (
    input: Omit<DashboardTask, "id" | "done"> & { done?: boolean },
  ) => DashboardTask;
  removeDashboardTask: (id: string) => void;
}

export const createTasksSlice: StateCreator<TasksSlice> = (set) => ({
  todaysTasks: seedTasks,
  toggleDashboardTask: (id) =>
    set((state) => ({
      todaysTasks: state.todaysTasks.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    })),
  addDashboardTask: (input) => {
    const task: DashboardTask = {
      id: uid("task"),
      title: input.title,
      subtitle: input.subtitle,
      subtitleColor: input.subtitleColor,
      icon: input.icon,
      done: input.done ?? false,
    };
    set((state) => ({ todaysTasks: [task, ...state.todaysTasks] }));
    return task;
  },
  removeDashboardTask: (id) =>
    set((state) => ({
      todaysTasks: state.todaysTasks.filter((t) => t.id !== id),
    })),
});
