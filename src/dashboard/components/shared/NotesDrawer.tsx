import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  useToast,
} from "../../primitives";
import { useAppStore } from "../../store";

interface NotesDrawerProps {
  open: boolean;
  onClose: () => void;
  applicationId: string | null;
}

export default function NotesDrawer({
  open,
  onClose,
  applicationId,
}: NotesDrawerProps) {
  const toast = useToast();
  const application = useAppStore((s) =>
    applicationId ? s.applications.find((a) => a.id === applicationId) : null,
  );
  const updateNotes = useAppStore((s) => s.updateApplicationNotes);

  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(application?.notes ?? "");
  }, [application?.id, application?.notes]);

  function handleSave() {
    if (!application) return;
    updateNotes(application.id, draft);
    toast.success("Notes saved");
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      size="md"
      ariaLabel="Application notes"
    >
      <DrawerHeader
        title={application ? `Notes · ${application.nextStep || "Application"}` : "Notes"}
        onClose={onClose}
      />
      <DrawerBody>
        <div style={{ display: "grid", gap: 12 }}>
          <div className="ds-form-hint">
            Capture quick thoughts, recruiter quotes, or follow-up bullets. Saved
            on this application.
          </div>
          <textarea
            className="ds-input ds-input--textarea ds-input--tall"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="• Recruiter said next step is a case interview…"
            rows={14}
            autoFocus
          />
        </div>
      </DrawerBody>
      <DrawerFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={handleSave}
          disabled={!application}
        >
          Save notes
        </button>
      </DrawerFooter>
    </Drawer>
  );
}
