import React from "react";
import ReactDOM from "react-dom/client";
import { CopilotApp } from "./copilot/CopilotApp";
import { DashboardApp } from "./dashboard/DashboardApp";
import { hydrateSecrets } from "./dashboard/lib/secrets";
import "./styles.css";

const view = window.location.hash === "#copilot" ? "copilot" : "dashboard";

const root = ReactDOM.createRoot(document.getElementById("root")!);

// Sprint 1 PR-B: hydrate the Keychain-backed secrets cache + run
// the one-time `ic-config.localStorage` → Keychain migration BEFORE
// the first render. The cache layer keeps the existing call-sites
// (`readAnthropicKey`, `readCopilotConfig`) synchronous, but only
// after this resolves is it authoritative. We still render a
// best-effort UI immediately if hydration is slow — every consumer
// already handles "no key configured" gracefully.
hydrateSecrets().catch((err) => {
  // eslint-disable-next-line no-console
  console.warn("[secrets] hydrate failed:", err);
});

root.render(
  <React.StrictMode>
    {view === "copilot" ? <CopilotApp /> : <DashboardApp />}
  </React.StrictMode>,
);
