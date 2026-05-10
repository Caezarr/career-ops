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
  onboarded: false,
  onboardingStep: 0,
  school: "",
  targetTracks: [],
};

export interface UserSlice {
  user: User;
  updateUser: (patch: Partial<User>) => void;
  /** Move the wizard to step `n` (0-indexed). Persisted via the user
   *  slice so a quit-mid-onboarding session resumes where the user
   *  left off. */
  setOnboardingStep: (n: number) => void;
  /** Mark first-launch wizard as done. Mirrors to legacy
   *  `onboardingComplete` for any older code path that may still
   *  read it. Optionally merge final captured fields in one set so
   *  no intermediate render sees a half-hydrated user. */
  markOnboarded: (patch?: Partial<User>) => void;
}

export const createUserSlice: StateCreator<UserSlice> = (set) => ({
  user: initialUser,
  updateUser: (patch) =>
    set((state) => ({ user: { ...state.user, ...patch } })),
  // Sprint 6: 6-step wizard (Identity / Targets / Background /
  // FirstCV / Narrative / FirstSource). Existing persisted users
  // with `onboardingStep` < 5 survive unchanged; `markOnboarded`
  // pushes them to the final dot regardless.
  setOnboardingStep: (n) =>
    set((state) => ({
      user: { ...state.user, onboardingStep: Math.max(0, Math.min(5, n)) },
    })),
  markOnboarded: (patch) =>
    set((state) => ({
      user: {
        ...state.user,
        ...(patch ?? {}),
        onboarded: true,
        onboardingComplete: true,
        onboardingStep: 5,
      },
    })),
});
