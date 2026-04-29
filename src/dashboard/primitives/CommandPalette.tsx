import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import {
  Briefcase,
  FileText,
  IdCard,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Sparkles,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { resolvePortalRoot } from "./portal";
import { useBodyScrollLock, useFocusTrap } from "./useFocusTrap";
import { useAppStore } from "../store";
import { useNavigation } from "../navigation";
import type { Page } from "../navigation";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const PAGES: Array<{ id: Page; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "applications", label: "Applications", icon: FileText },
  { id: "cv", label: "CV", icon: IdCard },
  { id: "prep", label: "Prep", icon: Zap },
  { id: "copilot", label: "Copilot", icon: Sparkles },
  { id: "settings", label: "Settings", icon: Settings },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const containerRef = useFocusTrap(open);
  useBodyScrollLock(open);

  const { navigate } = useNavigation();
  const setSelectedJob = useAppStore((s) => s.setSelectedJob);
  const setSelectedApplication = useAppStore((s) => s.setSelectedApplication);
  const jobs = useAppStore((s) => s.jobs);
  const applications = useAppStore((s) => s.applications);

  // Top job/application matches the user might want to jump to.
  const topJobs = useMemo(() => jobs.slice(0, 5), [jobs]);
  const topApps = useMemo(() => applications.slice(0, 5), [applications]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset query when the palette closes.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;
  const portal = resolvePortalRoot();

  const goPage = (id: Page) => {
    navigate(id);
    onClose();
  };

  const goJob = (id: string) => {
    setSelectedJob(id);
    navigate("jobs");
    onClose();
  };

  const goApp = (id: string) => {
    setSelectedApplication(id);
    navigate("applications");
    onClose();
  };

  return createPortal(
    <div
      className="ds-cmd-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div ref={containerRef} className="ds-cmd" role="dialog" aria-modal="true" aria-label="Command palette">
        <Command label="Command palette" loop>
          <div className="ds-cmd__input-wrap">
            <Search size={16} className="ds-cmd__input-icon" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search anything..."
              className="ds-cmd__input"
            />
            <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.04em" }}>
              ESC
            </span>
          </div>
          <Command.List className="ds-cmd__list">
            <Command.Empty className="ds-cmd__empty">
              No results for "{query}".
            </Command.Empty>

            <Command.Group heading="Pages" className="ds-cmd__group">
              {PAGES.map(({ id, label, icon: Icon }) => (
                <Command.Item
                  key={`page-${id}`}
                  value={`page ${label}`}
                  onSelect={() => goPage(id)}
                  className="ds-cmd__item"
                >
                  <Icon className="ds-cmd__item-icon" size={16} />
                  <span className="ds-cmd__item-label">{label}</span>
                  <span className="ds-cmd__item-meta">Page</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Jobs" className="ds-cmd__group">
              {topJobs.map((j) => (
                <Command.Item
                  key={`job-${j.id}`}
                  value={`job ${j.role} ${j.company}`}
                  onSelect={() => goJob(j.id)}
                  className="ds-cmd__item"
                >
                  <Briefcase className="ds-cmd__item-icon" size={16} />
                  <span className="ds-cmd__item-label">
                    {j.role} · {j.company}
                  </span>
                  <span className="ds-cmd__item-meta">{j.match}% match</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Applications" className="ds-cmd__group">
              {topApps.map((a) => {
                const job = jobs.find((j) => j.id === a.jobId);
                const label = job ? `${job.role} · ${job.company}` : `Application ${a.id}`;
                return (
                  <Command.Item
                    key={`app-${a.id}`}
                    value={`application ${label}`}
                    onSelect={() => goApp(a.id)}
                    className="ds-cmd__item"
                  >
                    <FileText className="ds-cmd__item-icon" size={16} />
                    <span className="ds-cmd__item-label">{label}</span>
                    <span className="ds-cmd__item-meta">{a.stage.replace("_", " ")}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group heading="Actions" className="ds-cmd__group">
              <Command.Item
                value="action open copilot"
                onSelect={() => goPage("copilot")}
                className="ds-cmd__item"
              >
                <Sparkles className="ds-cmd__item-icon" size={16} />
                <span className="ds-cmd__item-label">Open Copilot</span>
                <span className="ds-cmd__item-meta">Action</span>
              </Command.Item>
              <Command.Item
                value="action new application"
                onSelect={() => goPage("applications")}
                className="ds-cmd__item"
              >
                <Plus className="ds-cmd__item-icon" size={16} />
                <span className="ds-cmd__item-label">New application</span>
                <span className="ds-cmd__item-meta">Action</span>
              </Command.Item>
              <Command.Item
                value="action upload cv"
                onSelect={() => goPage("cv")}
                className="ds-cmd__item"
              >
                <Upload className="ds-cmd__item-icon" size={16} />
                <span className="ds-cmd__item-label">Upload CV</span>
                <span className="ds-cmd__item-meta">Action</span>
              </Command.Item>
              <Command.Item
                value="action generate pitch"
                onSelect={() => goPage("prep")}
                className="ds-cmd__item"
              >
                <Wand2 className="ds-cmd__item-icon" size={16} />
                <span className="ds-cmd__item-label">Generate pitch</span>
                <span className="ds-cmd__item-meta">Action</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>,
    portal,
  );
}
