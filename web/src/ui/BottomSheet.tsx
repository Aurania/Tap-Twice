import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
};

/**
 * Figma bottom sheet: white, top radius 28, grabber, navy scrim at 55 %.
 * Slides up; Escape or a tap on the scrim closes it; focus returns to the opener.
 */
export function BottomSheet({ open, onClose, title, description, children }: Props) {
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
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div aria-hidden className="tt-fade-in absolute inset-0 bg-inverse/55" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="tt-sheet-in relative max-h-[92dvh] w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-t-sheet bg-page px-5 pt-2.5 pb-[max(24px,env(safe-area-inset-bottom))] shadow-lg outline-none"
      >
        <div aria-hidden className="mx-auto mb-4 h-1 w-9 rounded-pill bg-line" />
        <h2 id={titleId} className="tt-h2 text-ink">
          {title}
        </h2>
        {description && (
          <p id={descId} className="tt-small mt-1 text-ink-2">
            {description}
          </p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
