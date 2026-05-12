/**
 * Demo seed — one-click populate for screenshots, screen-recordings,
 * and demo videos.
 *
 * Triggered from Settings → Danger zone → "Charger données démo".
 * Wipes the store of any existing user content and fills it with:
 *   • Gabriel Rance user profile (school, persona, target tracks)
 *   • 40 jobs + 40 applications across 5 pipeline stages, with
 *     timestamps that yield realistic Dashboard stats
 *   • 3 CV variants (Consulting MBB / Product Tech / Strategy)
 *   • 1 cached ATS analysis pinned to the active CV (score 94 → 97)
 *   • 1 active Copilot session (mode=qa, mid-interview state) with
 *     realistic transcript + answers + an in-flight pending answer
 *   • 4 today-tasks
 *   • 5 notifications (2 unread)
 *
 * Dashboard stats are derived from the applications array, so the
 * `lastActivityAt` field is set per stage to produce believable
 * numbers:
 *   – Active applications: 40
 *   – Interviews this week: 3 (3 of the 4 interview cards have a
 *     last-activity timestamp inside the past 7 days)
 *   – Response rate: ~52% (13 responded / 25 non-sourced)
 *   – Avg time to reply: ~8 days
 *
 * Two applications carry a `nextStep` starting with "Relance auto · J+N" —
 * the Pipeline card UI renders a bell pill when it sees that prefix,
 * so screenshots show the "auto-reminder" feature without needing a
 * real scheduler running.
 *
 * `clearDemoSeed()` resets the store back to the post-onboarding
 * fresh-install state.
 */

import { useAppStore } from "../store";
import type {
  Application,
  ApplicationStage,
  CV,
  DashboardTask,
  Job,
  Notification,
  StoreAtsAnalysis,
  TimelineEvent,
  User,
} from "../store/types";
import type {
  CopilotAnswerEntry,
  CopilotSession,
  CopilotTranscriptItem,
} from "../store/slices/copilotSessions";

// Logo resolution happens entirely inside CompanyAvatar via
// `import.meta.glob` — we don't set `companyLogoUrl` here. Any file
// matching `trust-<slug>.{svg,png,jpg,jpeg,webp}` dropped in
// `assets/companies/` is auto-detected at build time.

// ─── Helpers ──────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const ONE_DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number, hourOffset = 0): number {
  return Date.now() - n * ONE_DAY + hourOffset * 60 * 60 * 1000;
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
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / ONE_DAY);
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
  /** Days between applied date and last activity (= stage change).
   *  Set to 0 for sourced/applied (no transition yet). */
  activityLag?: number;
  /** Optional override for `nextStep`. When it starts with "Relance auto"
   *  the Pipeline card UI renders a small pill. */
  nextStep?: string;
  /** Visible in the Interview column header on the card. */
  ongoing?: boolean;
  salaryMin: number;
  salaryMax: number;
  location?: string;
}

