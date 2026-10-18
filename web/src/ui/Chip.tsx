import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = {
  children: ReactNode;
  /** Soft: lavender (info). Highlight: yellow (attention, never alarm). */
  tone?: "soft" | "highlight";
  icon?: ReactNode;
  className?: string;
};

/** Figma "Chip". Non-interactive label, 26 px tall. */
export function Chip({ children, tone = "soft", icon, className }: Props) {
  return (
    <span
      className={cx(
        "tt-caption inline-flex h-[26px] items-center gap-1 rounded-pill px-3 text-ink",
        tone === "soft" ? "bg-soft" : "bg-highlight",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
