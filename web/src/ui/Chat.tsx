import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { SparkleIcon } from "./icons";
import { Mark } from "./Mark";

type BubbleProps = { from: "user" | "model"; children: ReactNode; className?: string };

/** Future Me bubbles: hug content, max width 280. Future Me on the left, the user on the right. */
export function ChatBubble({ from, children, className }: BubbleProps) {
  return (
    <div className={cx("flex", from === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "tt-body max-w-[280px] rounded-[20px] px-3.5 py-2.5",
          from === "user" ? "bg-action text-white" : "bg-page text-ink shadow-sm",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

type AvatarProps = { nickname?: string; size?: number; className?: string };

/** Future Me avatar: nickname initial (or the mark) in a blue circle, with a yellow sparkle badge. */
export function FutureAvatar({ nickname, size = 44, className }: AvatarProps) {
  const initial = nickname?.trim().charAt(0).toUpperCase();
  return (
    <span className={cx("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <span className="tt-h2 inline-flex size-full items-center justify-center rounded-pill bg-action text-white ring-4 ring-white/70">
        {initial || <Mark size={size * 0.5} tone="white" />}
      </span>
      <span
        aria-hidden
        className="absolute -right-0.5 -bottom-0.5 inline-flex size-[18px] items-center justify-center rounded-pill bg-highlight text-ink ring-2 ring-white"
      >
        <SparkleIcon className="size-2.5" strokeWidth={2.5} />
      </span>
    </span>
  );
}
