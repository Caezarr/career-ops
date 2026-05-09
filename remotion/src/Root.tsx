import { Composition } from "remotion";
import { HotTake, hotTakeSchema } from "./compositions/HotTake.tsx";
import { ListeRapide, listeRapideSchema } from "./compositions/ListeRapide.tsx";
import { VeriteMarche, veriteMarcheSchema } from "./compositions/VeriteMarche.tsx";
import { REEL } from "./lib/theme.ts";

/**
 * Composition registry. Each entry is a TikTok / Reels-ready 9:16
 * template. `defaultProps` doubles as the "show this in Studio when
 * I open it" preview AND as the default when you batch-render
 * without a props file.
 *
 * Adding a new template: drop the file in src/compositions/, add
 * the entry here, you're done. The studio picks it up next reload.
 */
export const Root: React.FC = () => {
  return (
    <>
      {/* ── Hot Take · ~18s ─────────────────────────────────────────── */}
      <Composition
        id="HotTake"
        component={HotTake}
        width={REEL.width}
        height={REEL.height}
        fps={REEL.fps}
        durationInFrames={18 * REEL.fps}
        schema={hotTakeSchema}
        defaultProps={{
          hook: "Notion pour gérer ta recherche de stage : mauvaise idée.",
          argument:
            "Notion est passif. Tu dois ouvrir, scroller, te rappeler quoi faire. Sur 40 candidatures, c'est pas un problème de stockage — c'est un problème de cadence. L'outil doit pousser la prochaine action, pas attendre que tu l'ouvres.",
          chase: "Outil = comportement.",
        }}
      />

      {/* ── Liste Rapide · ~24s ─────────────────────────────────────── */}
      <Composition
        id="ListeRapide"
        component={ListeRapide}
        width={REEL.width}
        height={REEL.height}
        fps={REEL.fps}
        durationInFrames={24 * REEL.fps}
        schema={listeRapideSchema}
        defaultProps={{
          hook: "5 mots à virer de ton CV en 2026.",
          items: [
            "Passionné",
            "Synergie",
            "Polyvalent",
            "Dynamique",
            "Force de proposition",
          ],
          cta: "Save pour ton prochain entretien.",
        }}
      />

      {/* ── Vérité Marché · ~24s ────────────────────────────────────── */}
      <Composition
        id="VeriteMarche"
        component={VeriteMarche}
        width={REEL.width}
        height={REEL.height}
        fps={REEL.fps}
        durationInFrames={24 * REEL.fps}
        schema={veriteMarcheSchema}
        defaultProps={{
          hook: "Ton CV passe 6 secondes sous l'œil d'un recruteur MBB.",
          stat: "6s",
          statLabel: "le temps moyen de la première lecture humaine d'un CV chez MBB.",
          explanation:
            "Sur ces 6 secondes, le recruteur scanne : le nom de l'école, la dernière ligne d'expérience, et un seul chiffre quantifié. Si ces trois zones ne pop pas, ton CV finit en pile no avant qu'il ait lu une phrase.",
          cta: "Career OS scanne ce que les recruteurs voient en 6s.",
        }}
      />
    </>
  );
};
