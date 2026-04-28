import type { StateCreator } from "zustand";
import type { Notification } from "../types";
import { uid } from "../utils";

const HOUR = 60 * 60 * 1000;

const seed: Notification[] = [
  {
    id: "n1",
    type: "interview",
    title: "Mistral AI interview in 4 hours",
    description: "Final round · 45 min · Make sure to prepare your case study.",
    timestamp: Date.now() - 1 * HOUR,
    read: false,
    link: { page: "applications", id: "4" },
  },
  {
    id: "n2",
    type: "application",
    title: "Recruiter viewed your Stripe application",
    description: "Sarah Chen · Strategy & Ops · 2h ago",
    timestamp: Date.now() - 2 * HOUR,
    read: false,
    link: { page: "applications", id: "1" },
  },
  {
    id: "n3",
    type: "insight",
    title: "Behavioral answers improved +18%",
    description: "Over the last 4 weeks of practice. Keep going.",
    timestamp: Date.now() - 6 * HOUR,
    read: false,
    link: { page: "prep" },
  },
  {
    id: "n4",
    type: "system",
    title: "CV ATS score is now 89%",
    description: "Your Consulting CV crossed the 'Great match' threshold.",
    timestamp: Date.now() - 26 * HOUR,
    read: true,
    link: { page: "cv", id: "1" },
  },
  {
    id: "n5",
    type: "application",
    title: "Goldman Sachs phone screen scheduled",
    description: "Mar 17 · 10:30 AM · Calendar invite sent.",
    timestamp: Date.now() - 50 * HOUR,
    read: true,
    link: { page: "applications", id: "2" },
  },
];

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
