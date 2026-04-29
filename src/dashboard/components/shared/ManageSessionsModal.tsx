import { useState } from "react";
import { Laptop, Smartphone, Tablet } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useToast,
} from "../../primitives";

interface ManageSessionsModalProps {
  open: boolean;
  onClose: () => void;
}

interface SessionRow {
  id: string;
  icon: typeof Laptop;
  title: string;
  sub: string;
  current?: boolean;
}

const INITIAL_SESSIONS: SessionRow[] = [
  {
    id: "s-mac",
    icon: Laptop,
    title: "MacBook Pro · Paris",
    sub: "Chrome on macOS · Active now",
    current: true,
  },
  {
    id: "s-iphone",
    icon: Smartphone,
    title: "iPhone 15",
    sub: "Career OS app · 2h ago · Paris",
  },
  {
    id: "s-ipad",
    icon: Tablet,
    title: "iPad Pro",
    sub: "Safari · Yesterday · Paris",
  },
];

export default function ManageSessionsModal({ open, onClose }: ManageSessionsModalProps) {
  const toast = useToast();
  const [sessions, setSessions] = useState<SessionRow[]>(INITIAL_SESSIONS);

  function revoke(id: string, title: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success(`Revoked session — ${title}`);
  }

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Active sessions">
      <ModalHeader
        title="Active sessions"
        subtitle="Devices currently signed into your account"
        onClose={onClose}
      />
      <ModalBody>
        <div className="ds-shared-stack">
          {sessions.length === 0 && (
            <div className="ds-shared-empty">No other active sessions.</div>
          )}
          {sessions.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="ds-shared-session">
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--bg-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-2)",
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="ds-shared-session__info">
                    <div className="ds-shared-session__title">
                      {s.title}
                      {s.current && (
                        <span
                          className="ds-shared-pill"
                          style={{
                            marginLeft: 8,
                            background: "var(--green-soft)",
                            color: "var(--green)",
                            border: "none",
                          }}
                        >
                          This device
                        </span>
                      )}
                    </div>
                    <div className="ds-shared-session__sub">{s.sub}</div>
                  </div>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    className="ds-btn ds-btn--secondary"
                    onClick={() => revoke(s.id, s.title)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
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
