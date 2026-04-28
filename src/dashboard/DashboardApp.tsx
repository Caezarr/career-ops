import Dashboard from "./pages/Dashboard";
import "./styles/tokens.css";
import "./styles/sidebar.css";
import "./styles/topbar.css";
import "./styles/stats.css";
import "./styles/pipeline.css";
import "./styles/tasks.css";
import "./styles/insight.css";

export function DashboardApp() {
  return (
    <div className="dashboard-root">
      <Dashboard />
    </div>
  );
}
