import type { StateCreator } from 'zustand';

/** User-facing notification preferences. Distinct from `preferences`
 *  (which holds keyboard / startOnLogin flags) so the Notifications tab
 *  can persist without polluting the unrelated preference list.
 *
 *  Status today:
 *   - sound:    real — useToast plays a Web Audio bell when this is on.
 *   - push:     COMING SOON — needs tauri-plugin-notification.
 *   - email:    COMING SOON — needs a notification service.
 *   - weekly:   COMING SOON — needs a backend digest job.
 *   - marketing: COMING SOON — same.
 *
 *  The shape allows shipping each one without re-shaping the slice. */
export interface NotificationPrefs {
  push: boolean;
  sound: boolean;
  email: boolean;
  weekly: boolean;
  marketing: boolean;
}

export interface NotificationPrefsSlice {
  notificationPrefs: NotificationPrefs;
  setNotificationPref: <K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K],
  ) => void;
}

const seed: NotificationPrefs = {
  push: false,
  sound: true,
  email: false,
  weekly: false,
  marketing: false,
};

export const createNotificationPrefsSlice: StateCreator<NotificationPrefsSlice> = (set) => ({
  notificationPrefs: seed,
  setNotificationPref: (key, value) =>
    set((state) => ({
      notificationPrefs: { ...state.notificationPrefs, [key]: value },
    })),
});
