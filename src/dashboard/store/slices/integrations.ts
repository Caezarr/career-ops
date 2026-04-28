import type { StateCreator } from "zustand";
import type { Integration } from "../types";
import { mockIntegrations as legacyIntegrations } from "../../data/settings";

function asId(id: string): Integration["id"] {
  if (id === "anthropic" || id === "openai" || id === "assemblyai") return id;
  return "anthropic";
}

const seedIntegrations: Integration[] = legacyIntegrations.map((i) => ({
  id: asId(i.id),
  name: i.name,
  model: i.model,
  connected: i.connected,
  brandColor: i.brandColor,
  brandBg: i.brandBg,
  letter: i.letter,
}));

export interface IntegrationsSlice {
  integrations: Integration[];
  toggleIntegration: (id: Integration["id"]) => void;
  setIntegrationConnected: (id: Integration["id"], connected: boolean) => void;
}

export const createIntegrationsSlice: StateCreator<IntegrationsSlice> = (set) => ({
  integrations: seedIntegrations,
  toggleIntegration: (id) =>
    set((state) => ({
      integrations: state.integrations.map((it) =>
        it.id === id ? { ...it, connected: !it.connected } : it,
      ),
    })),
  setIntegrationConnected: (id, connected) =>
    set((state) => ({
      integrations: state.integrations.map((it) =>
        it.id === id ? { ...it, connected } : it,
      ),
    })),
});
