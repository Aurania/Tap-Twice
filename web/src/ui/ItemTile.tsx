import { cx } from "@/lib/cx";
import { BagIcon } from "./icons";

/** Square icon tile for a wishlist item: its emoji, or a bag when it has none. */
export function ItemTile({ emoji, className }: { emoji?: string | null; className?: string }) {
  return (
    <span aria-hidden className={cx("inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-lg", className)}>
      {emoji ? emoji : <BagIcon className="size-4 text-ink-2" />}
    </span>
  );
}
