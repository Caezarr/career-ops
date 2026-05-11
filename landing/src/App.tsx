import Header from "./components/Header.tsx";
import Hero from "./components/Hero.tsx";
import TrustBar from "./components/TrustBar.tsx";
import Features from "./components/Features.tsx";
import BeforeAfter from "./components/BeforeAfter.tsx";
import HowItWorks from "./components/HowItWorks.tsx";
import Results from "./components/Results.tsx";
import Testimonials from "./components/Testimonials.tsx";
import BetaCTA from "./components/BetaCTA.tsx";
import Footer from "./components/Footer.tsx";
import DemoModal from "./components/DemoModal.tsx";

/**
 * Landing flow v2 — matches the mockup top-to-bottom:
 *
 *   Hero (split: copy + app mockup)
 *   TrustBar (11 firms our ICP targets, infinite marquee)
 *   Features (4 cards with product mockups)
 *   BeforeAfter (12 onglets vs 1 système)
 *   HowItWorks (4-step timeline)
 *   Results (3 big stat cards)
 *   Testimonials (2 quotes — ex-Bain / ex-Google)
 *   BetaCTA (split: copy + waitlist form, constellation bg)
 *   Footer (4 columns + socials)
 *
 * `Demo.tsx` (legacy hero video section) was retired — the hero
 * already shows the product through the mockup screenshot.
 *
 * `Privacy.tsx` and `InstallHelp.tsx` were dropped from the flow.
 * Privacy talking points moved into the Footer + Privacy page;
 * Gatekeeper FAQ moved into the post-signup email. Keeping the
 * scroll path short = higher conversion to the form below.
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
        <Testimonials />
        <BetaCTA />
      </main>
      <Footer />
      <DemoModal />
    </div>
  );
}
