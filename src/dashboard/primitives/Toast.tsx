import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import clsx from "clsx";
import { resolvePortalRoot } from "./portal";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastInstance extends Required<Pick<ToastOptions, "title" | "type" | "duration">> {
  id: string;
  description?: string;
  action?: ToastOptions["action"];
  closing: boolean;
}

interface ToastApi {
  (opts: ToastOptions): string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

const MAX_TOASTS = 4;
const ICON_MAP = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);
  const timers = useRef<Map<string, number>>(new Map());
  const pausedRef = useRef<Set<string>>(new Set());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    // Mark closing for animation, then remove.
    setToasts((cur) => cur.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    window.setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 160);
  }, []);

  const scheduleAutoClose = useCallback(
    (id: string, duration: number) => {
      if (duration <= 0) return;
      if (pausedRef.current.has(id)) return;
      const handle = window.setTimeout(() => dismiss(id), duration);
      timers.current.set(id, handle);
    },
    [dismiss],
  );

  const show = useCallback(
    (opts: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const inst: ToastInstance = {
        id,
        title: opts.title,
        description: opts.description,
        type: opts.type ?? "info",
        duration: opts.duration ?? 4000,
        action: opts.action,
        closing: false,
      };
      setToasts((cur) => {
        const next = [...cur, inst];
        if (next.length > MAX_TOASTS) {
          const overflow = next.slice(0, next.length - MAX_TOASTS);
          for (const t of overflow) {
            const h = timers.current.get(t.id);
            if (h) {
              window.clearTimeout(h);
              timers.current.delete(t.id);
            }
          }
          return next.slice(-MAX_TOASTS);
        }
        return next;
      });
      scheduleAutoClose(id, inst.duration);
      return id;
    },
    [scheduleAutoClose],
  );

  // Build the API object once.
  const apiRef = useRef<ToastApi | null>(null);
  if (!apiRef.current) {
    const api = ((opts: ToastOptions) => show(opts)) as ToastApi;
    api.success = (title, description) => show({ title, description, type: "success" });
    api.error = (title, description) => show({ title, description, type: "error" });
    api.info = (title, description) => show({ title, description, type: "info" });
    api.warning = (title, description) => show({ title, description, type: "warning" });
    api.dismiss = (id: string) => dismiss(id);
    apiRef.current = api;
  } else {
    // Refresh closures to keep references current.
    apiRef.current.dismiss = dismiss;
  }

  // Cleanup timers on unmount.
  useEffect(() => {
    return () => {
      for (const handle of timers.current.values()) window.clearTimeout(handle);
      timers.current.clear();
    };
  }, []);

  return (
    <ToastCtx.Provider value={apiRef.current}>
      {children}
      <ToastRegion
        toasts={toasts}
        onDismiss={dismiss}
        onPause={(id) => {
          pausedRef.current.add(id);
          const h = timers.current.get(id);
          if (h) {
            window.clearTimeout(h);
            timers.current.delete(id);
          }
        }}
        onResume={(id) => {
          pausedRef.current.delete(id);
          const t = toasts.find((x) => x.id === id);
          if (t && !t.closing) scheduleAutoClose(id, t.duration);
        }}
      />
    </ToastCtx.Provider>
  );
}

function ToastRegion({
  toasts,
  onDismiss,
  onPause,
  onResume,
}: {
  toasts: ToastInstance[];
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  if (typeof document === "undefined" || toasts.length === 0) return null;
  const portal = resolvePortalRoot();

  return createPortal(
    <div className="ds-toast-region" role="region" aria-label="Notifications">
      {toasts.map((t) => {
        const Icon = ICON_MAP[t.type];
        return (
          <div
            key={t.id}
            className={clsx("ds-toast", `ds-toast--${t.type}`, t.closing && "ds-toast--closing")}
            role={t.type === "error" ? "alert" : "status"}
            onMouseEnter={() => onPause(t.id)}
            onMouseLeave={() => onResume(t.id)}
          >
            <Icon className="ds-toast__icon" size={18} />
            <div className="ds-toast__body">
              <div className="ds-toast__title">{t.title}</div>
              {t.description && <div className="ds-toast__description">{t.description}</div>}
              {t.action && (
                <button
                  type="button"
                  className="ds-toast__action"
                  onClick={() => {
                    t.action?.onClick();
                    onDismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              className="ds-toast__close"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(t.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    portal,
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
