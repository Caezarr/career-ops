import React from "react";
import ReactDOM from "react-dom/client";
import { CopilotApp } from "./copilot/CopilotApp";
import { DashboardApp } from "./dashboard/DashboardApp";
import TeleprompterApp from "./teleprompter/TeleprompterApp";
import { hydrateSecrets } from "./dashboard/lib/secrets";
import "./styles.css";

// Hash-based routing. Each Tauri window opens `index.html` with a
// different `#<view>` so the entry can pick which root component
// to mount:
//   #copilot      → floating overlay (Phase 1 / pre-pivot Copilot UI)
//   #teleprompter → notch teleprompter (Phase 5 — dedicated stealth
//                   window that floats above Zoom/Meet/Teams)
//   default       → dashboard (everything else)
type View = "dashboard" | "copilot" | "teleprompter";
const hash = window.location.hash;
const view: View =
  hash === "#copilot"
    ? "copilot"
    : hash === "#teleprompter"
      ? "teleprompter"
      : "dashboard";

const root = ReactDOM.createRoot(document.getElementById("root")!);

// Sprint 1 PR-B: hydrate the Keychain-backed secrets cache + run
// the one-time `ic-config.localStorage` → Keychain migration BEFORE
// the first render. The cache layer keeps the existing call-sites
// (`readAnthropicKey`, `readCopilotConfig`) synchronous, but only
// after this resolves is it authoritative. We still render a
// best-effort UI immediately if hydration is slow — every consumer
// already handles "no key configured" gracefully.
//
// Skipped for the teleprompter window — that view reads zero
// secrets, just listens to Tauri events from the dashboard. Saves
// a Keychain prompt on the second window's first paint.
if (view !== "teleprompter") {
  hydrateSecrets().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[secrets] hydrate failed:", err);
  });
}

root.render(
  <React.StrictMode>
    {view === "copilot" ? (
      <CopilotApp />
    ) : view === "teleprompter" ? (
      <TeleprompterApp />
    ) : (
      <DashboardApp />
    )}
  </React.StrictMode>,
);
