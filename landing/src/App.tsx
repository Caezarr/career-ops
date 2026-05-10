import Header from "./components/Header.tsx";
import Hero from "./components/Hero.tsx";
import TrustBar from "./components/TrustBar.tsx";
import Features from "./components/Features.tsx";
import BeforeAfter from "./components/BeforeAfter.tsx";
import HowItWorks from "./components/HowItWorks.tsx";
import Results from "./components/Results.tsx";
import Privacy from "./components/Privacy.tsx";
import InstallHelp from "./components/InstallHelp.tsx";
import BetaCTA from "./components/BetaCTA.tsx";
import Footer from "./components/Footer.tsx";

/**
 * Landing flow v2 — matches the mockup top-to-bottom:
 *
 *   Hero (split: copy + app mockup)
 *   TrustBar (8 firms our ICP targets)
 *   Features (4 cards with product mockups)
 *   BeforeAfter (12 onglets vs 1 système)
 *   HowItWorks (4-step timeline)
 *   Results (3 stats + 2 testimonials)
 *   Privacy (kept — privacy is a real differentiator)
 *   InstallHelp (FAQ for first launch — Gatekeeper warning, etc.)
 *   BetaCTA (split: copy + waitlist form)
 *   Footer (4 columns + socials)
 *
 * `Demo.tsx` (legacy hero video section) was retired — the hero
 * already shows the product through the mockup screenshot, and a
 * 1-min "Voir la démo" button links straight to a YouTube embed
 * when we ship the demo video.
 */
export default function App() {
  return (
    <div className="landing">
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <Features />
        <BeforeAfter />
        <HowItWorks />
        <Results />
        <Privacy />
        <InstallHelp />
        <BetaCTA />
      </main>
      <Footer />
    </div>
  );
}
