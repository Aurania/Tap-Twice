import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { PocketBar } from "./PocketCard";

export type VerdictStatus = "healthy" | "not_healthy" | "pocket_empty";

const TONE: Record<VerdictStatus, string> = {
  healthy: "bg-success-tint text-success",
  not_healthy: "bg-danger-tint text-danger",
  // TODO(design): the Pocket empty variant (Figma 2026:2979) is checked in phase 6; red until then.
  pocket_empty: "bg-danger-tint text-danger",
};

type Props = {
  status: VerdictStatus;
  /** Already-translated verdict word: "Healthy", "Not healthy" or "Pocket empty". */
  label: string;
  pocketId: string;
  /** How full the pocket is after this purchase, 0–100. */
  barPct: number;
  children?: ReactNode;
  className?: string;
};

/** Pocket health card on the Reality card: verdict pill, bar and a line of explanation. */
export function Verdict({ status, label, pocketId, barPct, children, className }: Props) {
  return (
    <div className={cx("rounded-card bg-surface p-4", className)}>
      <span className={cx("tt-caption inline-flex h-[26px] items-center rounded-pill px-3", TONE[status])}>{label}</span>
      <PocketBar pocketId={pocketId} pct={barPct} className="mt-3" />
      {children && <div className="tt-small mt-2 text-ink-2">{children}</div>}
    </div>
  );
}
