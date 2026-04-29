import type { StateCreator } from "zustand";
import type { CV, CVTab, StoreAtsAnalysis } from "../types";
import { mockCVVariants as legacyCVs } from "../../data/cv";
import { uid } from "../utils";

/** Variant-specific preview content so the right-panel reflects the selection
 *  and the AI ATS call has real text to score. Differentiated by role focus. */
const SEED_PREVIEW_BY_ROLE: Record<string, { summary: string; parsedText: string }> = {
  Consulting: {
    summary:
      "Consultant with 3+ years of experience in strategy and transactions. Proven track record of solving complex business problems and delivering measurable impact.",
    parsedText: [
      "GABRIEL RANCE",
      "Consultant",
      "gabrielrance@email.com  |  +33 6 12 34 56 78  |  Paris, France  |  LinkedIn",
      "",
      "SUMMARY",
      "Consultant with 3+ years of experience in strategy and transactions. Proven track record of solving complex business problems and delivering measurable impact.",
      "",
      "EXPERIENCE",
      "Consultant, Strategy & Operations — Monitor Deloitte, Paris (2022 – Present)",
      "- Led commercial due diligence for 5+ transactions with deal values up to €150M",
      "- Developed growth strategies that improved EBITDA by 12-18%",
      "- Built financial models and conducted market sizing for new market entry",
      "Business Analyst — Roland Berger, Paris (2020 – 2022)",
      "- Supported strategy projects across retail, industrials, and TMT sectors",
      "- Conducted competitor benchmarking and customer insights analysis",
      "- Prepared executive presentations for C-level stakeholders",
      "",
      "EDUCATION",
      "MSc in Management — HEC Paris (2020)",
      "BSc in Economics — University of Manchester (2018)",
    ].join("\n"),
  },
  "Product Management": {
    summary:
      "Product Manager with 4 years building B2B SaaS products from 0→1 and scaling them to 100k+ users. Strong on discovery, prioritization, and shipping with small teams.",
    parsedText: [
      "GABRIEL RANCE",
      "Product Manager",
      "gabrielrance@email.com  |  +33 6 12 34 56 78  |  Paris, France  |  LinkedIn",
      "",
      "SUMMARY",
      "Product Manager with 4 years building B2B SaaS products from 0→1 and scaling them to 100k+ users. Strong on discovery, prioritization, and shipping with small teams.",
      "",
      "EXPERIENCE",
      "Senior Product Manager — Acme SaaS, Paris (2022 – Present)",
      "- Owned the onboarding funnel; activation rate +24% in 6 months",
      "- Shipped a usage-based billing module that drove 18% ARR uplift",
      "- Hired and led a squad of 4 engineers + 1 designer",
      "Product Manager — Stack Inc., Paris (2020 – 2022)",
      "- Launched 0→1 internal-tools product, scaled to 12k weekly active users",
      "- Ran 60+ customer interviews and reduced churn by 9pp",
      "",
      "EDUCATION",
      "MSc in Management — HEC Paris (2020)",
      "BSc in Engineering — INSA Lyon (2018)",
    ].join("\n"),
  },
  "Finance / FP&A": {
    summary:
      "FP&A analyst with 3 years in transaction services and corporate finance. Modelling, forecasting and board-pack reporting for €1B+ portfolios.",
    parsedText: [
      "GABRIEL RANCE",
      "FP&A Analyst",
      "gabrielrance@email.com  |  +33 6 12 34 56 78  |  Paris, France  |  LinkedIn",
      "",
      "SUMMARY",
      "FP&A analyst with 3 years in transaction services and corporate finance. Modelling, forecasting and board-pack reporting for €1B+ portfolios.",
      "",
      "EXPERIENCE",
      "Senior FP&A Analyst — Bain Capital portco, Paris (2022 – Present)",
      "- Led monthly close + variance analysis for a €450M revenue business",
      "- Rebuilt the 3-statement model in Pigment; cut close cycle by 6 days",
      "- Owned the board pack and quarterly LP reporting",
      "Transaction Services Analyst — KPMG Deal Advisory (2020 – 2022)",
      "- Worked on 8 LBO due diligences (€50M – €1.2B EV)",
      "- Built quality-of-earnings analyses and management presentations",
      "",
      "EDUCATION",
      "MSc in Finance — ESCP Business School (2020)",
      "BSc in Economics — University of Manchester (2018)",
    ].join("\n"),
  },
  General: {
    summary:
      "Multi-disciplinary professional with experience across strategy, product and finance. Adaptable, strong on first-principles thinking and execution.",
    parsedText: [
      "GABRIEL RANCE",
      "Generalist",
      "gabrielrance@email.com  |  +33 6 12 34 56 78  |  Paris, France  |  LinkedIn",
      "",
      "SUMMARY",
      "Multi-disciplinary professional with experience across strategy, product and finance. Adaptable, strong on first-principles thinking and execution.",
      "",
      "EXPERIENCE",
      "Strategy & Operations — Monitor Deloitte, Paris (2022 – Present)",
      "- Cross-functional projects spanning M&A, product and ops",
      "- Built tooling that automated 30% of analyst workload",
      "Analyst — Various, Paris (2018 – 2022)",
      "- Multiple internships in PE, consulting and tech startups",
      "",
      "EDUCATION",
      "MSc in Management — HEC Paris (2020)",
      "BSc in Economics — University of Manchester (2018)",
    ].join("\n"),
  },
};

