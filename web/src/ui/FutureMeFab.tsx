import { FutureMeRobot } from "./FutureMeRobot";

type Props = {
  /** Accessible name of the button. */
  label: string;
  /** Speech bubble above the robot. */
  tooltip: string;
  onClick: () => void;
};

/**
 * Floating Future Me robot with its tooltip, pinned bottom-right of the app column (Figma Home).
 * TODO(design): handoff §12 #4, it covers part of the "Check a product" button; the tooltip's
 * dismissal behaviour is not specified, so it always shows.
 */
export function FutureMeFab({ label, tooltip, onClick }: Props) {
  return (
    <div
      className="pointer-events-none fixed z-30 flex flex-col items-end gap-1"
      // Right edge of the 430 px app column, 16 px in; on phones the column is the screen.
      style={{ right: "max(16px, calc((100vw - 430px) / 2 + 16px))", bottom: "max(20px, env(safe-area-inset-bottom))" }}
    >
      <span className="tt-small pointer-events-auto rounded-pill bg-page px-4 py-2.5 font-medium text-ink shadow-md">{tooltip}</span>
      <button type="button" aria-label={label} onClick={onClick} className="pointer-events-auto rounded-pill drop-shadow-lg active:scale-95">
        <FutureMeRobot size={56} />
      </button>
    </div>
  );
}
