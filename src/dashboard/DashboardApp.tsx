import { useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Applications from "./pages/Applications";
import CV from "./pages/CV";
import Prep from "./pages/Prep";
import Copilot from "./pages/Copilot";
import Settings from "./pages/Settings";
import { NavigationProvider, useNavigation } from "./navigation";
import { useAppStore } from "./store";
import { CommandPalette, ConfirmProvider, ToastProvider } from "./primitives";
import { useApplyAppearance } from "./hooks/useApplyAppearance";
import { useAutostart } from "./hooks/useAutostart";
import { useCopilotEventBridge } from "./hooks/useCopilotSession";
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

export function DashboardApp() {
  return (
    <div className="dashboard-root">
      <NavigationProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppearanceApplier />
            <AutostartApplier />
            <CopilotEventBridge />
            <GlobalKeyboardShortcuts />
            <PageRouter />
            <CommandPaletteHost />
          </ConfirmProvider>
        </ToastProvider>
      </NavigationProvider>
    </div>
  );
}
