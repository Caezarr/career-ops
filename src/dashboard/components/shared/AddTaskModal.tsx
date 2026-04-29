import { useEffect, useState } from "react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useToast,
} from "../../primitives";
import { useAppStore } from "../../store";

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddTaskModal({ open, onClose }: AddTaskModalProps) {
  const toast = useToast();
  const addTask = useAppStore((s) => s.addDashboardTask);

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setDuration("");
    }
  }, [open]);

  function handleSave() {
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      subtitle: duration.trim() || "Today",
      subtitleColor: "indigo",
      icon: "list",
    });
    toast.success("Task added");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" ariaLabel="Add task">
      <ModalHeader title="Add task" onClose={onClose} />
      <ModalBody>
        <div style={{ display: "grid", gap: 14 }}>
          <label className="ds-form-row">
            <span className="ds-form-label">Title</span>
            <input
              className="ds-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Send follow-up to Stripe"
              autoFocus
            />
          </label>
          <label className="ds-form-row">
            <span className="ds-form-label">Duration / when</span>
            <input
              className="ds-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Today · 30 min"
            />
          </label>
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={handleSave}
          disabled={!title.trim()}
        >
          Save
        </button>
      </ModalFooter>
    </Modal>
  );
}
