import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = {
  children: ReactNode;
  /** Yellow for the goal delay, white for the cart total. */
  tone?: "highlight" | "white";
  /** Degrees. The design tilts stickers a few degrees either way. */
  rotate?: number;
  className?: string;
};

/** Rotated pill on the reality card ("+64 days to the concert 🎤", "Rp 1.513.000"). */
export function Sticker({ children, tone = "highlight", rotate = 3, className }: Props) {
  const style: CSSProperties = { transform: `rotate(${rotate}deg)` };
  return (
    <span
      style={style}
      className={cx(
        "tt-body-strong inline-flex items-center gap-1 rounded-pill px-4 py-2 text-ink shadow-md",
        tone === "highlight" ? "bg-highlight" : "bg-page",
        className,
      )}
    >
      {children}
    </span>
  );
}
