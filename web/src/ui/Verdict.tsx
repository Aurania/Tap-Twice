import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { CheckIcon } from "./icons";

export type VerdictStatus = "healthy" | "not_healthy" | "pocket_empty";

const TONE: Record<VerdictStatus, { card: string; badge: string; bar: string }> = {
  healthy: { card: "bg-success-tint", badge: "bg-success", bar: "bg-success" },
  not_healthy: { card: "bg-danger-tint", badge: "bg-danger", bar: "bg-danger" },
  // Pocket empty (Figma 2026:2979) looks like Not healthy: red card, "!" badge, full bar.
  pocket_empty: { card: "bg-danger-tint", badge: "bg-danger", bar: "bg-danger" },
};

type Props = {
  status: VerdictStatus;
  /** Already-translated verdict word: "Healthy", "Not healthy" or "Pocket empty". */
  title: ReactNode;
  /** "Fashion stays at 73% after this buy". */
  subtitle: ReactNode;
  /** Left of the bar label row: "Fashion pocket". */
  barLabel: ReactNode;
  /** Right of the bar label row: "$240.10 left of $330". */
  barValue: ReactNode;
  /** Bar fill, 0–100: what is left in the pocket after this buy, as a share of its budget. */
  barPct: number;
  className?: string;
};

/** Pocket health card on the Reality card (Figma 05 · Healthy): tinted card, status badge, label row, status-colored bar. */
export function Verdict({ status, title, subtitle, barLabel, barValue, barPct, className }: Props) {
  const tone = TONE[status];

  return (
    <div className={cx("rounded-card p-4", tone.card, className)}>
      <div className="flex items-center gap-3">
        <span aria-hidden className={cx("inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-white", tone.badge)}>
          {status === "healthy" ? <CheckIcon className="size-4" strokeWidth={3} /> : <span className="tt-body-lg leading-none">!</span>}
        </span>
        <div className="min-w-0">
          <p className="tt-body-lg text-ink">{title}</p>
          <p className="tt-small text-ink-2">{subtitle}</p>
        </div>
      </div>
      <div className="tt-small mt-3 flex items-baseline justify-between gap-2 text-ink">
        <span>{barLabel}</span>
        <span className="tt-body-strong">{barValue}</span>
      </div>
      <span aria-hidden className="mt-1.5 block h-2 w-full overflow-hidden rounded-pill bg-page">
        <span className={cx("block h-full rounded-pill", tone.bar)} style={{ width: `${Math.max(0, Math.min(100, barPct))}%` }} />
      </span>
    </div>
  );
}
