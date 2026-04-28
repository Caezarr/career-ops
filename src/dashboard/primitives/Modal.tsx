import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";
import { resolvePortalRoot } from "./portal";
import { useBodyScrollLock, useFocusTrap } from "./useFocusTrap";

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  ariaLabel?: string;
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  size = "md",
  closeOnOverlay = true,
  closeOnEscape = true,
  ariaLabel,
  children,
}: ModalProps) {
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
    <div
      className="ds-modal-overlay"
      onMouseDown={(e) => {
        if (!closeOnOverlay) return;
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={containerRef}
        className={clsx("ds-modal-panel", `ds-modal-panel--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>,
    portal,
  );
}

export interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
}

export function ModalHeader({ title, subtitle, onClose }: ModalHeaderProps) {
  return (
    <div className="ds-modal-header">
      <div className="ds-modal-header__titles">
        <div className="ds-modal-header__title">{title}</div>
        {subtitle && <div className="ds-modal-header__subtitle">{subtitle}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          className="ds-modal-header__close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="ds-modal-body">{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="ds-modal-footer">{children}</div>;
}
