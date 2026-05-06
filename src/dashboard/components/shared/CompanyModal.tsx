import { ExternalLink, MapPin } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../primitives";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import CompanyAvatar from "../CompanyAvatar";
import { companyMeta } from "../../data/companyMeta";

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
}: CompanyModalProps) {
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
