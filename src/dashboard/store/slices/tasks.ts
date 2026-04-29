import type { StateCreator } from "zustand";
import type { DashboardTask } from "../types";
import { mockTasks as legacyTasks } from "../../data/mock";
import { uid } from "../utils";

const COLOR_MAP: Record<string, DashboardTask["subtitleColor"]> = {
  indigo: "indigo",
  green: "green",
  orange: "orange",
  purple: "indigo",
};

const ICON_MAP: Record<string, DashboardTask["icon"]> = {
  mail: "mail",
  calendar: "calendar",
  fileText: "file",
  listChecks: "list",
};

const seedTasks: DashboardTask[] = legacyTasks.map((t) => ({
  id: t.id,
  title: t.title,
  subtitle: t.subtitle,
  subtitleColor: COLOR_MAP[t.color] ?? "indigo",
  icon: ICON_MAP[t.iconKey] ?? "list",
  done: false,
}));

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
