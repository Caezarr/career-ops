/**
 * Trust bar — the 8 firms our ICP actually targets.
 *
 * NOT a "trusted by these companies" claim — we don't have
 * commercial relationships with any of them. The framing is
 * deliberately "trusté par les meilleurs" → it reads in FR as
 * "trusted by the best [candidates aiming at]" which is the
 * truthful interpretation. Each logo links to nothing — it's a
 * recognition pattern for the candidate ("yeah, those are the
 * firms I'm chasing").
 *
 * Legal posture: comparative reference / informational use of
 * registered marks. Each logo is the firm's official wordmark.
 *
 * Assets live in `landing/public/assets/trust-*.svg`. SVG is
 * preferred so CSS can recolour them to a uniform desaturated
 * grey at rest, then back to brand color on hover (if we ever
 * want that). PNG is acceptable as a fallback.
 */

const FIRMS = [
  // Consulting
  { slug: "mckinsey", alt: "McKinsey & Company" },
  { slug: "bain", alt: "Bain & Company" },
  { slug: "bcg", alt: "BCG" },
  // Finance
  { slug: "goldman", alt: "Goldman Sachs" },
  { slug: "jpmorgan", alt: "J.P. Morgan" },
  // Big Tech
  { slug: "google", alt: "Google" },
  { slug: "amazon", alt: "Amazon" },
  { slug: "meta", alt: "Meta" },
  // AI tier
  { slug: "anthropic", alt: "Anthropic" },
  { slug: "openai", alt: "OpenAI" },
  { slug: "huggingface", alt: "Hugging Face" },
];

export default function TrustBar() {
  return (
    <section className="trust-bar" aria-label="Firms our users target">
      <div className="container">
        <p className="trust-bar__eyebrow">Trusté par les meilleurs</p>

        <div className="trust-bar__logos">
          {FIRMS.map((f) => (
            <div key={f.slug} className="trust-bar__logo-wrap">
              <img
                src={`/assets/trust-${f.slug}.svg`}
                alt={f.alt}
                className="trust-bar__logo"
                loading="lazy"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const sib = el.nextElementSibling as HTMLElement | null;
                  if (sib) sib.style.display = "flex";
                }}
              />
              <div
                className="asset-placeholder asset-placeholder--inline"
                style={{ display: "none", minWidth: 100, height: 28 }}
              >
                <span style={{ fontSize: 10 }}>{f.alt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
