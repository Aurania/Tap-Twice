import { cx } from "@/lib/cx";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
};

/** Figma "Toggle" (44 × 26). Used for "Avoid interest" in Settings. */
export function Toggle({ checked, onChange, label, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-[26px] w-11 shrink-0 items-center rounded-pill transition-colors duration-200",
        checked ? "bg-action" : "bg-line",
        className,
      )}
    >
      <span
        aria-hidden
        className={cx(
          "absolute top-[3px] size-5 rounded-pill bg-white shadow-sm transition-transform duration-200 ease-out",
          checked ? "translate-x-[21px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
