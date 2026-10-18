import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = { title: ReactNode; children: ReactNode; className?: string };

/** Figma "Notice / Warning": cream-orange card. Informs, never alarms. */
export function Notice({ title, children, className }: Props) {
  return (
    <div role="note" className={cx("rounded-md bg-warning-bg p-4 text-warn", className)}>
      <p className="tt-body-strong">{title}</p>
      <p className="tt-small mt-0.5">{children}</p>
    </div>
  );
}
