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
import { createIngestSlice, type IngestSlice } from "./slices/ingest";
import { createAuthSlice, type AuthSlice } from "./slices/auth";

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
  CopilotSessionsSlice &
  IngestSlice &
  AuthSlice;

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
  ...createIngestSlice(...(a as Parameters<typeof createIngestSlice>)),
  ...createAuthSlice(...(a as Parameters<typeof createAuthSlice>)),
});

export const useAppStore = create<AppStore>()(
  persist(composedStore, {
    name: "career-os-store",
    // v1 → v2: drop the heavy `jobs` field from persistence (was
    //          blowing localStorage's ~5MB quota once ingestion
    //          pulled 5000+ postings × 12k chars each). Bookmarks
    //          survive via `bookmarkedJobIds`.
    // v2 → v3: Sprint 3 first-launch hygiene (audit Reality
    //          BLOCKING #1). Strip seeded fake state from
    //          existing users so the dashboard reflects reality
    //          on next launch. Specifically: fake notifications
    //          (n1..n5), fake CV variants (cv1..cv4), seeded
    //          applications, seeded tasks, fake prep streak / dots.
    //          User-created data (anything with a `uid()` id, real
    //          uploaded CVs, tracked applications) is preserved.
    version: 3,
    migrate: (persisted: unknown, fromVersion: number) => {
      if (!persisted || typeof persisted !== "object") return persisted;
      const p = persisted as Record<string, unknown>;

      if (fromVersion < 2) {
        // Drop the bloated jobs array. Bookmarks survive via
        // bookmarkedJobIds (added in v2).
        delete p.jobs;
        if (!Array.isArray(p.bookmarkedJobIds)) p.bookmarkedJobIds = [];
      }

      if (fromVersion < 3) {
        // The 5 seed notifications had ids "n1".."n5" — anything
        // user-pushed via pushNotification() gets a `uid("n_xxx")`
        // shape, so this filter is safe.
        if (Array.isArray(p.notifications)) {
          p.notifications = (p.notifications as Array<{ id?: string }>)
            .filter((n) => !/^n[1-5]$/.test(n.id ?? ""));
        }

        // The 4 seed CVs had ids "cv1".."cv4". User-uploaded CVs
        // use uid("cv_*").
        if (Array.isArray(p.cvs)) {
          const before = p.cvs as Array<{ id?: string; isDefault?: boolean }>;
          const after = before.filter((c) => !/^cv[1-9]\d*$/.test(c.id ?? ""));
          p.cvs = after;
          if (typeof p.defaultCvId === "string" && !after.some((c) => c.id === p.defaultCvId)) {
            p.defaultCvId = after[0]?.id ?? null;
          }
        }

        // Seeded applications had numeric string ids ("1".."5").
        // User-created go through uid("app_*").
        if (Array.isArray(p.applications)) {
          p.applications = (p.applications as Array<{ id?: string }>)
            .filter((a) => !/^[1-9]\d*$/.test(a.id ?? ""));
        }

        // Seeded today's tasks come from `data/mock.ts` with stable
        // ids "task1".."task4"; the runtime add path uses
        // uid("task_*").
        if (Array.isArray(p.todaysTasks)) {
          p.todaysTasks = (p.todaysTasks as Array<{ id?: string }>)
            .filter((t) => !/^task[1-9]\d*$/.test(t.id ?? ""));
        }

        // Fake prep history.
        if (typeof p.prepStreakDays === "number" && p.prepStreakDays === 12) {
          // Conservative: only zero out if it still equals the seed.
          // A user who genuinely hit 12 keeps their streak.
          p.prepStreakDays = 0;
        }
        if (
          Array.isArray(p.prepWeekDots) &&
          JSON.stringify(p.prepWeekDots) === JSON.stringify([true, true, true, true, false, false, false])
        ) {
          p.prepWeekDots = [false, false, false, false, false, false, false];
        }
        if (Array.isArray(p.todaysPlan)) {
          // Seed plan ids start with "plan-" prefix from data/prep.
          // Runtime-added tasks use uid("plan_*") with underscore.
          p.todaysPlan = (p.todaysPlan as Array<{ id?: string }>)
            .filter((t) => !/^plan-/.test(t.id ?? ""));
        }

        // Fake user identity. We zero out only the obvious seed
        // signature ("Gabriel Rance" + the demo email); a user who
        // edited their profile keeps it.
        if (
          p.user &&
          typeof p.user === "object" &&
          (p.user as { name?: string }).name === "Gabriel Rance"
        ) {
          p.user = {
            ...(p.user as Record<string, unknown>),
            name: "",
            email: "",
            avatarInitials: "",
            targetRole: "",
            targetCompany: "",
            location: "",
          };
        }
      }

      return p;
    },
    storage: createJSONStorage(() => localStorage),
    // Persist only durable state — never selection, search, or transient UI flags.
    // Notably we DO NOT persist `jobs` (the full ingested list can hit
    // 50MB+ at 5000 postings × 12k chars each, far past localStorage's
    // ~5MB quota). Bookmarks survive via `bookmarkedJobIds`.
    partialize: (state) => ({
      user: state.user,
      notifications: state.notifications,
      bookmarkedJobIds: state.bookmarkedJobIds,
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
      // Billing — local mirror of the Worker's /v1/billing/status DTO.
      // The boot hook (`useBillingHydrate`) overwrites this on every
      // cold start; persistence here is only to paint the Billing card
      // instantly before the network call resolves.
      plan: state.plan,
      purchasedAt: state.purchasedAt,
      refundDeadlineAt: state.refundDeadlineAt,
      hasGuarantee: state.hasGuarantee,
      refundRequestedAt: state.refundRequestedAt,
      refundedAt: state.refundedAt,
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
      // Ingest — persist the user's configured job sources and last
      // sync timestamp. Run history (ingestRuns) and the syncing flag
      // are runtime-only.
      ingestSources: state.ingestSources,
      ingestLastSyncedAt: state.ingestLastSyncedAt,
    }),
  }),
);

// Re-export types for convenience.
export type * from "./types";
export type { PipelineSort, SettingsTab, CopilotMode } from "./slices/ui";