function previewFor(roleFocus: string): { summary: string; parsedText: string } {
  return SEED_PREVIEW_BY_ROLE[roleFocus] ?? SEED_PREVIEW_BY_ROLE["General"];
}

/** Returns the CV's parsed text, falling back to the role-based seed for
 *  CVs that were persisted before this field existed (legacy localStorage). */
export function getCvParsedText(cv: { roleFocus: string; parsedText?: string }): string {
  const own = (cv.parsedText ?? "").trim();
  if (own) return own;
  return previewFor(cv.roleFocus).parsedText;
}

/** Same logic for the variant summary line. */
export function getCvSummary(cv: { roleFocus: string; summary?: string }): string {
  const own = (cv.summary ?? "").trim();
  if (own) return own;
  return previewFor(cv.roleFocus).summary;
}

const seedCVs: CV[] = legacyCVs.map((cv, i) => {
  const preview = previewFor(cv.roleFocus);
  return {
    id: cv.id,
    name: cv.name,
    lastEdited: cv.lastEdited,
    fileType: cv.fileType,
    roleFocus: cv.roleFocus,
    atsScore: cv.atsScore,
    isDefault: i === 0,
    summary: preview.summary,
    parsedText: preview.parsedText,
  };
});

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
  /** Last AI ATS analysis result keyed by CV id. Read by Strengths /
   *  AI suggestions / Tailoring workspace cards so they show real data
   *  after the user runs Analyze match (instead of static mock). */
  atsByCv: Record<string, StoreAtsAnalysis>;

  setSelectedCv: (id: string | null) => void;
  setCvTab: (tab: CVTab) => void;
  setDefaultCv: (id: string) => void;
  setTailoringTarget: (patch: Partial<TailoringTarget>) => void;
  setAtsAnalysis: (cvId: string, analysis: StoreAtsAnalysis) => void;
  clearAtsAnalysis: (cvId: string) => void;

  createCV: (input: {
    name: string;
    roleFocus: string;
    atsScore?: number;
    parsedText?: string;
    summary?: string;
  }) => CV;
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
  atsByCv: {},

  setSelectedCv: (id) => set({ selectedCvId: id }),
  setCvTab: (tab) => set({ cvTab: tab }),
  setDefaultCv: (id) =>
    set((state) => ({
      defaultCvId: id,
      cvs: state.cvs.map((cv) => ({ ...cv, isDefault: cv.id === id })),
    })),
  setTailoringTarget: (patch) =>
    set((state) => ({ tailoringTarget: { ...state.tailoringTarget, ...patch } })),
  setAtsAnalysis: (cvId, analysis) =>
    set((state) => ({ atsByCv: { ...state.atsByCv, [cvId]: analysis } })),
  clearAtsAnalysis: (cvId) =>
    set((state) => {
      const next = { ...state.atsByCv };
      delete next[cvId];
      return { atsByCv: next };
    }),

  createCV: (input) => {
    const fallback = previewFor(input.roleFocus);
    const cv: CV = {
      id: uid("cv"),
      name: input.name,
      lastEdited: "Just now",
      fileType: "PDF",
      roleFocus: input.roleFocus,
      atsScore: input.atsScore ?? 0,
      isDefault: false,
      summary: input.summary ?? fallback.summary,
      parsedText: input.parsedText ?? fallback.parsedText,
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
