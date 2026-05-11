/**
 * Demo seed — one-click populate for screenshots, screen-recordings,
 * and demo videos.
 *
 * Triggered from Settings → Danger zone → "Charger données démo".
 * Wipes the store of any existing user content and fills it with:
 *   • 40 jobs + 40 applications spread across the 5 pipeline stages
 *   • 1 default CV (Consulting role focus, ATS-friendly summary)
 *   • 1 cached ATS analysis pinned to that CV (score 94 / projected 97)
 *   • 1 active Copilot session (mode=qa, mid-interview state) with
 *     realistic transcript + answers + an in-flight pending answer
 *
 * The seed deliberately mixes MBB consulting, IB / PE, FAANG, AI labs,
 * and French / EU unicorns so the visible logos in the pipeline cover
 * every ICP segment Career OS targets.
 *
 * Two of the applications carry a `nextStep` starting with
 * "Relance auto · J+N" — the Pipeline card UI renders a small pill
 * when it sees that prefix, so screenshots show the "auto-reminder"
 * feature without needing a real scheduler running.
 *
 * `clearDemoSeed()` resets the store back to the post-onboarding
 * fresh-install state.
 */

import { useAppStore } from "../store";
import type {
  Application,
  ApplicationStage,
  CV,
  Job,
  StoreAtsAnalysis,
} from "../store/types";
import type {
  CopilotAnswerEntry,
  CopilotSession,
  CopilotTranscriptItem,
} from "../store/slices/copilotSessions";

// ─── Helpers ──────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function daysAgo(n: number): number {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}

