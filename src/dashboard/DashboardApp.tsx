import { lazy, Suspense, useEffect } from "react";
// Sprint 5 PR-B (audit Performance P1 #7): every route is a lazy
// chunk. Combined with vite manualChunks for deps, the cold-start
// download collapses from ~780 kB raw to just (deps + Dashboard).
// Other routes stream in on first navigation. The eager imports
// remain for `Dashboard` because that's the landing route — no
// point round-tripping a Suspense fallback for the page the user
// always sees first.
import Dashboard from "./pages/Dashboard";
const Jobs = lazy(() => import("./pages/Jobs"));
const Applications = lazy(() => import("./pages/Applications"));
const CV = lazy(() => import("./pages/CV"));
const Prep = lazy(() => import("./pages/Prep"));
const Copilot = lazy(() => import("./pages/Copilot"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Settings = lazy(() => import("./pages/Settings"));
import { NavigationProvider, useNavigation } from "./navigation";
import { useAppStore } from "./store";
import { CommandPalette, ConfirmProvider, ToastProvider } from "./primitives";
import Onboarding from "./components/onboarding/Onboarding";
import { useApplyAppearance } from "./hooks/useApplyAppearance";
import { useAutostart } from "./hooks/useAutostart";
import { useSeedIngestSources } from "./hooks/useSeedIngestSources";
import { useJobTeaserAuthListener } from "./hooks/useJobTeaserAuthListener";
import { useCopilotEventBridge } from "./hooks/useCopilotSession";
import { useBillingHydrate } from "./hooks/useBillingHydrate";
import "./styles/tokens.css";
import "./styles/sidebar.css";
import "./styles/topbar.css";
import "./styles/stats.css";
import "./styles/pipeline.css";
import "./styles/tasks.css";
import "./styles/insight.css";
import "./styles/jobs.css";
import "./styles/applications.css";
import "./styles/cv.css";
import "./styles/prep.css";
import "./styles/copilot.css";
import "./styles/workspace.css";
import "./styles/settings.css";
import "./styles/primitives.css";
import "./styles/shared.css";
import "./styles/interactive.css";
import "./styles/responsive.css";

function PageRouter() {
  const { page } = useNavigation();
  switch (page) {
    case "jobs":
      return <Jobs />;
    case "applications":
      return <Applications />;
    case "cv":
      return <CV />;
    case "prep":
      return <Prep />;
    case "copilot":
      return <Copilot />;
    case "workspace":
      return <Workspace />;
    case "settings":
      return <Settings />;
    default:
      return <Dashboard />;
  }
}

function GlobalKeyboardShortcuts() {
  // Gate the entire handler on the "Keyboard shortcuts" preference toggle.
  // When the user opts out (Settings → Notifications → Keyboard shortcuts),
  // we register no listener at all — power users who'd rather use vim-mode
  // in their terminal aren't fighting cmd+k.
  const enabled = useAppStore((s) => s.preferences.keyboardShortcuts);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette);

  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === "Escape") {
        // Let the palette handle its own escape; only used here to close
        // if it's somehow stuck open without focus inside it.
        if (document.activeElement === document.body) {
          setCommandPaletteOpen(false);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, toggleCommandPalette, setCommandPaletteOpen]);

  return null;
}

function CommandPaletteHost() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  return <CommandPalette open={open} onClose={() => setOpen(false)} />;
}

/** Tiny zero-render component whose only job is to run useApplyAppearance
 *  inside the store-aware tree, mirroring the GlobalKeyboardShortcuts
 *  pattern. Keeps DashboardApp itself dumb. */
function AppearanceApplier() {
  useApplyAppearance();
  return null;
}

/** Same pattern for the OS LaunchAgent reconciler — keeps the macOS
 *  start-on-login state in sync with the preference flag. */
function AutostartApplier() {
  useAutostart();
  return null;
}

/** Mount the Copilot Tauri event listeners ONCE per dashboard window so
 *  status / transcript / answer-token / error events flow into the
 *  store regardless of which page the user is on. The Copilot page
 *  components subscribe to the slice — they never register their own
 *  listeners (that would duplicate every event). */
function CopilotEventBridge() {
  useCopilotEventBridge();
  return null;
}

/** Idempotently seeds Settings → Job Sources from the curated
 *  BUILTIN_SOURCES list shipped in Rust on first launch. After
 *  that, the user's enabled / disabled / custom sources own the
 *  configuration. */
function IngestSourcesSeeder() {
  useSeedIngestSources();
  return null;
}

/** Listens once per dashboard window for the `jobteaser-auth-complete`
 *  Tauri event so any successful SSO roundtrip lands as an IngestSource
 *  row (or refreshes an existing row's error state). */
function JobTeaserAuthListener() {
  useJobTeaserAuthListener();
  return null;
}

/** Read the onboarded flag from the store and gate the wizard
 *  + dashboard-blur class. Kept as its own component so the rest
 *  of `DashboardApp` stays pure structural markup. */
function OnboardingHost() {
  const onboarded = useAppStore((s) => s.user.onboarded ?? s.user.onboardingComplete);
  if (onboarded) return null;
  return <Onboarding />;
}

/** Hydrate the post-beta Stripe subscription mirror once on boot.
 *  No-op when the user has no Stripe record (free tier, beta cohort). */
function BillingHydrate() {
  useBillingHydrate();
  return null;
}

export function DashboardApp() {
  // The onboarded flag also drives a class on `.dashboard-root` so the
  // dashboard behind the wizard renders muted/non-interactive without
  // each child component having to know about it.
  const onboarded = useAppStore(
    (s) => s.user.onboarded ?? s.user.onboardingComplete,
  );
  return (
    <div className={"dashboard-root" + (onboarded ? "" : " is-onboarding")}>
      <NavigationProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppearanceApplier />
            <AutostartApplier />
            <CopilotEventBridge />
            <IngestSourcesSeeder />
            <JobTeaserAuthListener />
            <BillingHydrate />
            <GlobalKeyboardShortcuts />
            {/*
              Sprint 5 PR-B: lazy routes need a Suspense boundary.
              The fallback is `null` on purpose — the page transition
              is sub-100ms once the chunk lands (Tauri serves locally,
              no network), so a spinner just creates a flash. If the
              chunk fails to load (rare; would need a build mismatch
              between window contexts), React surfaces the error via
              its error boundary instead of leaving the user staring
              at a blank screen.
            */}
            <Suspense fallback={null}>
              <PageRouter />
            </Suspense>
            <CommandPaletteHost />
            <OnboardingHost />
          </ConfirmProvider>
        </ToastProvider>
      </NavigationProvider>
    </div>
  );
}
