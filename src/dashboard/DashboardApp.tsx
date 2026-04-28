import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Applications from "./pages/Applications";
import CV from "./pages/CV";
import { NavigationProvider, useNavigation } from "./navigation";
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
