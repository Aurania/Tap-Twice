import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = { label: ReactNode; value: ReactNode; className?: string };

/** Figma "Stat card": label + big number (Joy budget left, Held off, With PayLater). */
export function StatCard({ label, value, className }: Props) {
  return (
    <div className={cx("flex min-h-20 flex-col items-center justify-center rounded-card bg-surface px-3 py-4 text-center", className)}>
      <span className="tt-small text-ink-2">{label}</span>
      <span className="tt-number text-ink">{value}</span>
    </div>
  );
}
