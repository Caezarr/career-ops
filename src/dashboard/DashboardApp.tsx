import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import { NavigationProvider, useNavigation } from "./navigation";
import "./styles/tokens.css";
import "./styles/sidebar.css";
import "./styles/topbar.css";
import "./styles/stats.css";
import "./styles/pipeline.css";
import "./styles/tasks.css";
import "./styles/insight.css";
import "./styles/jobs.css";

function PageRouter() {
  const { page } = useNavigation();
  switch (page) {
    case "jobs":
      return <Jobs />;
    case "applications":
      return <Dashboard />; // placeholder
    case "cv":
      return <Dashboard />; // placeholder
    case "prep":
      return <Dashboard />; // placeholder
    case "settings":
      return <Dashboard />; // placeholder
    default:
      return <Dashboard />;
  }
}

export function DashboardApp() {
  return (
    <div className="dashboard-root">
      <NavigationProvider>
        <PageRouter />
      </NavigationProvider>
    </div>
  );
}
