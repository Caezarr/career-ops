import { useState } from 'react';
import { companyBrand } from '../data/mock';

// ─── Bundled company logos ──────────────────────────────────────────
// We use Vite's `import.meta.glob` so dropping any file matching
// `trust-<slug>.{svg,png,jpg,jpeg,webp}` in `assets/companies/` is
// auto-detected at build time. Zero need to hand-edit imports
// when you add a new firm.
//
// To wire a new firm:
//   1. drop `trust-<slug>.<ext>` in src/dashboard/assets/companies/
//   2. add `'Firm Name': '<slug>'` to COMPANY_SLUG below
// That's it — the lookup map gets rebuilt next dev / build cycle.
const ASSET_MODULES = import.meta.glob(
  '../assets/companies/trust-*.{svg,png,jpg,jpeg,webp}',
  { eager: true, import: 'default' },
) as Record<string, string>;

const LOGO_BY_SLUG: Record<string, string> = {};
for (const [path, url] of Object.entries(ASSET_MODULES)) {
  const match = path.match(/trust-([^./]+)\./);
  if (match && url) LOGO_BY_SLUG[match[1]] = url;
}

// Map every company name we want to recognise → slug used in filename.
// Both forms ("Bain & Company" and "Bain") are listed so any caller
// referring to the firm by either label still resolves to the same
// asset.
const COMPANY_SLUG: Record<string, string> = {
  // Existing trust-bar bundle ──
  Amazon: 'amazon',
  Anthropic: 'anthropic',
  'Bain & Company': 'bain',
  Bain: 'bain',
  BCG: 'bcg',
  'Goldman Sachs': 'goldman',
  Google: 'google',
  'Hugging Face': 'huggingface',
  JPMorgan: 'jpmorgan',
  'McKinsey & Company': 'mckinsey',
  McKinsey: 'mckinsey',
  Meta: 'meta',
  OpenAI: 'openai',
  // To-be-added (filename slug expected) ──
  'Oliver Wyman': 'oliverwyman',
  'Roland Berger': 'rolandberger',
  Lazard: 'lazard',
  'Rothschild & Co': 'rothschild',
  Ardian: 'ardian',
  'Sequoia Capital': 'sequoia',
  Apple: 'apple',
  Microsoft: 'microsoft',
  Stripe: 'stripe',
  Notion: 'notion',
  Figma: 'figma',
  Vercel: 'vercel',
  Linear: 'linear',
  Datadog: 'datadog',
  Snowflake: 'snowflake',
  'Mistral AI': 'mistral',
  Mistral: 'mistral',
  Cohere: 'cohere',
  Doctolib: 'doctolib',
  Mirakl: 'mirakl',
  Qonto: 'qonto',
  Pennylane: 'pennylane',
  Alan: 'alan',
  'Back Market': 'backmarket',
  Salesforce: 'salesforce',
};

// Final lookup: company name → URL (only present when the asset
// was actually dropped in /assets/companies/). Unknown companies
// fall through to the initials avatar.
const BUNDLED_LOGOS: Record<string, string> = {};
for (const [company, slug] of Object.entries(COMPANY_SLUG)) {
  const url = LOGO_BY_SLUG[slug];
  if (url) BUNDLED_LOGOS[company] = url;
}

interface CompanyAvatarProps {
  company: string;
  size?: number;
  /** Absolute URL of the company logo. Currently set by the JT
   *  bridge scraper. Falls back to the initials avatar if missing
   *  or if the image fails to load. */
  logoUrl?: string;
}

export default function CompanyAvatar({
  company,
  size = 28,
  logoUrl,
}: CompanyAvatarProps) {
  const [errored, setErrored] = useState(false);
  const brand = companyBrand(company);
  const fontSize = brand.label.length >= 3 ? size * 0.32 : size * 0.42;

  // Resolve: explicit prop > bundled lookup > initials avatar.
  const resolvedLogo = logoUrl ?? BUNDLED_LOGOS[company];

  if (resolvedLogo && !errored) {
    return (
      <span
        className="company-avatar company-avatar--logo"
        style={{
          width: size,
          height: size,
          background: '#fff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: 6,
        }}
        aria-label={company}
        title={company}
      >
        <img
          src={resolvedLogo}
          alt={company}
          width={size}
          height={size}
          style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
          loading="lazy"
          onError={() => setErrored(true)}
        />
      </span>
    );
  }

  return (
    <span
      className="company-avatar"
      style={{
        width: size,
        height: size,
        background: brand.bg,
        color: brand.fg,
        fontSize,
        border: brand.border ? `1px solid ${brand.border}` : 'none',
      }}
      aria-label={company}
      title={company}
    >
      {brand.label}
    </span>
  );
}
