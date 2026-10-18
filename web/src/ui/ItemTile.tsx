import { cx } from "@/lib/cx";
import { BagIcon } from "./icons";

const SIZE = { sm: "size-8 rounded-md text-base", md: "size-9 rounded-md text-lg", lg: "size-16 rounded-card text-[32px]" } as const;

/** Square icon tile for a wishlist item: its emoji, or a bag when it has none. */
export function ItemTile({ emoji, size = "md", tone = "surface", className }: { emoji?: string | null; size?: keyof typeof SIZE; tone?: "surface" | "soft"; className?: string }) {
  return (
    <span aria-hidden className={cx("inline-flex shrink-0 items-center justify-center", SIZE[size], tone === "soft" ? "bg-soft" : "bg-surface", className)}>
      {emoji ? emoji : <BagIcon className="size-4 text-ink-2" />}
    </span>
  );
}
