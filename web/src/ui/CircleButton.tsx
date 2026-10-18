import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: ReactNode;
  /** Accessible name. Shown under the circle when `showLabel` is set (reality card actions). */
  label: string;
  showLabel?: boolean;
  variant?: "primary" | "secondary";
  /** Large 56 px, small 40 px. */
  size?: "large" | "small";
};

/** Figma "Circle button". Back buttons, header actions, and the Buy / Save / Future Me row. */
export function CircleButton({
  icon,
  label,
  showLabel = false,
  variant = "secondary",
  size = "small",
  className,
  type = "button",
  ...rest
}: Props) {
  const circle = cx(
    "inline-flex shrink-0 items-center justify-center rounded-pill transition-transform duration-150 ease-out",
    size === "large" ? "size-14" : "size-10",
    variant === "primary" ? "bg-action text-white" : "bg-surface text-ink",
  );

  if (!showLabel) {
    return (
      <button
        type={type}
        aria-label={label}
        className={cx(circle, "active:scale-95 disabled:opacity-50", className)}
        {...rest}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      type={type}
      className={cx("group inline-flex flex-col items-center gap-1.5 disabled:opacity-50", className)}
      {...rest}
    >
      <span className={cx(circle, "group-active:scale-95")}>{icon}</span>
      <span className="tt-body-strong text-ink">{label}</span>
    </button>
  );
}
