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
  /** Primary domain — drives the Clearbit Logo API lookup so
   *  jobs render with a real company logo instead of the
   *  letter-tile fallback. Sprint 6. */
  domain?: string;
}

// Keys are matched case-insensitively against the company name.
const META: Record<string, CompanyMeta> = {
  // ── AI / ML ───────────────────────────────────────────────
  Anthropic: { sector: "AI/ML", stage: "Series F+", domain: "anthropic.com" },
  OpenAI: { sector: "AI/ML", stage: "Series F+", domain: "openai.com" },
  Cohere: { sector: "AI/ML", stage: "Series D", domain: "cohere.com" },
  Mistral: { sector: "AI/ML", stage: "Series B", domain: "mistral.ai" },
  "Mistral AI": { sector: "AI/ML", stage: "Series B", domain: "mistral.ai" },
  Cursor: { sector: "AI/ML", stage: "Series C", domain: "cursor.com" },
  // ── Fintech ───────────────────────────────────────────────
  Stripe: { sector: "Fintech", stage: "Pre-IPO", domain: "stripe.com" },
  Mercury: { sector: "Fintech", stage: "Series C", domain: "mercury.com" },
  Brex: { sector: "Fintech", stage: "Series D+", domain: "brex.com" },
  Robinhood: { sector: "Fintech", stage: "Public", domain: "robinhood.com" },
  Coinbase: { sector: "Fintech", stage: "Public", domain: "coinbase.com" },
  Plaid: { sector: "Fintech", stage: "Series D+", domain: "plaid.com" },
  Ramp: { sector: "Fintech", stage: "Series D", domain: "ramp.com" },
  Sardine: { sector: "Fintech", stage: "Series B", domain: "sardine.ai" },
  // ── French scale-ups (seed-data jobs) ─────────────────────
  Qonto: { sector: "Fintech", stage: "Series D", domain: "qonto.com" },
  Alan: { sector: "Insurtech", stage: "Series E", domain: "alan.com" },
  Doctolib: { sector: "Healthtech", stage: "Pre-IPO", domain: "doctolib.fr" },
  Pennylane: { sector: "Fintech", stage: "Series C", domain: "pennylane.com" },
  Mirakl: { sector: "E-commerce", stage: "Series E", domain: "mirakl.com" },
  // ── Dev tools / SaaS ──────────────────────────────────────
  Notion: { sector: "Dev tools / SaaS", stage: "Series C+", domain: "notion.so" },
  Figma: { sector: "Dev tools / SaaS", stage: "Pre-IPO", domain: "figma.com" },
  Linear: { sector: "Dev tools / SaaS", stage: "Series B", domain: "linear.app" },
  Vercel: { sector: "Dev tools / SaaS", stage: "Series E", domain: "vercel.com" },
  Replit: { sector: "Dev tools / SaaS", stage: "Series B", domain: "replit.com" },
  Posthog: { sector: "Dev tools / SaaS", stage: "Series C", domain: "posthog.com" },
  Resend: { sector: "Dev tools / SaaS", stage: "Series A", domain: "resend.com" },
  Substack: { sector: "Consumer / Media", stage: "Series B", domain: "substack.com" },
  Browserbase: { sector: "Dev tools / SaaS", stage: "Series A", domain: "browserbase.com" },
  Mintlify: { sector: "Dev tools / SaaS", stage: "Series A", domain: "mintlify.com" },
  Granola: { sector: "Dev tools / SaaS", stage: "Series A", domain: "granola.ai" },
  GitLab: { sector: "Dev tools / SaaS", stage: "Public", domain: "gitlab.com" },
  // ── Consumer / Communication ──────────────────────────────
  Airbnb: { sector: "Consumer / Travel", stage: "Public", domain: "airbnb.com" },
  Pinterest: { sector: "Consumer / Media", stage: "Public", domain: "pinterest.com" },
  Reddit: { sector: "Consumer / Media", stage: "Public", domain: "reddit.com" },
  Discord: { sector: "Consumer / Communication", stage: "Series H", domain: "discord.com" },
  Twilio: { sector: "Consumer / Communication", stage: "Public", domain: "twilio.com" },
  // ── Data / Enterprise ─────────────────────────────────────
  Databricks: { sector: "Data / Enterprise", stage: "Pre-IPO", domain: "databricks.com" },
  Palantir: { sector: "Data / Enterprise", stage: "Public", domain: "palantir.com" },
  // ── Climate ───────────────────────────────────────────────
  Watershed: { sector: "Climate", stage: "Series C", domain: "watershed.com" },
};

const LOOKUP = new Map<string, CompanyMeta>(
  Object.entries(META).map(([k, v]) => [k.toLowerCase(), v]),
);

/** Look up curated sector + stage for a company by name (case-insensitive). */
export function companyMeta(name: string): CompanyMeta {
  return LOOKUP.get(name.trim().toLowerCase()) ?? {};
}

/** Resolve a public logo URL for a company name, when we have a
 *  curated domain. We use Clearbit's free Logo API
 *  (https://clearbit.com/logo) — no auth, no rate limit at the
 *  small volumes the app produces, served via CDN.
 *
 *  Returns `undefined` when the company isn't in our META map,
 *  letting callers fall back to the colored letter-tile avatar.
 *  Sprint 6. */
export function companyLogoUrl(name: string): string | undefined {
  const meta = companyMeta(name);
  if (!meta.domain) return undefined;
  return `https://logo.clearbit.com/${meta.domain}`;
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
