import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = {
  /** Illustration slot: usually <FutureMeRobot size={96} /> or an icon. */
  art: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Call to action, usually a <Button>. */
  action?: ReactNode;
  className?: string;
};

/** Centered empty or problem state (empty wishlist, camera denied, not a product, offline…). */
export function EmptyState({ art, title, description, action, className }: Props) {
  return (
    <div className={cx("flex flex-col items-center px-4 py-8 text-center", className)}>
      <div className="mb-5">{art}</div>
      <h2 className="tt-h1 text-ink">{title}</h2>
      {description && <p className="tt-body mt-2 max-w-[300px] text-ink-2">{description}</p>}
      {action && <div className="mt-6 flex w-full max-w-[320px] flex-col gap-2">{action}</div>}
    </div>
  );
}
