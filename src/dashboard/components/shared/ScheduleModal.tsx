import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../primitives";

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
}

const MOCK_EVENTS = [
  {
    id: "e1",
    day: "29",
    mon: "Apr",
    title: "Mock interview · Goldman Sachs",
    meta: "10:00 — 11:00 · VP IBD",
  },
  {
    id: "e2",
    day: "30",
    mon: "Apr",
    title: "Practice · Behavioral pack",
    meta: "16:00 — 16:40 · 12 questions",
  },
  {
    id: "e3",
    day: "02",
    mon: "May",
    title: "Pitch rehearsal",
    meta: "09:30 — 09:45 · Career OS",
  },
  {
    id: "e4",
    day: "05",
    mon: "May",
    title: "Mock case · Bain & Company",
    meta: "11:00 — 12:00 · Strategy Associate",
  },
];

export default function ScheduleModal({ open, onClose }: ScheduleModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Upcoming schedule">
      <ModalHeader
        title="Upcoming schedule"
        subtitle="Interviews and practice sessions"
        onClose={onClose}
      />
      <ModalBody>
        <div className="ds-shared-stack">
          {MOCK_EVENTS.map((e) => (
            <div key={e.id} className="ds-shared-schedule">
              <div className="ds-shared-schedule__date">
                <span className="ds-shared-schedule__date-day">{e.day}</span>
                <span className="ds-shared-schedule__date-mon">{e.mon}</span>
              </div>
              <div className="ds-shared-schedule__main">
                <span className="ds-shared-schedule__title">{e.title}</span>
                <span className="ds-shared-schedule__meta">{e.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Close
        </button>
      </ModalFooter>
    </Modal>
  );
}
