import { Crown, CreditCard, Download } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useConfirm,
  useToast,
} from "../../primitives";
import { mockBilling } from "../../data/settings";

interface BillingModalProps {
  open: boolean;
  onClose: () => void;
}

const MOCK_INVOICES = [
  { id: "inv-2025-04", date: "Apr 24, 2025", amount: "$240.00", status: "Paid" },
  { id: "inv-2024-04", date: "Apr 24, 2024", amount: "$240.00", status: "Paid" },
  { id: "inv-2023-04", date: "Apr 24, 2023", amount: "$199.00", status: "Paid" },
];

export default function BillingModal({ open, onClose }: BillingModalProps) {
  const toast = useToast();
  const confirm = useConfirm();

  async function handleCancel() {
    const ok = await confirm({
      title: "Cancel your subscription?",
      description:
        "You'll keep Pro features until the end of the billing period.",
      confirmLabel: "Cancel subscription",
      destructive: true,
    });
    if (ok) {
      toast.success("Subscription cancelled");
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" ariaLabel="Billing">
      <ModalHeader
        title="Billing"
        subtitle="Manage plan, payment method and invoices"
        onClose={onClose}
      />
      <ModalBody>
        <div className="ds-shared-stack">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 14,
              border: "1px solid var(--border-soft)",
              borderRadius: 10,
              background: "var(--bg-soft)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--indigo-soft)",
                color: "var(--indigo-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Crown size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                {mockBilling.plan} · {mockBilling.cycle}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                Renews {mockBilling.nextRenewal} (in {mockBilling.daysUntilRenewal} days)
              </div>
            </div>
          </div>

          <div>
            <div className="ds-shared-label" style={{ marginBottom: 8 }}>
              Payment method
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
                border: "1px solid var(--border-soft)",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <CreditCard size={16} color="var(--text-2)" />
                <span style={{ fontSize: 13, color: "var(--text-1)" }}>
                  Visa ending in 4242
                </span>
              </div>
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                onClick={() => toast.info("Update payment method (coming soon)")}
              >
                Update
              </button>
            </div>
          </div>

          <div>
            <div className="ds-shared-label" style={{ marginBottom: 8 }}>
              Invoices
            </div>
            <div className="ds-shared-stack">
              {MOCK_INVOICES.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    border: "1px solid var(--border-soft)",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                      {inv.id}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {inv.date}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: "var(--text-1)" }}>
                      {inv.amount}
                    </span>
                    <span
                      className="ds-shared-pill"
                      style={{
                        background: "var(--green-soft)",
                        color: "var(--green)",
                        border: "none",
                      }}
                    >
                      {inv.status}
                    </span>
                    <button
                      type="button"
                      aria-label={`Download ${inv.id}`}
                      onClick={() => toast.success(`Downloading ${inv.id}…`)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-3)",
                      }}
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          className="ds-btn ds-btn--danger"
          onClick={handleCancel}
          style={{ marginRight: "auto" }}
        >
          Cancel subscription
        </button>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Close
        </button>
      </ModalFooter>
    </Modal>
  );
}