// 40 rows. Funnel: 15 / 12 / 7 / 4 / 2  (Sourced / Applied / Phone /
// Interview / Offer). The activityLag determines `lastActivityAt`:
// for the dashboard stats to read well, 3 interview cards must land
// inside the past 7 days (= they "responded this week").
const ROWS: SeedRow[] = [
  // ── Sourced (15) — no transition yet ────────────────────────────────
  { company: "Bain & Company", role: "Associate Consultant", stage: "sourced", match: 88, daysAgo: 1, salaryMin: 70000, salaryMax: 90000, location: "Paris" },
  { company: "BCG", role: "Associate Consultant", stage: "sourced", match: 87, daysAgo: 1, salaryMin: 70000, salaryMax: 92000, location: "Paris" },
  { company: "Oliver Wyman", role: "Senior Associate", stage: "sourced", match: 83, daysAgo: 2, salaryMin: 75000, salaryMax: 95000, location: "Paris" },
  { company: "Lazard", role: "M&A Associate", stage: "sourced", match: 81, daysAgo: 2, salaryMin: 90000, salaryMax: 120000, location: "Paris" },
  { company: "Apple", role: "Product Strategy Associate", stage: "sourced", match: 79, daysAgo: 2, salaryMin: 95000, salaryMax: 130000, location: "Paris" },
  { company: "Microsoft", role: "Senior Product Manager", stage: "sourced", match: 84, daysAgo: 3, salaryMin: 90000, salaryMax: 130000, location: "Paris" },
  { company: "Vercel", role: "Strategy & Ops Lead", stage: "sourced", match: 82, daysAgo: 3, salaryMin: 95000, salaryMax: 140000, location: "Remote · EU" },
  { company: "Cohere", role: "Product Manager", stage: "sourced", match: 86, daysAgo: 3, salaryMin: 110000, salaryMax: 150000, location: "London / Remote" },
  { company: "Datadog", role: "Product Marketing Manager", stage: "sourced", match: 76, daysAgo: 4, salaryMin: 85000, salaryMax: 115000, location: "Paris" },
  { company: "Salesforce", role: "Senior Product Manager", stage: "sourced", match: 79, daysAgo: 4, salaryMin: 95000, salaryMax: 130000, location: "Paris" },
  { company: "Snowflake", role: "Solutions Engineer", stage: "sourced", match: 73, daysAgo: 4, salaryMin: 90000, salaryMax: 120000, location: "Paris" },
  { company: "Linear", role: "Product Operations", stage: "sourced", match: 80, daysAgo: 5, salaryMin: 95000, salaryMax: 135000, location: "Remote" },
  { company: "Back Market", role: "Senior PM", stage: "sourced", match: 78, daysAgo: 5, salaryMin: 80000, salaryMax: 110000, location: "Paris" },
  { company: "Doctolib", role: "Strategy Manager", stage: "sourced", match: 85, daysAgo: 6, salaryMin: 75000, salaryMax: 105000, location: "Paris" },
  { company: "Ardian", role: "Investment Analyst", stage: "sourced", match: 82, daysAgo: 6, salaryMin: 85000, salaryMax: 115000, location: "Paris" },
  { company: "Sequoia Capital", role: "Investor Associate", stage: "sourced", match: 77, daysAgo: 7, salaryMin: 110000, salaryMax: 150000, location: "London" },

  // ── Applied (12) — applied but no response yet ──────────────────────
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

  // ── Phone Screen (7) — got the recruiter call ~5 days after applying
  { company: "Goldman Sachs", role: "Associate, IBD", stage: "phone_screen", match: 91, daysAgo: 19, activityLag: 5, salaryMin: 95000, salaryMax: 130000, location: "London / Paris" },
  { company: "Mistral AI", role: "AI Product Lead", stage: "phone_screen", match: 94, daysAgo: 20, activityLag: 6, salaryMin: 130000, salaryMax: 190000, location: "Paris" },
  { company: "Roland Berger", role: "Senior Consultant", stage: "phone_screen", match: 86, daysAgo: 20, activityLag: 4, salaryMin: 75000, salaryMax: 105000, location: "Paris" },
  {
    // ★ Relance auto J+7 — visible pill on the card.
    company: "Amazon",
    role: "Senior PM",
    stage: "phone_screen",
    match: 88,
    daysAgo: 21,
    activityLag: 6,
    nextStep: "Relance auto · J+7",
    salaryMin: 105000,
    salaryMax: 145000,
    location: "Luxembourg / Remote",
  },
  { company: "Google", role: "Product Strategist", stage: "phone_screen", match: 89, daysAgo: 22, activityLag: 5, salaryMin: 110000, salaryMax: 150000, location: "Paris" },
  { company: "Meta", role: "Strategy & Ops", stage: "phone_screen", match: 85, daysAgo: 23, activityLag: 7, salaryMin: 105000, salaryMax: 145000, location: "London" },
  { company: "Rothschild & Co", role: "M&A Associate", stage: "phone_screen", match: 87, daysAgo: 24, activityLag: 5, salaryMin: 90000, salaryMax: 120000, location: "Paris" },

  // ── Interview (4) — 3 of which had their last move IN the past 7 days
  //    (= "interviews this week" stat reads 3) ──────────────────────────
  {
    // ongoing final round — moved to Interview 2 days ago
    company: "OpenAI",
    role: "Product Manager",
    stage: "interview",
    match: 96,
    daysAgo: 25,
    activityLag: 23, // → lastActivityAt = today - 2 days  (this week ✓)
    ongoing: true,
    salaryMin: 150000,
    salaryMax: 210000,
    location: "London / Remote",
  },
  {
    company: "Mistral AI",
    role: "AI Product Lead",
    stage: "interview",
    match: 94,
    daysAgo: 26,
    activityLag: 22, // → today - 4 days  (this week ✓)
    salaryMin: 130000,
    salaryMax: 190000,
    location: "Paris",
  },
  {
    company: "McKinsey & Company",
    role: "Business Analyst",
    stage: "interview",
    match: 92,
    daysAgo: 28,
    activityLag: 22, // → today - 6 days  (this week ✓)
    salaryMin: 70000,
    salaryMax: 90000,
    location: "Paris",
  },
  {
    // Older transition — not in "this week"
    company: "Anthropic",
    role: "Product Manager",
    stage: "interview",
    match: 95,
    daysAgo: 29,
    activityLag: 18, // → today - 11 days
    salaryMin: 140000,
    salaryMax: 200000,
    location: "London / Remote",
  },

  // ── Offer (2) — landed an offer 4-5 days ago ────────────────────────
  {
    company: "Stripe",
    role: "Strategy & Ops",
    stage: "offer",
    match: 90,
    daysAgo: 33,
    activityLag: 28, // → today - 5 days
    salaryMin: 100000,
    salaryMax: 145000,
    location: "Dublin / Remote",
  },
  {
    company: "Bain & Company",
    role: "Associate Consultant",
    stage: "offer",
    match: 95,
    daysAgo: 35,
    activityLag: 31, // → today - 4 days
    salaryMin: 70000,
    salaryMax: 90000,
    location: "Paris",
  },
];

