import { cx } from "@/lib/cx";

type Props = {
  /** Diameter of the outermost ring, in px. */
  size?: number;
  rings?: number;
  /** Fill the centre with the yellow ripple dot. */
  dot?: boolean;
  className?: string;
};

/**
 * Concentric rings ("ripple art") behind heroes, splash and empty states.
 * Decorative: color comes from `currentColor`, so set it with a text-* class.
 */
export function Ripple({ size = 320, rings = 4, dot = false, className }: Props) {
  const r = size / 2;
  // Innermost ring hugs the dot (as in the design); the rest spread out evenly.
  const inner = r * 0.22;
  const step = rings > 1 ? (r - 1 - inner) / (rings - 1) : 0;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={cx("pointer-events-none shrink-0", className)}
    >
      {Array.from({ length: rings }, (_, i) => (
        <circle
          key={i}
          cx={r}
          cy={r}
          r={r - 1 - i * step}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.35 + (0.5 * i) / rings}
          strokeWidth={1.5}
        />
      ))}
      {dot && <circle cx={r} cy={r} r={inner * 0.7} fill="var(--tt-color-action-highlight)" />}
    </svg>
  );
}
