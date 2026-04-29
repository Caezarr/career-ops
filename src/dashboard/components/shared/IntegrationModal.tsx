import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useConfirm,
  useToast,
} from "../../primitives";
import { useAppStore, type Integration } from "../../store";

interface IntegrationModalProps {
  open: boolean;
  onClose: () => void;
  integration: Integration | null;
}

const MOCK_KEY_BY_ID: Record<string, string> = {
  anthropic: "sk-ant-•••••••••••••••••••",
  openai:    "sk-proj-•••••••••••••••••••",
  assemblyai: "aai_•••••••••••••••••••••",
};

export default function IntegrationModal({
  open,
  onClose,
  integration,
}: IntegrationModalProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const setIntegrationConnected = useAppStore((s) => s.setIntegrationConnected);

  const [reveal, setReveal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyValue, setKeyValue] = useState("");

  useEffect(() => {
    if (open && integration) {
      setReveal(false);
      setKeyValue(MOCK_KEY_BY_ID[integration.id] ?? "•••••••••••");
    }
  }, [open, integration]);

  if (!integration) return null;

  function runTest() {
    setTesting(true);
    window.setTimeout(() => {
      setTesting(false);
      toast.success("Connection successful");
    }, 1500);
  }

  async function handleDisconnect() {
    if (!integration) return;
    const ok = await confirm({
      title: `Disconnect ${integration.name}?`,
      description:
        "Features powered by this integration will stop working until you reconnect.",
      confirmLabel: "Disconnect",
      destructive: true,
    });
    if (ok) {
      setIntegrationConnected(integration.id, false);
      toast.success(`${integration.name} disconnected`);
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel={integration.name}>
      <ModalHeader
        title={integration.name}
        subtitle={integration.model}
        onClose={onClose}
      />
      <ModalBody>
        <div className="ds-shared-stack">
          <div
            className="ds-shared-info"
            style={{
              background: integration.connected ? "var(--green-soft)" : "var(--bg-soft)",
            }}
          >
            {integration.connected ? (
              <>
                <CheckCircle2 size={16} color="var(--green)" />
                <span style={{ color: "var(--text-1)" }}>
                  Connected · {integration.model}
                </span>
              </>
            ) : (
              <span>Disconnected — provide an API key to reconnect.</span>
            )}
          </div>

          <label className="ds-shared-row">
            <span className="ds-shared-label">API key</span>
            <div style={{ position: "relative" }}>
              <input
                type={reveal ? "text" : "password"}
                className="ds-shared-input"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                style={{ paddingRight: 36 }}
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? "Hide key" : "Show key"}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-3)",
                }}
              >
                {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>

          <div>
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              disabled={testing}
              onClick={runTest}
            >
              {testing ? "Testing…" : "Test connection"}
            </button>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          className="ds-btn ds-btn--danger"
          onClick={handleDisconnect}
          style={{ marginRight: "auto" }}
        >
          Disconnect
        </button>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={() => {
            toast.success(`${integration.name} settings saved`);
            onClose();
          }}
        >
          Save
        </button>
      </ModalFooter>
    </Modal>
  );
}