// ─── Build jobs + applications ────────────────────────────────────────────

function buildJobsAndApplications(): { jobs: Job[]; applications: Application[] } {
  const jobs: Job[] = [];
  const applications: Application[] = [];

  for (const row of ROWS) {
    const jobId = uid("job");
    const appliedAt = daysAgo(row.daysAgo);
    // Stage-aware lastActivityAt — drives the dashboard stats hook.
    const lastActivityAt =
      row.activityLag != null
        ? appliedAt + row.activityLag * ONE_DAY
        : appliedAt;

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

    // Build a realistic timeline: Applied event, then a stage event if
    // the application moved past 'applied'.
    const timeline: TimelineEvent[] = [
      {
        id: uid("evt"),
        title: "Applied",
        date: fmtDateTime(appliedAt),
        icon: "check",
        state: "done",
      },
    ];
    if (row.activityLag != null) {
      const stageLabel: Record<ApplicationStage, string> = {
        sourced: "Sourced",
        applied: "Applied",
        phone_screen: "Phone screen scheduled",
        interview: "Moved to interview",
        offer: "Offer received",
        rejected: "Rejected",
      };
      timeline.unshift({
        id: uid("evt"),
        title: stageLabel[row.stage],
        date: fmtDateTime(lastActivityAt),
        icon: row.stage === "offer" ? "check" : "calendar",
        state: "done",
      });
    }

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
      timeline,
      aiNextSteps: [],
    };
    applications.push(app);
  }

  return { jobs, applications };
}

// ─── User profile ─────────────────────────────────────────────────────────

function buildUser(): User {
  return {
    name: "Gabriel Rance",
    email: "gabranpro@gmail.com",
    plan: "free",
    persona: "consulting",
    timezone: "Europe/Paris",
    language: "fr",
    location: "Paris, France",
    avatarInitials: "GR",
    targetRole: "Associate Consultant",
    targetCompany: "Bain & Company",
    phone: "+33 6 12 34 56 78",
    linkedin: "https://www.linkedin.com/in/gabriel-rance",
    github: "https://github.com/Caezarr",
    profileMarkdown: [
      "# Quick story",
      "3+ years across strategy consulting and PE-backed operations. Currently at Monitor Deloitte covering commercial due diligence on €50-150M transactions. Looking to step up to an Associate Consultant role at Bain, BCG or McKinsey before pivoting back operator-side in 3-5 years.",
      "",
      "# Highlights every CV should surface",
      "- Led commercial DD on 5 PE-backed transactions (TMT + industrials)",
      "- Built growth strategy that lifted EBITDA 14-18% on 2 portco engagements",
      "- Hired + trained 4 junior analysts, 75% promoted within 18 months",
      "",
      "# Anecdotes Career OS can draw from",
      "- 2023: convinced the COMEX of a €450M retailer to flip their pricing model after 2 weeks of immersion + 3 chiffré scenarios",
      "- 2022: published 2 white papers on European energy transition (cited by FT)",
      "- 2020: top 5% HEC Paris MSc Management, exchange at LSE",
    ].join("\n"),
    onboarded: true,
    onboardingComplete: true,
    onboardingStep: 5,
    school: "HEC Paris",
    degree: "MSc Management",
    gradYear: 2021,
    targetTracks: ["Conseil — MBB / Tier 2", "Conseil — Strategy & Ops"],
    experienceLevel: "3-7",
    targetGeo: ["Paris", "London"],
    contractType: "cdi",
    salaryMin: 75000,
    salaryMax: 100000,
  };
}

