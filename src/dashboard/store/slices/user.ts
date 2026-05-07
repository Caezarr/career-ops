import type { StateCreator } from "zustand";
import type { User } from "../types";

// Sprint 3 (audit Reality BLOCKING #1): no fake user identity on
// fresh install. Onboarding (FRONT-005) populates these fields the
// first time the user opens Settings → Profile. Until then we
// render empty strings — every consumer already handles that
// gracefully (avatar falls back to letter-tile, header greeting
// uses "Welcome back" when name is empty).
const initialUser: User = {
  name: "",
  email: "",
  plan: "free",
  persona: "tech-ai",
  timezone: "",
  language: "en",
  location: "",
  avatarInitials: "",
  targetRole: "",
  targetCompany: "",
};

export interface UserSlice {
  user: User;
  updateUser: (patch: Partial<User>) => void;
}

export const createUserSlice: StateCreator<UserSlice> = (set) => ({
  user: initialUser,
  updateUser: (patch) =>
    set((state) => ({ user: { ...state.user, ...patch } })),
});
