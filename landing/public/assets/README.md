# Landing assets

All assets the new landing references. Drop them in this folder with **exactly** these filenames so the components find them.

## Required (landing breaks visually without them)

| File | Dimensions | Source | Used in |
|------|------------|--------|---------|
| `hero-mockup.png` | ~1200×900, PNG | Screenshot of Dashboard with Pipeline + ATS card + Momentum card | `Hero.tsx` |
| `feature-sourcing.png` | ~500×400, PNG | Card "Opportunités pertinentes" (McKinsey + Google rows with green checks) | `Features.tsx` |
| `feature-ats.png` | ~500×400, PNG | Card "Score ATS 94 Excellent" with green gauge | `Features.tsx` |
| `feature-prep.png` | ~500×400, PNG | Card "Brief d'entretien" with audio waveform + targeted domains | `Features.tsx` |
| `feature-momentum.png` | ~500×400, PNG | Card "Plan d'actions" : Candidatures 24/40 · Entretiens 8 · Offres 2 | `Features.tsx` |
| `tools-before.png` | ~700×100, PNG | Row of 7 grayed-out app icons: Gmail · Notion · LinkedIn · Excel · Trello · Calendar · Slack · +7 tile | `BeforeAfter.tsx` |
| `tools-after.png` | ~700×100, PNG | Row of 8 icons starting with the Career OS purple "C" tile then 7 monochrome tool icons (clipboard, briefcase, calendar, chart, bell, user, settings) | `BeforeAfter.tsx` |

## Trust logos (8 files)

Place officials in SVG (preferred — color-adaptable via CSS) or PNG (640×120 fallback). Filenames:

- `trust-mckinsey.svg`
- `trust-bain.svg`
- `trust-goldman.svg`
- `trust-google.svg`
- `trust-amazon.svg`
- `trust-bcg.svg`
- `trust-jpmorgan.svg`
- `trust-meta.svg`

Each ~40px tall, opacity 70% on light bg (handled by CSS so just provide the clean brand mark).

## Testimonials (2 files)

| File | Dimensions | Used in |
|------|------------|---------|
| `testimonial-camille.jpg` | 80×80, JPG | `Testimonials.tsx` — "Camille R., Consultante ex-Bain" |
| `testimonial-thomas.jpg` | 80×80, JPG | `Testimonials.tsx` — "Thomas L., PM ex-Google" |

Use generated AI faces or anonymised stock if you don't have permission for real photos. Make sure the consent matches the quote attribution.

## Notes

- All images should be optimised for web (TinyPNG or `npx @squoosh/cli`).
- The components fall back to a dashed placeholder `.asset-placeholder` div when an asset is missing — visible during development so you can spot which file is missing.
- For the trust logos, prefer official downloads from each company's brand page (legal use under "comparative reference" doctrine — we're naming firms ICP users target, not implying endorsement).
