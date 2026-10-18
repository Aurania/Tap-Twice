import type { ReactNode } from "react";

type Props = {
  /** 0–1. Clamped. */
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
};

/** Goal progress ring on Home (savedAmount / targetAmount). */
export function ProgressRing({ value, size = 64, stroke = 8, label, children }: Props) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div role="img" aria-label={label} className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tt-color-bg-page)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--tt-color-action-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      {children && <span className="tt-body-strong absolute text-ink">{children}</span>}
    </div>
  );
}
