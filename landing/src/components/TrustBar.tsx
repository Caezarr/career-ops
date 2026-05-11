/**
 * Trust bar — infinite horizontal marquee of the firms our ICP targets.
 *
 * NOT a "trusted by these companies" claim — we don't have
 * commercial relationships with any of them. The framing is
 * deliberately "trusté par les meilleurs" → reads in FR as
 * "trusted by the best [candidates aiming at]" which is the
 * truthful interpretation. Each logo links to nothing — it's a
 * recognition pattern for the candidate ("yeah, those are the
 * firms I'm chasing").
 *
 * The marquee is CSS-only (no JS scroll-tween). We duplicate the
 * logo list twice into a `.trust-bar__track` and animate it with
 * `translateX(-50%)` over a long duration. The duplicate fills
 * the gap when the first half scrolls off, so the loop is seamless.
 * Hover pauses the animation so the user can read a logo they
 * recognise.
 *
 * Legal posture: comparative reference / informational use of
 * registered marks. Each logo is the firm's official wordmark.
 *
 * Assets live in `landing/public/assets/trust-*.svg`. SVG is
 * preferred so CSS can recolour them to uniform grey at rest.
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

function LogoItem({ slug, alt }: { slug: string; alt: string }) {
  return (
    <div className="trust-bar__logo-wrap">
      <img
        src={`/assets/trust-${slug}.svg`}
        alt={alt}
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
        <span style={{ fontSize: 10 }}>{alt}</span>
      </div>
    </div>
  );
}

export default function TrustBar() {
  return (
    <section className="trust-bar" aria-label="Firms our users target">
      <div className="container">
        <p className="trust-bar__eyebrow">Trusté par les meilleurs</p>
      </div>

      {/* The marquee viewport spans the full page width — it looks
          better when the track flows past the container edges and
          the side fades hide the seam. */}
      <div className="trust-bar__marquee" aria-hidden="false">
        <div className="trust-bar__track">
          {/* First pass */}
          {FIRMS.map((f) => (
            <LogoItem key={`a-${f.slug}`} slug={f.slug} alt={f.alt} />
          ))}
          {/* Second pass (duplicate so the loop is seamless). The
              duplicate is aria-hidden so SR users don't hear every
              firm twice. */}
          <div className="trust-bar__dup" aria-hidden="true">
            {FIRMS.map((f) => (
              <LogoItem key={`b-${f.slug}`} slug={f.slug} alt={f.alt} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
