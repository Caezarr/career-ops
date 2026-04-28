import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";
import { resolvePortalRoot } from "./portal";
import { useBodyScrollLock, useFocusTrap } from "./useFocusTrap";

export type DrawerSide = "right" | "left";
export type DrawerSize = "md" | "lg";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  size?: DrawerSize;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  ariaLabel?: string;
  children: ReactNode;
}

export function Drawer({
  open,
  onClose,
  side = "right",
  size = "md",
  closeOnOverlay = true,
  closeOnEscape = true,
  ariaLabel,
  children,
}: DrawerProps) {
  const containerRef = useFocusTrap(open);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;
  const portal = resolvePortalRoot();

  return createPortal(
    <>
      <div
        className="ds-drawer-overlay"
        onMouseDown={() => {
          if (closeOnOverlay) onClose();
        }}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={clsx("ds-drawer", `ds-drawer--${side}`, `ds-drawer--${size}`)}
      >
        {children}
      </div>
    </>,
    portal,
  );
}

export function DrawerHeader({
  title,
  onClose,
}: {
  title: string;
  onClose?: () => void;
}) {
  return (
    <div className="ds-drawer__header">
      <div className="ds-drawer__title">{title}</div>
      {onClose && (
        <button
          type="button"
          className="ds-drawer__close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function DrawerBody({ children }: { children: ReactNode }) {
  return <div className="ds-drawer__body">{children}</div>;
}

export function DrawerFooter({ children }: { children: ReactNode }) {
  return <div className="ds-drawer__footer">{children}</div>;
}