// ─── CV variants + ATS analysis ───────────────────────────────────────────

function buildCvs(): { cvs: CV[]; defaultCvId: string; atsByDefault: StoreAtsAnalysis } {
  const consultingId = uid("cv");
  const productId = uid("cv");
  const strategyId = uid("cv");

  const consultingParsed = [
    "GABRIEL RANCE",
    "Associate Consultant · Paris, France",
    "gabranpro@gmail.com  ·  +33 6 12 34 56 78  ·  LinkedIn",
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

  const productParsed = [
    "GABRIEL RANCE",
    "Product Manager · Paris, France",
    "gabranpro@gmail.com  ·  +33 6 12 34 56 78  ·  LinkedIn",
    "",
    "SUMMARY",
    "PM with cross-functional strategy + ops background, now targeting product roles",
    "at AI labs (Anthropic, OpenAI, Mistral) and category-defining startups. Strong on",
    "discovery, prioritisation, and shipping with small teams.",
    "",
    "EXPERIENCE",
    "Senior Consultant → Product Strategy — Monitor Deloitte (2023 – Present)",
    "- Drove product roadmap for a €450M retailer's new pricing engine (POC → GA)",
    "- Led discovery: 60 customer interviews, 18 prototyped flows",
    "- Coordinated 4 engineers + 1 designer, shipped in 4 sprints",
    "Business Analyst — Roland Berger (2021 – 2023)",
    "- 12+ strategy projects spanning growth, ops, M&A integration",
    "",
    "EDUCATION",
    "MSc in Management — HEC Paris (2021)",
    "Exchange — London School of Economics (2020)",
    "",
    "SKILLS",
    "Product Discovery · Roadmapping · A/B testing · SQL · Python · Figma · French · English",
  ].join("\n");

  const strategyParsed = [
    "GABRIEL RANCE",
    "Strategy & Ops Lead · Paris, France",
    "gabranpro@gmail.com  ·  +33 6 12 34 56 78  ·  LinkedIn",
    "",
    "SUMMARY",
    "Strategy & Ops generalist with 3+ years scaling commercial / ops in fast-growth",
    "startups (Series B → C) and PE portcos. Hands-on, builder mindset.",
    "",
    "EXPERIENCE",
    "Senior Consultant — Monitor Deloitte (2023 – Present)",
    "- Operating-model redesign for a €450M retailer; +6 pts margin in 9 months",
    "- Cross-functional projects spanning pricing, retention and sales ops",
    "Business Analyst — Roland Berger (2021 – 2023)",
    "",
    "EDUCATION",
    "MSc in Management — HEC Paris (2021)",
    "",
    "SKILLS",
    "GTM · Pricing · Retention · Sales Ops · SQL · Looker · French · English",
  ].join("\n");

  const consultingCv: CV = {
    id: consultingId,
    name: "CV — Associate Consultant MBB",
    lastEdited: "Just now",
    fileType: "PDF",
    roleFocus: "Consulting",
    atsScore: 94,
    isDefault: true,
    summary:
      "Associate-level consultant targeting MBB and top-tier strategy firms. 3+ years of commercial DD, growth strategy and operational improvement across TMT, retail and industrials.",
    parsedText: consultingParsed,
  };

  const productCv: CV = {
    id: productId,
    name: "CV — PM AI labs",
    lastEdited: "Yesterday",
    fileType: "PDF",
    roleFocus: "Product Management",
    atsScore: 89,
    isDefault: false,
    summary:
      "PM with cross-functional strategy + ops background, now targeting product roles at AI labs and category-defining startups.",
    parsedText: productParsed,
  };

  const strategyCv: CV = {
    id: strategyId,
    name: "CV — Strategy & Ops startup",
    lastEdited: "3 days ago",
    fileType: "PDF",
    roleFocus: "Strategy & Operations",
    atsScore: 87,
    isDefault: false,
    summary:
      "Strategy & Ops generalist with 3+ years scaling commercial / ops in fast-growth startups (Series B → C) and PE portcos.",
    parsedText: strategyParsed,
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
    missingKeywords: ["Operating model", "Synergy capture", "Carve-out", "Vendor due diligence"],
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

  return {
    cvs: [consultingCv, productCv, strategyCv],
    defaultCvId: consultingId,
    atsByDefault: ats,
  };
}

// ─── Today's tasks (Dashboard right panel) ────────────────────────────────

function buildTodayTasks(): DashboardTask[] {
  return [
    {
      id: uid("task"),
      title: "Préparer le brief Bain — partner round mardi",
      subtitle: "Bain & Company · 3 stories PEI",
      subtitleColor: "indigo",
      icon: "calendar",
      done: false,
    },
    {
      id: uid("task"),
      title: "Relancer la recruteuse OpenAI",
      subtitle: "OpenAI · J+3 depuis le phone screen",
      subtitleColor: "orange",
      icon: "mail",
      done: false,
    },
    {
      id: uid("task"),
      title: "Adapter le CV pour Anthropic",
      subtitle: "ATS target 92+ · 2 min",
      subtitleColor: "green",
      icon: "file",
      done: false,
    },
    {
      id: uid("task"),
      title: "Mini-cas profitability — 20 min",
      subtitle: "Préparer McKinsey final round",
      subtitleColor: "indigo",
      icon: "list",
      done: true,
    },
  ];
}

// ─── Notifications ────────────────────────────────────────────────────────

function buildNotifications(): Notification[] {
  return [
    {
      id: uid("notif"),
      type: "interview",
      title: "Final round Bain confirmé",
      description: "Mardi 14h · Marie L., Partner Bain & Company",
      timestamp: daysAgo(0, -2), // 2h ago
      read: false,
      link: { page: "applications" },
    },
    {
      id: uid("notif"),
      type: "application",
      title: "Mistral AI — moved to Interview",
      description: "Tu passes au round 3 avec le VP Product",
      timestamp: daysAgo(0, -5), // 5h ago
      read: false,
      link: { page: "applications" },
    },
    {
      id: uid("notif"),
      type: "insight",
      title: "+65% d'entretiens vs cohorte similaire",
      description: "Ton response rate est dans le top 10% des Career OS users (n=120)",
      timestamp: daysAgo(1),
      read: true,
      link: { page: "dashboard" },
    },
    {
      id: uid("notif"),
      type: "application",
      title: "Stripe — offre reçue",
      description: "€100-145k · 30 jours pour répondre",
      timestamp: daysAgo(4),
      read: true,
      link: { page: "applications" },
    },
    {
      id: uid("notif"),
      type: "system",
      title: "Career OS v0.0.4 disponible",
      description: "Mac icon natif + 40 cards pipeline demo",
      timestamp: daysAgo(2),
      read: true,
    },
  ];
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
  const { cvs, defaultCvId, atsByDefault } = buildCvs();
  const { session, pendingAnswer, pendingTranscript } = buildCopilotSession();
  const user = buildUser();
  const todaysTasks = buildTodayTasks();
  const notifications = buildNotifications();

  useAppStore.setState({
    user,
    jobs,
    applications,
    cvs,
    defaultCvId,
    selectedCvId: defaultCvId,
    atsByCv: { [defaultCvId]: atsByDefault },
    copilotSessions: [session],
    activeSessionId: session.id,
    copilotStatus: "thinking",
    pendingTranscript,
    pendingAnswer,
    copilotError: null,
    selectedApplicationId: applications[0]?.id ?? null,
    todaysTasks,
    notifications,
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
    todaysTasks: [],
    notifications: [],
  });
}
