import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Applications from "./pages/Applications";
import CV from "./pages/CV";
import Prep from "./pages/Prep";
import Copilot from "./pages/Copilot";
import Settings from "./pages/Settings";
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
import "./styles/prep.css";
import "./styles/copilot.css";
import "./styles/settings.css";

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

export function DashboardApp() {
  return (
    <div className="dashboard-root">
      <NavigationProvider>
        <PageRouter />
      </NavigationProvider>
    </div>
  );
}
