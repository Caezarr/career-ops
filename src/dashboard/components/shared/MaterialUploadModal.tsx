import { useEffect, useState } from "react";
import { ChevronDown, UploadCloud } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useToast,
} from "../../primitives";
import { useAppStore } from "../../store";

interface MaterialUploadModalProps {
  open: boolean;
  onClose: () => void;
  applicationId: string | null;
}

const TYPE_OPTIONS = ["CV", "Cover letter", "Portfolio"] as const;
type MaterialType = (typeof TYPE_OPTIONS)[number];

export default function MaterialUploadModal({
  open,
  onClose,
  applicationId,
}: MaterialUploadModalProps) {
  const toast = useToast();
  const applications = useAppStore((s) => s.applications);
  // Note: upload is purely visual (no backend) — we just push to materials
  // via a tiny set helper. We mutate via the same pattern Zustand uses.
  const setApps = useAppStore.setState;

  const [type, setType] = useState<MaterialType>("CV");
  const [name, setName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (open) {
      setType("CV");
      setName("");
      setDragOver(false);
    }
  }, [open]);

  const target = applications.find((a) => a.id === applicationId) ?? null;

  function handleSave() {
    if (!target || !name.trim()) return;
    setApps((state) => ({
      applications: state.applications.map((a) =>
        a.id === target.id
          ? {
              ...a,
              materials: [
                ...a.materials,
                {
                  type,
                  name: name.trim(),
                  uploaded: "Just now",
                  state: "uploaded" as const,
                },
              ],
            }
          : a,
      ),
    }));
    toast.success("Material uploaded", `${type} · ${name.trim()}`);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Add application material">
      <ModalHeader title="Add material" onClose={onClose} />
      <ModalBody>
        <div style={{ display: "grid", gap: 14 }}>
          <label className="ds-form-row">
            <span className="ds-form-label">Type</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="ds-select-trigger">
                  <span>{type}</span>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {TYPE_OPTIONS.map((t) => (
                  <DropdownMenuItem key={t} onSelect={() => setType(t)}>
                    {t}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </label>

          <label className="ds-form-row">
            <span className="ds-form-label">File name</span>
            <input
              className="ds-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CV - Stripe.pdf"
            />
          </label>

          <div
            className={`ds-dropzone${dragOver ? " ds-dropzone--over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) setName(file.name);
            }}
          >
            <UploadCloud size={28} />
            <div className="ds-dropzone__title">Drop a file here</div>
            <div className="ds-dropzone__sub">or set the name manually above</div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          disabled={!name.trim()}
          onClick={handleSave}
        >
          Save
        </button>
      </ModalFooter>
    </Modal>
  );
}
