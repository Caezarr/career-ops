import {
  ReactElement,
  ReactNode,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { resolvePortalRoot } from "./portal";

type Align = "start" | "end" | "center";
type Side = "bottom" | "top";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function DropdownMenu({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentId = useId();

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  const value = useMemo(() => ({ open, setOpen, triggerRef, contentId }), [open, setOpen, contentId]);
  return <DropdownContext.Provider value={value}>{children}</DropdownContext.Provider>;
}

function useDropdown() {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenu primitives must be used inside <DropdownMenu>");
  return ctx;
}

export interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: ReactNode;
}

export function DropdownMenuTrigger({ asChild = false, children }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef, contentId } = useDropdown();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  if (asChild && isValidElement(children)) {
    const el = children as ReactElement<Record<string, unknown>>;
    const existingProps = el.props as Record<string, unknown>;
    return cloneElement(el, {
      ref: (node: HTMLElement | null) => {
        triggerRef.current = node;
        const childRef = (
          el as ReactElement<Record<string, unknown>> & {
            ref?: React.Ref<HTMLElement>;
          }
        ).ref;
        if (typeof childRef === "function") childRef(node);
        else if (childRef && typeof childRef === "object") {
          (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      onClick: (e: React.MouseEvent) => {
        const existingHandler = existingProps.onClick as
          | ((e: React.MouseEvent) => void)
          | undefined;
        existingHandler?.(e);
        if (!e.defaultPrevented) handleClick(e);
      },
      "aria-haspopup": "menu",
      "aria-expanded": open,
      "aria-controls": open ? contentId : undefined,
    });
  }

  return (
    <button
      type="button"
      ref={(node) => {
        triggerRef.current = node;
      }}
      onClick={handleClick}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
    >
      {children}
    </button>
  );
}

export interface DropdownMenuContentProps {
  align?: Align;
  side?: Side;
  sideOffset?: number;
  className?: string;
  children: ReactNode;
}

export function DropdownMenuContent({
  align = "start",
  side = "bottom",
  sideOffset = 6,
  className,
  children,
}: DropdownMenuContentProps) {
  const { open, setOpen, triggerRef, contentId } = useDropdown();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Position the menu relative to the trigger.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!trigger || !content) return;

    const rect = trigger.getBoundingClientRect();
    const cw = content.offsetWidth;
    const ch = content.offsetHeight;

    let top = side === "bottom" ? rect.bottom + sideOffset : rect.top - ch - sideOffset;
    let left = rect.left;
    if (align === "end") left = rect.right - cw;
    if (align === "center") left = rect.left + rect.width / 2 - cw / 2;

    // Clamp to viewport.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + cw > vw - 8) left = vw - cw - 8;
    if (left < 8) left = 8;
    if (top + ch > vh - 8) top = vh - ch - 8;
    if (top < 8) top = 8;
    setPos({ top, left });
  }, [open, align, side, sideOffset, triggerRef]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (
        contentRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen, triggerRef]);

  // Auto-focus first item.
  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
  }, [open]);

  // Keyboard navigation across items.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      const items = contentRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']");
      if (!items || items.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Move DOM focus to active item.
  useEffect(() => {
    if (!open) return;
    const items = contentRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']");
    items?.[activeIndex]?.focus();
  }, [activeIndex, open]);

  if (!open) return null;
  const portal = resolvePortalRoot();

  return createPortal(
    <div
      ref={contentRef}
      id={contentId}
      role="menu"
      className={clsx("ds-dropdown", className)}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
    >
      {children}
    </div>,
    portal,
  );
}

export interface DropdownMenuItemProps {
  onSelect?: () => void;
  variant?: "default" | "destructive";
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  shortcut?: string;
  disabled?: boolean;
  children: ReactNode;
}

export function DropdownMenuItem({
  onSelect,
  variant = "default",
  icon: Icon,
  shortcut,
  disabled,
  children,
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdown();
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      className={clsx(
        "ds-dropdown__item",
        variant === "destructive" && "ds-dropdown__item--destructive",
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onSelect?.();
        setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (disabled) return;
          onSelect?.();
          setOpen(false);
        }
      }}
    >
      {Icon && <Icon size={14} className="ds-dropdown__item-icon" />}
      <span style={{ flex: 1 }}>{children}</span>
      {shortcut && <span className="ds-dropdown__item-shortcut">{shortcut}</span>}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div role="separator" className="ds-dropdown__separator" />;
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <div className="ds-dropdown__label">{children}</div>;
}
