import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & {
  icon: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  /** Right-aligned value, e.g. the amount. */
  trailing?: ReactNode;
  selected: boolean;
};

/** Figma "Option row": a selectable card (Pay in full / PayLater, paylater plans). */
export function OptionRow({ icon, title, detail, trailing, selected, className, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        "flex w-full items-center gap-3 rounded-md p-4 text-left transition-colors duration-150",
        selected ? "border-2 border-[var(--tt-color-border-strong)] bg-soft" : "border border-line bg-page",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cx(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-pill",
          selected ? "bg-action text-white" : "bg-surface text-ink",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="tt-body-strong block text-ink">{title}</span>
        {detail && <span className="tt-small block text-ink-2">{detail}</span>}
      </span>
      {trailing && <span className="tt-body-strong shrink-0 text-ink">{trailing}</span>}
    </button>
  );
}
