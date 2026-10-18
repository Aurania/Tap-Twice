import type { ReactNode } from "react";

export type RingSegment = { pct: number; color: string };

type Props = {
  /** One arc per pocket (allocation ring) or a single arc (wishlist ring). Percentages, not 0–1. */
  segments: RingSegment[];
  size?: number;
  label: string;
  /** `danger` paints the whole ring red (N2: pockets over 100%). */
  tone?: "default" | "danger";
  /** Track color behind the arcs. */
  track?: string;
  children?: ReactNode;
};

/** Inner radius is 0.82 of the outer radius (handoff §11). */
const INNER_RATIO = 0.82;

/** Percentage ring: arcs start at 12 o'clock and run clockwise. Total is clamped to 100. */
export function PercentRing({ segments, size = 96, label, tone = "default", track = "var(--tt-color-bg-page)", children }: Props) {
  const outer = size / 2;
  const stroke = outer * (1 - INNER_RATIO);
  const r = outer - stroke / 2;
  const c = 2 * Math.PI * r;

  const arcs: { start: number; len: number; color: string }[] = [];
  let used = 0;
  for (const s of segments) {
    const len = Math.max(0, Math.min(s.pct, 100 - used));
    if (len > 0) arcs.push({ start: used, len, color: tone === "danger" ? "var(--tt-color-danger)" : s.color });
    used += len;
  }
  const overfull = segments.reduce((sum, s) => sum + s.pct, 0) > 100;

  return (
    <div role="img" aria-label={label} className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={outer} cy={outer} r={r} fill="none" stroke={tone === "danger" && overfull ? "var(--tt-color-danger)" : track} strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={outer}
            cy={outer}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={stroke}
            strokeDasharray={`${(a.len / 100) * c} ${c}`}
            strokeDashoffset={-(a.start / 100) * c}
          />
        ))}
      </svg>
      {children && <span className="absolute text-center">{children}</span>}
    </div>
  );
}
