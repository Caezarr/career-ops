// Composed Zustand store for the Career OS dashboard.
// All transient UI selection state is intentionally excluded from persistence.

import { create, type StateCreator } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { createUserSlice, type UserSlice } from "./slices/user";
import { createNotificationsSlice, type NotificationsSlice } from "./slices/notifications";
import { createJobsSlice, type JobsSlice } from "./slices/jobs";
import { createApplicationsSlice, type ApplicationsSlice } from "./slices/applications";
import { createCvsSlice, type CvsSlice } from "./slices/cvs";
import { createPrepSlice, type PrepSlice } from "./slices/prep";
import { createTasksSlice, type TasksSlice } from "./slices/tasks";
import { createPreferencesSlice, type PreferencesSlice } from "./slices/preferences";
import { createIntegrationsSlice, type IntegrationsSlice } from "./slices/integrations";
import { createUiSlice, type UiSlice } from "./slices/ui";

export type AppStore = UserSlice &
  NotificationsSlice &
  JobsSlice &
  ApplicationsSlice &
  CvsSlice &
  PrepSlice &
  TasksSlice &
  PreferencesSlice &
  IntegrationsSlice &
  UiSlice;

const composedStore: StateCreator<AppStore> = (...a) => ({
  ...createUserSlice(...(a as Parameters<typeof createUserSlice>)),
  ...createNotificationsSlice(...(a as Parameters<typeof createNotificationsSlice>)),
  ...createJobsSlice(...(a as Parameters<typeof createJobsSlice>)),
  ...createApplicationsSlice(...(a as Parameters<typeof createApplicationsSlice>)),
  ...createCvsSlice(...(a as Parameters<typeof createCvsSlice>)),
  ...createPrepSlice(...(a as Parameters<typeof createPrepSlice>)),
  ...createTasksSlice(...(a as Parameters<typeof createTasksSlice>)),
  ...createPreferencesSlice(...(a as Parameters<typeof createPreferencesSlice>)),
  ...createIntegrationsSlice(...(a as Parameters<typeof createIntegrationsSlice>)),
  ...createUiSlice(...(a as Parameters<typeof createUiSlice>)),
});

export const useAppStore = create<AppStore>()(
  persist(composedStore, {
    name: "career-os-store",
    version: 1,
    storage: createJSONStorage(() => localStorage),
    // Persist only durable state — never selection, search, or transient UI flags.
    partialize: (state) => ({
      user: state.user,
      notifications: state.notifications,
      jobs: state.jobs,
      applications: state.applications,
      cvs: state.cvs,
      defaultCvId: state.defaultCvId,
      prepSessions: state.prepSessions,
      todaysPlan: state.todaysPlan,
      todaysTasks: state.todaysTasks,
      prepStreakDays: state.prepStreakDays,
      prepWeekDots: state.prepWeekDots,
      preferences: state.preferences,
      integrations: state.integrations,
    }),
  }),
);

// Re-export types for convenience.
export type * from "./types";
export type { PipelineSort, SettingsTab, CopilotMode } from "./slices/ui";
