import React from "react";
import ReactDOM from "react-dom/client";
import { CopilotApp } from "./copilot/CopilotApp";
import { DashboardApp } from "./dashboard/DashboardApp";
import "./styles.css";

const view = window.location.hash === "#copilot" ? "copilot" : "dashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {view === "copilot" ? <CopilotApp /> : <DashboardApp />}
  </React.StrictMode>,
);