function fmtDate(epoch: number): string {
  const d = new Date(epoch);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtDateTime(epoch: number): string {
  const d = new Date(epoch);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtRelative(epoch: number): string {
  const diff = Date.now() - epoch;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "Just now";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

// ─── 40-card pipeline definition ──────────────────────────────────────────

interface SeedRow {
  company: string;
  role: string;
  stage: ApplicationStage;
  match: number;
  /** Days ago the application was created. */
  daysAgo: number;
  /** Optional override for `nextStep`. When it starts with "Relance auto"
   *  the Pipeline card UI renders a small pill. */
  nextStep?: string;
  /** Visible in the Interview column header on the card. */
  ongoing?: boolean;
  salaryMin: number;
  salaryMax: number;
  location?: string;
}

// 40 rows, distribution: 15 / 12 / 7 / 4 / 2  (Sourced / Applied / Phone /
// Interview / Offer). Conical funnel — top-of-funnel widest, offer narrowest.
const ROWS: SeedRow[] = [
  // ── Sourced (15) ────────────────────────────────────────────────────
  { company: "Bain & Company", role: "Associate Consultant", stage: "sourced", match: 88, daysAgo: 1, salaryMin: 70000, salaryMax: 90000, location: "Paris" },
  { company: "BCG", role: "Associate Consultant", stage: "sourced", match: 87, daysAgo: 1, salaryMin: 70000, salaryMax: 92000, location: "Paris" },
  { company: "Oliver Wyman", role: "Senior Associate", stage: "sourced", match: 83, daysAgo: 2, salaryMin: 75000, salaryMax: 95000, location: "Paris" },
  { company: "Lazard", role: "M&A Associate", stage: "sourced", match: 81, daysAgo: 2, salaryMin: 90000, salaryMax: 120000, location: "Paris" },
  { company: "Apple", role: "Product Strategy Associate", stage: "sourced", match: 79, daysAgo: 2, salaryMin: 95000, salaryMax: 130000, location: "Paris" },
  { company: "Microsoft", role: "Senior Product Manager", stage: "sourced", match: 84, daysAgo: 3, salaryMin: 90000, salaryMax: 130000, location: "Paris" },
  { company: "Vercel", role: "Strategy & Ops Lead", stage: "sourced", match: 82, daysAgo: 3, salaryMin: 95000, salaryMax: 140000, location: "Remote · EU" },
  { company: "Cohere", role: "Product Manager", stage: "sourced", match: 86, daysAgo: 3, salaryMin: 110000, salaryMax: 150000, location: "London / Remote" },
  { company: "Datadog", role: "Product Marketing Manager", stage: "sourced", match: 76, daysAgo: 4, salaryMin: 85000, salaryMax: 115000, location: "Paris" },
  { company: "Snowflake", role: "Solutions Engineer", stage: "sourced", match: 73, daysAgo: 4, salaryMin: 90000, salaryMax: 120000, location: "Paris" },
  { company: "Linear", role: "Product Operations", stage: "sourced", match: 80, daysAgo: 5, salaryMin: 95000, salaryMax: 135000, location: "Remote" },
  { company: "Back Market", role: "Senior PM", stage: "sourced", match: 78, daysAgo: 5, salaryMin: 80000, salaryMax: 110000, location: "Paris" },
  { company: "Doctolib", role: "Strategy Manager", stage: "sourced", match: 85, daysAgo: 6, salaryMin: 75000, salaryMax: 105000, location: "Paris" },
  { company: "Ardian", role: "Investment Analyst", stage: "sourced", match: 82, daysAgo: 6, salaryMin: 85000, salaryMax: 115000, location: "Paris" },
  { company: "Sequoia Capital", role: "Investor Associate", stage: "sourced", match: 77, daysAgo: 7, salaryMin: 110000, salaryMax: 150000, location: "London" },

  // ── Applied (12) ────────────────────────────────────────────────────
  { company: "McKinsey & Company", role: "Business Analyst", stage: "applied", match: 92, daysAgo: 8, salaryMin: 70000, salaryMax: 90000, location: "Paris" },
  { company: "JPMorgan", role: "Analyst, IBD", stage: "applied", match: 88, daysAgo: 9, salaryMin: 85000, salaryMax: 110000, location: "Paris" },
  { company: "Anthropic", role: "Product Manager", stage: "applied", match: 95, daysAgo: 9, salaryMin: 140000, salaryMax: 200000, location: "London / Remote" },
  { company: "Hugging Face", role: "Product Lead", stage: "applied", match: 89, daysAgo: 10, salaryMin: 120000, salaryMax: 170000, location: "Paris / Remote" },
  { company: "OpenAI", role: "Product Manager", stage: "applied", match: 93, daysAgo: 11, salaryMin: 150000, salaryMax: 210000, location: "London / Remote" },
  { company: "Stripe", role: "Strategy & Ops", stage: "applied", match: 90, daysAgo: 12, salaryMin: 100000, salaryMax: 145000, location: "Dublin / Remote" },
  { company: "Notion", role: "Product Marketing Manager", stage: "applied", match: 84, daysAgo: 13, salaryMin: 95000, salaryMax: 135000, location: "Remote" },
  { company: "Figma", role: "Strategy Lead", stage: "applied", match: 86, daysAgo: 14, salaryMin: 110000, salaryMax: 155000, location: "London" },
  { company: "Mirakl", role: "Senior Strategy Manager", stage: "applied", match: 82, daysAgo: 14, salaryMin: 80000, salaryMax: 115000, location: "Paris" },
  {
    // ★ Relance auto J+3 — visible pill on the card.
    company: "Pennylane",
    role: "Product Manager",
    stage: "applied",
    match: 87,
    daysAgo: 15,
    nextStep: "Relance auto · J+3",
    salaryMin: 75000,
    salaryMax: 100000,
    location: "Paris",
  },
  { company: "Qonto", role: "Senior PM", stage: "applied", match: 85, daysAgo: 16, salaryMin: 80000, salaryMax: 110000, location: "Paris" },
  { company: "Alan", role: "Strategy & Ops", stage: "applied", match: 81, daysAgo: 18, salaryMin: 70000, salaryMax: 95000, location: "Paris" },

  // ── Phone Screen (7) ────────────────────────────────────────────────
  { company: "Goldman Sachs", role: "Associate, IBD", stage: "phone_screen", match: 91, daysAgo: 19, salaryMin: 95000, salaryMax: 130000, location: "London / Paris" },
  { company: "Mistral AI", role: "AI Product Lead", stage: "phone_screen", match: 94, daysAgo: 20, salaryMin: 130000, salaryMax: 190000, location: "Paris" },
  { company: "Roland Berger", role: "Senior Consultant", stage: "phone_screen", match: 86, daysAgo: 20, salaryMin: 75000, salaryMax: 105000, location: "Paris" },
  {
    // ★ Relance auto J+7 — visible pill on the card.
    company: "Amazon",
    role: "Senior PM",
    stage: "phone_screen",
    match: 88,
    daysAgo: 21,
    nextStep: "Relance auto · J+7",
    salaryMin: 105000,
    salaryMax: 145000,
    location: "Luxembourg / Remote",
  },
  { company: "Google", role: "Product Strategist", stage: "phone_screen", match: 89, daysAgo: 22, salaryMin: 110000, salaryMax: 150000, location: "Paris" },
  { company: "Meta", role: "Strategy & Ops", stage: "phone_screen", match: 85, daysAgo: 23, salaryMin: 105000, salaryMax: 145000, location: "London" },
  { company: "Rothschild & Co", role: "M&A Associate", stage: "phone_screen", match: 87, daysAgo: 24, salaryMin: 90000, salaryMax: 120000, location: "Paris" },

  // ── Interview (4) ───────────────────────────────────────────────────
  {
    // ongoing — final round tomorrow.
    company: "OpenAI",
    role: "Product Manager",
    stage: "interview",
    match: 96,
    daysAgo: 25,
    ongoing: true,
    salaryMin: 150000,
    salaryMax: 210000,
    location: "London / Remote",
  },
  { company: "Mistral AI", role: "AI Product Lead", stage: "interview", match: 94, daysAgo: 26, salaryMin: 130000, salaryMax: 190000, location: "Paris" },
  { company: "McKinsey & Company", role: "Business Analyst", stage: "interview", match: 92, daysAgo: 28, salaryMin: 70000, salaryMax: 90000, location: "Paris" },
  { company: "Anthropic", role: "Product Manager", stage: "interview", match: 95, daysAgo: 29, salaryMin: 140000, salaryMax: 200000, location: "London / Remote" },

  // ── Offer (2) ───────────────────────────────────────────────────────
  { company: "Stripe", role: "Strategy & Ops", stage: "offer", match: 90, daysAgo: 33, salaryMin: 100000, salaryMax: 145000, location: "Dublin / Remote" },
  { company: "Bain & Company", role: "Associate Consultant", stage: "offer", match: 95, daysAgo: 35, salaryMin: 70000, salaryMax: 90000, location: "Paris" },
];

// ─── Build jobs + applications ────────────────────────────────────────────

function buildJobsAndApplications(): { jobs: Job[]; applications: Application[] } {
  const jobs: Job[] = [];
  const applications: Application[] = [];

  for (const row of ROWS) {
    const jobId = uid("job");
    const appliedAt = daysAgo(row.daysAgo);
    const lastActivityAt = appliedAt + 1000 * 60 * 60 * 6; // 6h after applied
    const job: Job = {
      id: jobId,
      role: row.role,
      company: row.company,
      location: row.location ?? "Paris",
      salaryMin: row.salaryMin,
      salaryMax: row.salaryMax,
      salaryCurrency: "EUR",
      match: row.match,
      postedAgo: fmtRelative(daysAgo(row.daysAgo + 2)),
      verified: row.match >= 88,
      bookmarked: row.stage !== "sourced",
      workMode: row.location?.toLowerCase().includes("remote") ? "Remote" : "Hybrid",
      type: "Full-time",
      avatarColor: "#6366f1",
      avatarLabel: row.company
        .replace(/&/g, "")
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    };
    jobs.push(job);

    const app: Application = {
      id: uid("app"),
      jobId,
      stage: row.stage,
      appliedDate: fmtDate(appliedAt),
      appliedAt,
      lastActivity: fmtRelative(lastActivityAt),
      lastActivityAt,
      match: row.match,
      nextStep:
        row.nextStep ??
        (row.stage === "offer"
          ? "Négocier le package"
          : row.stage === "interview"
          ? "Préparer la prochaine round"
          : row.stage === "phone_screen"
          ? "Préparer le call recruteur"
          : row.stage === "applied"
          ? "Attendre retour"
          : "Adapter le CV à l'offre"),
      archived: false,
      notes: "",
      salary: `${row.salaryMin / 1000}–${row.salaryMax / 1000} k€`,
      workMode: job.workMode,
      materials: [],
      timeline: [
        {
          id: uid("evt"),
          title: "Applied",
          date: fmtDateTime(appliedAt),
          icon: "check",
          state: "done",
        },
      ],
      aiNextSteps: [],
    };
    applications.push(app);
  }

  return { jobs, applications };
}

// ─── CV + ATS analysis ────────────────────────────────────────────────────

function buildCvAndAts(): { cv: CV; ats: StoreAtsAnalysis } {
  const cvId = uid("cv");
  const parsedText = [
    "GABRIEL RANCE",
    "Associate Consultant · Paris, France",
    "gabrielrance@email.com  ·  +33 6 12 34 56 78  ·  LinkedIn",
    "",
    "SUMMARY",
    "Associate-level consultant targeting MBB and top-tier strategy firms. 3+ years",
    "of commercial due diligence, growth strategy and operational improvement across",
    "TMT, retail and industrials. Built financial models for 5+ transactions with",
    "deal values up to €150M. Native French, fluent English.",
    "",
    "EXPERIENCE",
    "Senior Consultant — Monitor Deloitte, Paris (2023 – Present)",
    "- Led commercial DD on 5 transactions (EV €50M–€150M), advised 3 PE funds",
    "- Built growth strategy that lifted EBITDA by 14–18% on 2 portco engagements",
    "- Hired & onboarded 4 junior analysts; ran weekly capability workshops",
    "Business Analyst — Roland Berger, Paris (2021 – 2023)",
    "- 12+ strategy projects across retail, industrials, TMT (clients €200M–€2B revenue)",
    "- Built competitor benchmarking framework reused on 18 subsequent projects",
    "- Co-authored 2 white papers on European energy transition (cited by FT)",
    "",
    "EDUCATION",
    "MSc in Management — HEC Paris (2021) — Top 5% of class",
    "Exchange — London School of Economics (2020)",
    "BSc in Economics — Sciences Po Paris (2019) — Magna Cum Laude",
    "",
    "SKILLS",
    "Strategy · Financial Modelling · Commercial DD · Excel · PowerPoint · Tableau",
    "· SQL (intermediate) · Python (basic) · French (native) · English (fluent)",
  ].join("\n");

  const cv: CV = {
    id: cvId,
    name: "CV — Associate Consultant MBB",
    lastEdited: "Just now",
    fileType: "PDF",
    roleFocus: "Consulting",
    atsScore: 94,
    isDefault: true,
    summary:
      "Associate-level consultant targeting MBB and top-tier strategy firms. 3+ years of commercial due diligence, growth strategy and operational improvement across TMT, retail and industrials.",
    parsedText,
  };

  const ats: StoreAtsAnalysis = {
    atsScore: 94,
    matchScore: 91,
    projectedAtsScore: 97,
    strengths: [
      "Mots-clés alignés sur l'annonce : 'commercial due diligence', 'growth strategy', 'EBITDA'",
      "Quantification systématique des résultats (€, %, n)",
      "Structure linéaire 1-colonne — passe sans souci les ATS Workday / Taleo",
      "Format date cohérent (2023 – Present) lisible par tous les parseurs",
    ],
    weaknesses: [
      "Section Skills un peu longue — viser 10-12 entrées max",
      "Aucun side project ou contribution open-source visible",
      "Pas de stat de leadership chiffré sur le management des analystes",
    ],
    missingKeywords: [
      "Operating model",
      "Synergy capture",
      "Carve-out",
      "Vendor due diligence",
    ],
    suggestions: [
      {
        type: "reword",
        original: "Led commercial DD on 5 transactions",
        suggested:
          "Led commercial due diligence on 5 PE-backed transactions (EV €50M–€150M), delivering 3 buy-side recommendations",
        rationale:
          "Garde la formulation longue 'commercial due diligence' que l'ATS Bain attend, et précise le canal (PE-backed).",
      },
      {
        type: "add",
        original: "",
        suggested:
          "Vendor due diligence — supported sell-side process on a €120M industrial carve-out (operating model + synergy capture)",
        rationale:
          "Ajoute 3 mots-clés ATS critiques (vendor DD, carve-out, synergy capture) qui manquent à ton CV.",
      },
      {
        type: "reword",
        original: "Hired & onboarded 4 junior analysts",
        suggested:
          "Recruited and onboarded 4 junior analysts (12 to 4 weeks ramp-up); 75% promoted within 18 months",
        rationale:
          "Ajoute une stat de leadership chiffrée — les screeners Bain notent explicitement le 'people impact'.",
      },
    ],
    scoreBefore: 88,
    ranAt: Date.now() - 1000 * 60 * 5, // 5 minutes ago
    jdSnippet:
      "Bain & Company is hiring Associate Consultants for its Paris office. The role requires 2–4 years of experience in commercial due diligence, M&A advisory or strategy consulting, with proven track record on €50M+ transactions...",
  };

  return { cv, ats };
}

// ─── Active Copilot session ───────────────────────────────────────────────

function buildCopilotSession(): {
  session: CopilotSession;
  pendingTranscript: string;
  pendingAnswer: string;
} {
  const sessionId = uid("cs");
  const startedAt = Date.now() - 1000 * 60 * 14; // 14 minutes ago

  const transcript: CopilotTranscriptItem[] = [
    {
      id: uid("tr"),
      at: startedAt + 1000 * 30,
      speaker: "system",
      text: "Session démarrée · Mode Q&A · CV Consulting MBB en contexte",
    },
    {
      id: uid("tr"),
      at: startedAt + 1000 * 60,
      speaker: "recruiter",
      text:
        "Pour commencer, peux-tu me parler d'une fois où tu as dû convaincre un groupe d'adopter une direction qu'ils refusaient initialement ?",
      speakerLabel: "Marie L., Partner Bain",
    },
    {
      id: uid("tr"),
      at: startedAt + 1000 * 60 * 4,
      speaker: "recruiter",
      text:
        "Très bien. Maintenant un mini-cas. Un client de retail français — chiffre d'affaires ~800 M€ — voit ses ventes baisser de 8 % sur 18 mois. Par quelles questions tu commences ?",
      speakerLabel: "Marie L., Partner Bain",
    },
  ];

  const answers: CopilotAnswerEntry[] = [
    {
      id: uid("an"),
      at: startedAt + 1000 * 60 * 1.5,
      text:
        "Sur mon dernier projet chez Monitor, j'ai dû convaincre une équipe ops historique de l'industriel France d'adopter notre nouveau pricing model. La résistance venait du fait qu'ils avaient maintenu la grille à la main depuis 8 ans. Plutôt que d'imposer, j'ai (1) passé 2 semaines en immersion à comprendre leur logique, (2) co-construit avec eux 3 scénarios chiffrés en atelier, (3) laissé l'un des seniors présenter le scénario gagnant au COMEX. Résultat : +6 pts de marge sur 9 mois, et l'équipe ops devenue ambassadrice du modèle.",
      mode: "qa",
      questionTranscriptId: transcript[1]?.id,
    },
  ];

  const session: CopilotSession = {
    id: sessionId,
    startedAt,
    endedAt: null,
    mode: "qa",
    company: "Bain & Company",
    role: "Associate Consultant",
    transcript,
    answers,
  };

  // In-flight pending answer — Claude is mid-stream on Q2.
  const pendingAnswer =
    "Je commencerais par cadrer la baisse avant d'attaquer les causes. Trois questions, dans cet ordre :\n\n" +
    "1. **Quelle est la nature de la baisse ?** Volume ou prix mix ? Sur tous les canaux (physique vs e-commerce) ou seulement certains ? Sur toutes les catégories ou concentrée sur 2-3 produits ?\n\n" +
    "2. **Le marché a-t-il bougé en parallèle ?** Si le secteur retail FR a baissé de 7 % sur la même période, c'est macro — on cherche à limiter la casse. Si le secteur est stable ou en croissance, c'est idiosyncratique et on creuse le client.\n\n" +
    "3. **Quels sont les drivers internes ?** Trois pistes à éliminer : (a) un changement de stratégie pricing/promo récent, (b) une perte de couverture distribution, (c) un";

  const pendingTranscript = "";

  return { session, pendingAnswer, pendingTranscript };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Wipe the store of user content and replace with a curated demo seed.
 * Intended for screenshots / screen-recordings / partner demos.
 * No-op safe to call multiple times — fully overwrites previous demo data.
 */
export function loadDemoSeed(): void {
  const { jobs, applications } = buildJobsAndApplications();
  const { cv, ats } = buildCvAndAts();
  const { session, pendingAnswer, pendingTranscript } = buildCopilotSession();

  useAppStore.setState({
    jobs,
    applications,
    cvs: [cv],
    defaultCvId: cv.id,
    selectedCvId: cv.id,
    atsByCv: { [cv.id]: ats },
    copilotSessions: [session],
    activeSessionId: session.id,
    copilotStatus: "thinking",
    pendingTranscript,
    pendingAnswer,
    copilotError: null,
    selectedApplicationId: applications[0]?.id ?? null,
  });

  // Best-effort: also set the persisted Claude model on the
  // ic-config blob so the model bar shows "Claude Sonnet 4.5".
  try {
    const raw = window.localStorage.getItem("ic-config");
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.model = "Claude Sonnet 4.5";
    window.localStorage.setItem("ic-config", JSON.stringify(parsed));
  } catch {
    // private mode — ignore
  }
}

/**
 * Reset the store to the post-onboarding fresh-install state. Removes
 * all demo data, including the active Copilot session.
 */
export function clearDemoSeed(): void {
  useAppStore.setState({
    jobs: [],
    applications: [],
    cvs: [],
    defaultCvId: null,
    selectedCvId: null,
    atsByCv: {},
    copilotSessions: [],
    activeSessionId: null,
    copilotStatus: "idle",
    pendingTranscript: "",
    pendingAnswer: "",
    copilotError: null,
    selectedApplicationId: null,
  });
}
