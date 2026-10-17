import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  name: string;
  detail?: ReactNode;
  selected: boolean;
};

/** Figma "Provider tile": letter avatar + paylater name. */
export function ProviderTile({ name, detail, selected, className, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        "flex min-h-[60px] w-full items-center gap-3 rounded-md px-4 py-2.5 text-left transition-colors duration-150",
        selected ? "border-2 border-action bg-soft" : "border border-line bg-page",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cx(
          "tt-body-strong inline-flex size-[34px] shrink-0 items-center justify-center rounded-pill",
          selected ? "bg-action text-white" : "bg-surface text-ink",
        )}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="tt-body-strong block text-ink">{name}</span>
        {detail && <span className="tt-small block text-ink-2">{detail}</span>}
      </span>
    </button>
  );
}
