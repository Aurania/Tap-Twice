import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean };

/** Figma "Choice chip": selectable pill (tenor "6 months", work-pattern presets, quick replies). */
export function ChoiceChip({ selected, className, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        "tt-body-strong inline-flex h-[39px] items-center rounded-pill px-4 transition-colors duration-150",
        selected ? "bg-action text-white" : "bg-surface text-ink",
        className,
      )}
      {...rest}
    />
  );
}
