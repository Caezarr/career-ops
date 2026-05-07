import type { StateCreator } from "zustand";
import type { Notification } from "../types";
import { uid } from "../utils";

// Sprint 3 (audit Reality BLOCKING #1): no fake notifications on
// fresh install. The push pipeline (interview reminders, recruiter
// activity, ATS score crossings) will write real entries via
// `pushNotification` once those flows are wired.
const seed: Notification[] = [];

export interface NotificationsSlice {
  notifications: Notification[];
  notificationsPanelOpen: boolean;
  unreadNotificationsCount: () => number;
  setNotificationsPanelOpen: (open: boolean) => void;
  toggleNotificationsPanel: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushNotification: (n: Omit<Notification, "id" | "timestamp" | "read"> & { read?: boolean }) => Notification;
}

export const createNotificationsSlice: StateCreator<NotificationsSlice> = (set, get) => ({
  notifications: seed,
  notificationsPanelOpen: false,
  unreadNotificationsCount: () => get().notifications.filter((n) => !n.read).length,
  setNotificationsPanelOpen: (open) => set({ notificationsPanelOpen: open }),
  toggleNotificationsPanel: () =>
    set((state) => ({ notificationsPanelOpen: !state.notificationsPanelOpen })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  pushNotification: (n) => {
    const item: Notification = {
      id: uid("n"),
      timestamp: Date.now(),
      read: n.read ?? false,
      type: n.type,
      title: n.title,
      description: n.description,
      link: n.link,
    };
    set((state) => ({ notifications: [item, ...state.notifications] }));
    return item;
  },
});
