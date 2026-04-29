import { Star, Users, Globe2, MapPin } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../primitives";
import CompanyAvatar from "../CompanyAvatar";

interface CompanyModalProps {
  open: boolean;
  onClose: () => void;
  company: string | null;
  location?: string;
}

export default function CompanyModal({
  open,
  onClose,
  company,
  location,
}: CompanyModalProps) {
  if (!company) return null;

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel={`About ${company}`}>
      <ModalHeader title={company} subtitle="Company overview" onClose={onClose} />
      <ModalBody>
        <div className="ds-company-modal">
          <div className="ds-company-modal__header">
            <CompanyAvatar company={company} size={64} />
            <div className="ds-company-modal__head-text">
              <div className="ds-company-modal__name">{company}</div>
              <div className="ds-company-modal__rating">
                <Star size={13} color="#f59e0b" fill="#f59e0b" />
                <span>4.6</span>
                <span className="ds-form-hint">(430 reviews)</span>
              </div>
            </div>
          </div>

          <div className="ds-company-modal__facts">
            <div className="ds-company-modal__fact">
              <Users size={14} className="ds-company-modal__fact-icon" />
              <span>300–500 employees</span>
            </div>
            <div className="ds-company-modal__fact">
              <MapPin size={14} className="ds-company-modal__fact-icon" />
              <span>{location ?? "Paris, France"}</span>
            </div>
            <div className="ds-company-modal__fact">
              <Globe2 size={14} className="ds-company-modal__fact-icon" />
              <span>{`${company.toLowerCase().replace(/\s+/g, "")}.com`}</span>
            </div>
          </div>

          <p className="ds-company-modal__copy">
            {company} is a fast-growing company building modern products for
            ambitious teams. Backed by tier-1 investors and known for a strong
            engineering culture and clear product values.
          </p>

          <div className="ds-company-modal__pills">
            <span className="stat-pill stat-pill--neutral">Series C</span>
            <span className="stat-pill stat-pill--indigo">Fintech</span>
            <span className="stat-pill stat-pill--purple">B2B SaaS</span>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--primary" onClick={onClose}>
          Close
        </button>
      </ModalFooter>
    </Modal>
  );
}
