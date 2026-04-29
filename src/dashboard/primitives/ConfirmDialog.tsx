import { ReactNode, createContext, useCallback, useContext, useRef, useState } from "react";
import clsx from "clsx";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "./Modal";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Resolver = (value: boolean) => void;

interface ConfirmCtxValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmCtx = createContext<ConfirmCtxValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolve = useCallback(
    (value: boolean) => {
      resolverRef.current?.(value);
      resolverRef.current = null;
      setOpts(null);
    },
    [],
  );

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      <Modal open={!!opts} onClose={() => resolve(false)} size="sm" ariaLabel={opts?.title}>
        {opts && (
          <>
            <ModalHeader title={opts.title} onClose={() => resolve(false)} />
            <ModalBody>
              {opts.description && (
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                  {opts.description}
                </p>
              )}
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                onClick={() => resolve(false)}
              >
                {opts.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={clsx(
                  "ds-btn",
                  opts.destructive ? "ds-btn--danger" : "ds-btn--primary",
                )}
                onClick={() => resolve(true)}
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}
