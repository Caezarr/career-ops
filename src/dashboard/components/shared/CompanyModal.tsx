import { useMemo } from "react";
import { ExternalLink, MapPin, Briefcase } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../primitives";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import CompanyAvatar from "../CompanyAvatar";
import { companyMeta } from "../../data/companyMeta";
import { useAppStore } from "../../store";
import type { Job } from "../../store/types";

interface CompanyModalProps {
  open: boolean;
  onClose: () => void;
  company: string | null;
  location?: string;
  /** Logo URL (when ingested from a provider that exposed one). */
  logoUrl?: string;
  /** Sector pill — falls back to companyMeta lookup if not provided. */
  sector?: string;
  /** Stage pill — falls back to companyMeta lookup. */
  stage?: string;
  /** External link to the original posting. When set, the modal
   *  shows a "View posting" button that opens it in the user's
   *  default browser. */
  postingUrl?: string;
  /** ID of the job currently shown in the JobDetail panel — we
   *  exclude it from the "Open positions" list so the user only
   *  sees OTHER offers from the same company. */
  currentJobId?: string;
}

export default function CompanyModal({
  open,
  onClose,
  company,
  location,
  logoUrl,
  sector,
  stage,
  postingUrl,
  currentJobId,
}: CompanyModalProps) {
  // Hooks first — never bail before all hooks have run, otherwise we
  // violate the rules-of-hooks on the modal's open/close cycle.
  // Read the full jobs array via a stable selector so the array
  // reference only changes when the store mutates — then useMemo
  // the filter so we don't allocate a new array on every render.
  // (The earlier inline-filter selector returned a fresh array on
  // every store update, which churned the modal hard enough to
  // crash render under a 5000-job catalogue.)
  const setSelectedJob = useAppStore((s) => s.setSelectedJob);
  const allJobs = useAppStore((s) => s.jobs);
  const otherJobs = useMemo(() => {
    if (!company) return [];
    const target = company.trim().toLowerCase();
    return allJobs.filter(
      (j) =>
        j &&
        typeof j.company === "string" &&
        j.company.trim().toLowerCase() === target &&
        j.id !== currentJobId,
    );
  }, [allJobs, company, currentJobId]);

  if (!company || company === "Unknown") return null;

  // Fall back to curated company meta when the caller doesn't pass
  // sector / stage explicitly (e.g. clicking a company avatar in
  // the Pipeline view, where we don't carry job objects).
  const meta = companyMeta(company);
  const effectiveSector = sector ?? meta.sector;
  const effectiveStage = stage ?? meta.stage;

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel={`About ${company}`}>
      <ModalHeader title={company} subtitle="Company overview" onClose={onClose} />
      <ModalBody>
        <div className="ds-company-modal">
          <div className="ds-company-modal__header">
            <CompanyAvatar company={company} size={64} logoUrl={logoUrl} />
            <div className="ds-company-modal__head-text">
              <div className="ds-company-modal__name">{company}</div>
            </div>
          </div>

          {location && (
            <div className="ds-company-modal__facts">
              <div className="ds-company-modal__fact">
                <MapPin size={14} className="ds-company-modal__fact-icon" />
                <span>{location}</span>
              </div>
            </div>
          )}

          {(effectiveSector || effectiveStage) && (
            <div className="ds-company-modal__pills">
              {effectiveStage && (
                <span className="stat-pill stat-pill--neutral">
                  {effectiveStage}
                </span>
              )}
              {effectiveSector && (
                <span className="stat-pill stat-pill--indigo">
                  {effectiveSector}
                </span>
              )}
            </div>
          )}

          {otherJobs.length > 0 && (
            <section className="ds-company-modal__positions">
              <h4 className="ds-company-modal__section-title">
                <Briefcase size={14} />
                <span>
                  {otherJobs.length} other open{" "}
                  {otherJobs.length === 1 ? "position" : "positions"}
                </span>
              </h4>
              <ul className="ds-company-modal__positions-list">
                {otherJobs.slice(0, 12).map((j: Job) => (
                  <li key={j.id} className="ds-company-modal__position">
                    <button
                      type="button"
                      className="ds-company-modal__position-btn"
                      onClick={() => {
                        setSelectedJob(j.id);
                        onClose();
                      }}
                    >
                      <span className="ds-company-modal__position-role">
                        {j.role}
                      </span>
                      <span className="ds-company-modal__position-meta">
                        {[j.location, j.type].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {otherJobs.length > 12 && (
                <div className="ds-company-modal__positions-more">
                  + {otherJobs.length - 12} more — search by{" "}
                  <strong>{company}</strong> in the Jobs page
                </div>
              )}
            </section>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        {postingUrl && (
          <button
            type="button"
            className="ds-btn"
            onClick={() => {
              void openExternal(postingUrl).catch(() => {});
            }}
          >
            <ExternalLink size={14} />
            <span style={{ marginLeft: 6 }}>View posting</span>
          </button>
        )}
        <button type="button" className="ds-btn ds-btn--primary" onClick={onClose}>
          Close
        </button>
      </ModalFooter>
    </Modal>
  );
}
