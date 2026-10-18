import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  /** Large: 54 px tall, full width. Small: 37 px tall, hugs content. */
  size?: "large" | "small";
};

/** Figma "Button" (Style × Size). Pill shaped. */
export function Button({ variant = "primary", size = "large", className, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-pill transition-transform duration-150 ease-out",
        "active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
        size === "large" ? "tt-body-lg h-[54px] w-full px-6" : "tt-body-strong h-[37px] px-4",
        variant === "primary" ? "bg-action text-white" : "bg-surface text-ink",
        className,
      )}
      {...rest}
    />
  );
}
