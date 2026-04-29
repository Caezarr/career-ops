import type { StateCreator } from "zustand";
import type { CV, CVTab } from "../types";
import { mockCVVariants as legacyCVs } from "../../data/cv";
import { uid } from "../utils";

const seedCVs: CV[] = legacyCVs.map((cv, i) => ({
  id: cv.id,
  name: cv.name,
  lastEdited: cv.lastEdited,
  fileType: cv.fileType,
  roleFocus: cv.roleFocus,
  atsScore: cv.atsScore,
  isDefault: i === 0,
}));

export interface TailoringTarget {
  role: string;
  baseCvId: string | null;
}

export interface CvsSlice {
  cvs: CV[];
  defaultCvId: string | null;
  selectedCvId: string | null;
  cvTab: CVTab;
  tailoringTarget: TailoringTarget;

  setSelectedCv: (id: string | null) => void;
  setCvTab: (tab: CVTab) => void;
  setDefaultCv: (id: string) => void;
  setTailoringTarget: (patch: Partial<TailoringTarget>) => void;

  createCV: (input: { name: string; roleFocus: string; atsScore?: number }) => CV;
  renameCV: (id: string, name: string) => void;
  deleteCV: (id: string) => void;
  duplicateCV: (id: string) => CV | null;
  /** Generic patch — used by ATS analysis to refresh atsScore, etc. */
  updateCv: (id: string, patch: Partial<Omit<CV, "id">>) => void;
}

export const createCvsSlice: StateCreator<CvsSlice> = (set, get) => ({
  cvs: seedCVs,
  defaultCvId: seedCVs[0]?.id ?? null,
  selectedCvId: seedCVs[0]?.id ?? null,
  cvTab: "manager",
  tailoringTarget: {
    role: "Strategy Associate · Bain & Company",
    baseCvId: seedCVs[0]?.id ?? null,
  },

  setSelectedCv: (id) => set({ selectedCvId: id }),
  setCvTab: (tab) => set({ cvTab: tab }),
  setDefaultCv: (id) =>
    set((state) => ({
      defaultCvId: id,
      cvs: state.cvs.map((cv) => ({ ...cv, isDefault: cv.id === id })),
    })),
  setTailoringTarget: (patch) =>
    set((state) => ({ tailoringTarget: { ...state.tailoringTarget, ...patch } })),

  createCV: (input) => {
    const cv: CV = {
      id: uid("cv"),
      name: input.name,
      lastEdited: "Just now",
      fileType: "PDF",
      roleFocus: input.roleFocus,
      atsScore: input.atsScore ?? 0,
      isDefault: false,
    };
    set((state) => ({ cvs: [cv, ...state.cvs] }));
    return cv;
  },

  renameCV: (id, name) =>
    set((state) => ({
      cvs: state.cvs.map((cv) =>
        cv.id === id ? { ...cv, name, lastEdited: "Just now" } : cv,
      ),
    })),

  deleteCV: (id) =>
    set((state) => {
      const cvs = state.cvs.filter((cv) => cv.id !== id);
      let defaultCvId = state.defaultCvId;
      if (defaultCvId === id) {
        defaultCvId = cvs[0]?.id ?? null;
        if (defaultCvId) {
          for (const cv of cvs) cv.isDefault = cv.id === defaultCvId;
        }
      }
      return {
        cvs,
        defaultCvId,
        selectedCvId:
          state.selectedCvId === id ? defaultCvId : state.selectedCvId,
      };
    }),

  duplicateCV: (id) => {
    const source = get().cvs.find((cv) => cv.id === id);
    if (!source) return null;
    const dup: CV = {
      ...source,
      id: uid("cv"),
      name: `${source.name} copy`,
      lastEdited: "Just now",
      isDefault: false,
    };
    set((state) => ({ cvs: [dup, ...state.cvs] }));
    return dup;
  },

  updateCv: (id, patch) =>
    set((state) => ({
      cvs: state.cvs.map((cv) =>
        cv.id === id ? { ...cv, ...patch, lastEdited: "Just now" } : cv,
      ),
    })),
});
