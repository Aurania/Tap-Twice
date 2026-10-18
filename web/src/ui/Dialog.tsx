import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons, primary first. */
  actions: ReactNode;
};

/** Centered confirm dialog (for example "Already on your wishlist"). Escape and the scrim close it. */
export function Dialog({ open, onClose, title, description, actions }: Props) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div aria-hidden className="tt-fade-in absolute inset-0 bg-inverse/55" onClick={onClose} />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="relative w-full max-w-[350px] rounded-card bg-page p-5 text-center shadow-lg outline-none"
      >
        <h2 id={titleId} className="tt-h2 text-ink">
          {title}
        </h2>
        {description && (
          <p id={descId} className="tt-body mt-2 text-ink-2">
            {description}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
