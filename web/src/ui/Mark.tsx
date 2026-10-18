import { cx } from "@/lib/cx";

type Props = {
  size?: number;
  /** action: blue on light screens. highlight: yellow on blue screens. white: on navy. */
  tone?: "action" | "highlight" | "white";
  className?: string;
  /** Decorative by default; pass a label when the mark stands alone (e.g. avatar). */
  label?: string;
};

const toneClass = { action: "text-action", highlight: "text-highlight", white: "text-white" } as const;

/** Figma "Mark / Two taps": a dot inside a ring. */
export function Mark({ size = 20, tone = "action", className, label }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cx(toneClass[tone], "shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    </svg>
  );
}

/** Small header label used on most screens: mark + text ("Cart Check", "Real talk"). */
export function MarkLabel({ children, tone = "action", className }: { children: string; tone?: Props["tone"]; className?: string }) {
  return (
    <span className={cx("tt-body-strong inline-flex items-center gap-2", tone === "action" ? "text-ink" : "text-white", className)}>
      <Mark size={16} tone={tone} />
      {children}
    </span>
  );
}
