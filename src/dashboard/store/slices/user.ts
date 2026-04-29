import type { StateCreator } from "zustand";
import type { User } from "../types";
import { mockSettingsProfile } from "../../data/settings";
import { mockUser } from "../../data/mock";

const initialUser: User = {
  name: mockSettingsProfile.name || mockUser.name,
  email: mockSettingsProfile.email,
  plan: (mockSettingsProfile.plan || mockUser.plan).toLowerCase() === "pro" ? "pro" : "free",
  persona: "tech-ai",
  timezone: mockSettingsProfile.timezone,
  language: mockSettingsProfile.language,
  location: mockSettingsProfile.location,
  avatarInitials: mockUser.initials,
  targetRole: "Senior Product Manager",
  targetCompany: "OpenAI",
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
