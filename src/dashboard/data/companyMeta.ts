// Curated metadata for the BUILTIN_SOURCES companies in
// src-tauri/src/ingest/builtin_sources.rs. Sector + funding stage
// aren't exposed by any of the ATS APIs, so we maintain this map
// by hand. Anything not in the map gets `{}` and the dropdowns
// just show the categories that exist among loaded jobs.
//
// When adding a new company to BUILTIN_SOURCES, add its meta here
// too — otherwise the new postings will show up but be uncategorised
// for the sector/stage filters.
//
// Stage values follow the standard fundraising taxonomy: Pre-seed,
// Seed, Series A, Series B, Series C, Series D+, Pre-IPO, Public.

export interface CompanyMeta {
  sector?: string;
  stage?: string;
}

// Keys are matched case-insensitively against the company name.
const META: Record<string, CompanyMeta> = {
  // ── AI / ML ───────────────────────────────────────────────
  Anthropic: { sector: "AI/ML", stage: "Series F+" },
  OpenAI: { sector: "AI/ML", stage: "Series F+" },
  Cohere: { sector: "AI/ML", stage: "Series D" },
  Mistral: { sector: "AI/ML", stage: "Series B" },
  "Mistral AI": { sector: "AI/ML", stage: "Series B" },
  Cursor: { sector: "AI/ML", stage: "Series C" },
  // ── Fintech ───────────────────────────────────────────────
  Stripe: { sector: "Fintech", stage: "Pre-IPO" },
  Mercury: { sector: "Fintech", stage: "Series C" },
  Brex: { sector: "Fintech", stage: "Series D+" },
  Robinhood: { sector: "Fintech", stage: "Public" },
  Coinbase: { sector: "Fintech", stage: "Public" },
  Plaid: { sector: "Fintech", stage: "Series D+" },
  Ramp: { sector: "Fintech", stage: "Series D" },
  Sardine: { sector: "Fintech", stage: "Series B" },
  // ── Dev tools / SaaS ──────────────────────────────────────
  Notion: { sector: "Dev tools / SaaS", stage: "Series C+" },
  Figma: { sector: "Dev tools / SaaS", stage: "Pre-IPO" },
  Linear: { sector: "Dev tools / SaaS", stage: "Series B" },
  Vercel: { sector: "Dev tools / SaaS", stage: "Series E" },
  Replit: { sector: "Dev tools / SaaS", stage: "Series B" },
  Posthog: { sector: "Dev tools / SaaS", stage: "Series C" },
  Resend: { sector: "Dev tools / SaaS", stage: "Series A" },
  Substack: { sector: "Consumer / Media", stage: "Series B" },
  Browserbase: { sector: "Dev tools / SaaS", stage: "Series A" },
  Mintlify: { sector: "Dev tools / SaaS", stage: "Series A" },
  Granola: { sector: "Dev tools / SaaS", stage: "Series A" },
  GitLab: { sector: "Dev tools / SaaS", stage: "Public" },
  // ── Consumer / Communication ──────────────────────────────
  Airbnb: { sector: "Consumer / Travel", stage: "Public" },
  Pinterest: { sector: "Consumer / Media", stage: "Public" },
  Reddit: { sector: "Consumer / Media", stage: "Public" },
  Discord: { sector: "Consumer / Communication", stage: "Series H" },
  Twilio: { sector: "Consumer / Communication", stage: "Public" },
  // ── Data / Enterprise ─────────────────────────────────────
  Databricks: { sector: "Data / Enterprise", stage: "Pre-IPO" },
  Palantir: { sector: "Data / Enterprise", stage: "Public" },
  // ── Climate ───────────────────────────────────────────────
  Watershed: { sector: "Climate", stage: "Series C" },
};

const LOOKUP = new Map<string, CompanyMeta>(
  Object.entries(META).map(([k, v]) => [k.toLowerCase(), v]),
);

/** Look up curated sector + stage for a company by name (case-insensitive). */
export function companyMeta(name: string): CompanyMeta {
  return LOOKUP.get(name.trim().toLowerCase()) ?? {};
}

/** Translate a YC batch identifier ("S25", "W19", "F24") into a
 *  rough fundraising-stage label. Recent batches are early-stage by
 *  default; older batches are typically further along. Falls back
 *  to undefined when the batch is unparseable. */
export function stageFromYcBatch(batch: string): string | undefined {
  const m = /^([WSF])(\d{2})$/i.exec(batch.trim());
  if (!m) return undefined;
  const yearTwoDigits = parseInt(m[2], 10);
  // YC has been running since 2005. Two-digit years 05–99 = 2005..2099,
  // but we only care about relative age — ~2 years per stage tier.
  const year = yearTwoDigits >= 5 ? 2000 + yearTwoDigits : 2100 + yearTwoDigits;
  // Today is 2026 (per session date) — keep relative bucketing.
  const ageYears = 2026 - year;
  if (ageYears <= 0) return "Pre-seed";
  if (ageYears <= 1) return "Seed";
  if (ageYears <= 3) return "Series A";
  if (ageYears <= 5) return "Series B";
  if (ageYears <= 8) return "Series C+";
  return "Mature";
}

/** Derive a seniority bucket from a role title via simple regex.
 *  Returns undefined when no qualifier is present. */
export function seniorityFromTitle(title: string): string | undefined {
  const t = title.toLowerCase();
  // Order matters: more specific first so "VP of Engineering" wins
  // over a stray "Engineering" hit.
  if (/\b(intern|trainee|apprentice|graduate)\b/.test(t)) return "Internship";
  if (/\b(jr\.?|junior|entry|associate i)\b/.test(t)) return "Junior";
  if (/\b(staff|principal|fellow|distinguished)\b/.test(t)) return "Staff";
  if (
    /\b(vp|vice president|head of|director of|chief|cto|cpo|coo|ceo|cfo)\b/.test(
      t,
    )
  )
    return "VP+";
  if (/\b(lead|manager|tl)\b/.test(t)) return "Lead/Manager";
  if (/\b(sr\.?|senior|expert)\b/.test(t)) return "Senior";
  return undefined;
}
