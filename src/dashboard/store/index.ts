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
import { createAnalyzerSlice, type AnalyzerSlice } from "./slices/analyzer";
import { createAudioSlice, type AudioSlice } from "./slices/audio";
import { createAppearanceSlice, type AppearanceSlice } from "./slices/appearance";
import {
  createNotificationPrefsSlice,
  type NotificationPrefsSlice,
} from "./slices/notificationPrefs";
import { createBillingSlice, type BillingSlice } from "./slices/billing";
import {
  createCopilotSessionsSlice,
  type CopilotSessionsSlice,
} from "./slices/copilotSessions";

export type AppStore = UserSlice &
  NotificationsSlice &
  JobsSlice &
  ApplicationsSlice &
  CvsSlice &
  PrepSlice &
  TasksSlice &
  PreferencesSlice &
  IntegrationsSlice &
  UiSlice &
  AnalyzerSlice &
  AudioSlice &
  AppearanceSlice &
  NotificationPrefsSlice &
  BillingSlice &
  CopilotSessionsSlice;

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
  ...createAnalyzerSlice(...(a as Parameters<typeof createAnalyzerSlice>)),
  ...createAudioSlice(...(a as Parameters<typeof createAudioSlice>)),
  ...createAppearanceSlice(...(a as Parameters<typeof createAppearanceSlice>)),
  ...createNotificationPrefsSlice(...(a as Parameters<typeof createNotificationPrefsSlice>)),
  ...createBillingSlice(...(a as Parameters<typeof createBillingSlice>)),
  ...createCopilotSessionsSlice(...(a as Parameters<typeof createCopilotSessionsSlice>)),
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
      // Persist AI analyses + ATS analyzer JD so the user doesn't burn
      // Anthropic credits re-running on every nav / restart.
      atsByCv: state.atsByCv,
      atsAnalyzerJd: state.atsAnalyzerJd,
      cvPreviewPanelWidth: state.cvPreviewPanelWidth,
      prepSessions: state.prepSessions,
      todaysPlan: state.todaysPlan,
      todaysTasks: state.todaysTasks,
      prepStreakDays: state.prepStreakDays,
      prepWeekDots: state.prepWeekDots,
      preferences: state.preferences,
      integrations: state.integrations,
      audioInputId: state.audioInputId,
      audioOutputId: state.audioOutputId,
      theme: state.theme,
      notificationPrefs: state.notificationPrefs,
      plan: state.plan,
      paymentIntentId: state.paymentIntentId,
      sprintEndsAt: state.sprintEndsAt,
      // Persist Copilot session history so the user can review past
      // interviews. We DO NOT persist pendingTranscript / pendingAnswer
      // / activeSessionId / copilotStatus — those are runtime-only and
      // a reload should drop the user back to idle with the latest
      // session marked ended.
      copilotSessions: state.copilotSessions,
      copilotPickerJobId: state.copilotPickerJobId,
      copilotPickerCvId: state.copilotPickerCvId,
      // Persist the Job War Room focus so the workspace re-opens on
      // the same opportunity after a reload.
      workspaceJobId: state.workspaceJobId,
      // Prep V2 — persist the user's filter + active track so a
      // mid-prep reload lands them back where they were. Attempts
      // are durable user data; the bank itself is NOT persisted
      // (it's deterministic seed today, will be DB-hydrated later).
      prepAttempts: state.prepAttempts,
      prepBankFilter: state.prepBankFilter,
      prepActiveTrack: state.prepActiveTrack,
    }),
  }),
);

// Re-export types for convenience.
export type * from "./types";
export type { PipelineSort, SettingsTab, CopilotMode } from "./slices/ui";
