import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { pocketColor } from "./pocket";

type CardProps = {
  pocketId: string;
  name: string;
  /** Wishlist as a percentage of the pocket budget. Null when the pocket has no budget. */
  pct: number | null;
  /** Small line under the name, e.g. "$155.60 of $330". */
  detail?: ReactNode;
  onClick?: () => void;
  className?: string;
};

/** Pocket tile: colored dot, name, % wishlisted and a bar (Home grid, Wishlist). */
export function PocketCard({ pocketId, name, pct, detail, onClick, className }: CardProps) {
  const color = pocketColor(pocketId);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cx("flex w-full flex-col gap-2 rounded-card bg-surface p-4 text-left", onClick && "active:opacity-80", className)}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ background: color }} />
        <span className="tt-body-strong truncate text-ink">{name}</span>
      </span>
      <span className="tt-number text-ink">{pct === null ? "–" : `${pct}%`}</span>
      <PocketBar pocketId={pocketId} pct={pct ?? 0} />
      {detail && <span className="tt-caption text-ink-2">{detail}</span>}
    </Tag>
  );
}

/** Thin bar in the pocket color. Fill is clamped to 100%; the label carries the real number. */
export function PocketBar({ pocketId, pct, className }: { pocketId: string; pct: number; className?: string }) {
  return (
    <span aria-hidden className={cx("block h-1.5 w-full overflow-hidden rounded-pill bg-page", className)}>
      <span className="block h-full rounded-pill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: pocketColor(pocketId) }} />
    </span>
  );
}

type ChipProps = {
  pocketId: string;
  name: string;
  selected?: boolean;
  onClick?: () => void;
};

/** Selectable pocket chip, used to correct the AI's pocket match. */
export function PocketChip({ pocketId, name, selected = false, onClick }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        "tt-caption inline-flex h-9 items-center gap-2 rounded-pill border px-3.5 text-ink",
        selected ? "border-ink bg-soft" : "border-line bg-page",
      )}
    >
      <span aria-hidden className="size-2.5 rounded-pill" style={{ background: pocketColor(pocketId) }} />
      {name}
    </button>
  );
}
