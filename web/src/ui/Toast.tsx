import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { CheckIcon } from "./icons";

type Toast = {
  id: number;
  message: string;
  /** Top: confirmations ("Saved!"). Bottom: undoable actions ("… removed · Undo"). */
  position: "top" | "bottom";
  icon?: boolean;
  action?: { label: string; onClick: () => void };
  durationMs: number;
};

type ShowToast = (toast: Omit<Toast, "id" | "position" | "durationMs"> & Partial<Pick<Toast, "position" | "durationMs">>) => void;

const ToastContext = createContext<ShowToast | null>(null);

/** Navy toast that fades after ~3 s (Figma 08a / 08b). One at a time. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const show = useCallback<ShowToast>((t) => {
    setToast({ position: "top", durationMs: 3000, ...t, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className={cx(
          "pointer-events-none fixed inset-x-0 z-50 mx-auto flex max-w-[430px] justify-center px-4",
          toast?.position === "bottom" ? "bottom-[calc(max(24px,env(safe-area-inset-bottom))+72px)]" : "top-[max(16px,env(safe-area-inset-top))]",
        )}
      >
        {toast && (
          <div
            key={toast.id}
            className="tt-toast-in pointer-events-auto flex items-center gap-3 rounded-md bg-inverse px-4 py-3 text-white shadow-lg"
          >
            {toast.icon && <CheckIcon aria-hidden className="size-5 shrink-0 text-highlight" />}
            <span className="tt-body-strong">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="tt-body-strong shrink-0 text-highlight underline underline-offset-2"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
