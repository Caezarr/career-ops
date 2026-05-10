/**
 * Before / After — the "12 onglets, du chaos" vs "1 système" split.
 *
 * The mockup is a single image per side (rows of tool icons + a
 * bullet list under each). We render the bullet list in HTML so
 * the copy is editable + indexable, and just inline-load the
 * tool-row image. Result: the section reads as one cohesive
 * visual but the text stays SEO-friendly.
 *
 * Bullets are intentionally raw failures of the current workflow
 * (left) vs raw wins (right) — no marketing softening. The
 * little chevron between the two cards is a CSS pseudo-element.
 *
 * Cards fade in on scroll via `useReveal`.
 */

import { useReveal } from "../hooks/useReveal.ts";

export default function BeforeAfter() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section className="section before-after" id="before-after">
      <div
        ref={ref}
        className={`container reveal ${shown ? "reveal--shown" : ""}`}
      >
        <header className="section__header">
          <span className="section__eyebrow">Avant / Après</span>
          <h2 className="section__title">
            Pourquoi tu n'avances pas — et ce qui change.
          </h2>
          <p className="section__sub">
            La majorité des candidatures échouent parce que le système de
            recherche est cassé, pas parce que le candidat l'est.
          </p>
        </header>

        <div className="before-after__grid">
          {/* ── Before card ──────────────────────────────────────── */}
          <article className="before-after__card before-after__card--before">
            <span className="before-after__eyebrow before-after__eyebrow--red">
              Avant Career OS
            </span>
            <h3 className="before-after__title">
              12 onglets. 0 offre.
            </h3>

            <div className="before-after__tools">
              <img
                src="/assets/tools-before.png"
                alt="Icônes Gmail, Notion, LinkedIn, Excel, Trello, Calendar, Slack et 7 autres outils"
                className="before-after__tools-img"
                loading="lazy"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const sib = el.nextElementSibling as HTMLElement | null;
                  if (sib) sib.style.display = "flex";
                }}
              />
              <div className="asset-placeholder" style={{ display: "none", height: 60 }}>
                <span>📷 tools-before.png — row d'icons greyed-out</span>
              </div>
            </div>

            <ul className="before-after__list">
              <li>
                <CrossIcon />
                <span>10h/semaine perdues à tout chercher</span>
              </li>
              <li>
                <CrossIcon />
                <span>CV bricolé, rejeté par les ATS</span>
              </li>
              <li>
                <CrossIcon />
                <span>Entretiens improvisés, jamais préparés</span>
              </li>
              <li>
                <CrossIcon />
                <span>Aucune visibilité sur ton pipeline</span>
              </li>
            </ul>
          </article>

          {/* ── Arrow ──────────────────────────────────────────── */}
          <div className="before-after__arrow" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12 H19 M13 6 L19 12 L13 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* ── After card ──────────────────────────────────────── */}
          <article className="before-after__card before-after__card--after">
            <span className="before-after__eyebrow before-after__eyebrow--brand">
              Avec Career OS
            </span>
            <h3 className="before-after__title">
              1 système. 8 entretiens en 30 jours.
            </h3>

            <div className="before-after__tools">
              <img
                src="/assets/tools-after.png"
                alt="Icône Career OS et 7 outils unifiés : clipboard, briefcase, calendar, chart, bell, user, settings"
                className="before-after__tools-img"
                loading="lazy"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const sib = el.nextElementSibling as HTMLElement | null;
                  if (sib) sib.style.display = "flex";
                }}
              />
              <div className="asset-placeholder" style={{ display: "none", height: 60 }}>
                <span>📷 tools-after.png — row d'icons avec Career OS</span>
              </div>
            </div>

            <ul className="before-after__list">
              <li>
                <CheckIcon />
                <span>Pipeline visuel : 40 candidatures, 1 vue</span>
              </li>
              <li>
                <CheckIcon />
                <span>CV adapté en 2 min, score ATS &gt; 90</span>
              </li>
              <li>
                <CheckIcon />
                <span>Brief d'entretien IA pour chaque offre</span>
              </li>
              <li>
                <CheckIcon />
                <span>+65% d'entretiens obtenus, moyenne cohorte</span>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function CrossIcon() {
  return (
    <span className="before-after__icon before-after__icon--red" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6" fill="currentColor" fillOpacity="0.12" />
        <path d="M5 5 L11 11 M11 5 L5 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function CheckIcon() {
  return (
    <span className="before-after__icon before-after__icon--green" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path
          d="M5 8.2 L7 10.2 L11 6.2"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
