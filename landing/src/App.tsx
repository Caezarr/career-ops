import Header from "./components/Header.tsx";
import Hero from "./components/Hero.tsx";
import Demo from "./components/Demo.tsx";
import Features from "./components/Features.tsx";
import HowItWorks from "./components/HowItWorks.tsx";
import Privacy from "./components/Privacy.tsx";
import BetaCTA from "./components/BetaCTA.tsx";
import Footer from "./components/Footer.tsx";

export default function App() {
  return (
    <div className="landing">
      <Header />
      <main>
        <Hero />
        <Demo />
        <Features />
        <HowItWorks />
        <Privacy />
        <BetaCTA />
      </main>
      <Footer />
    </div>
  );
}
