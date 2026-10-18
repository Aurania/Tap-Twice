import type { CSSProperties } from "react";

type Props = {
  /** Allocation percentage, 0–100. */
  value: number;
  onChange: (value: number) => void;
  /** CSS color of the filled part and the thumb ring. */
  color: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
};

/** Allocation slider for one pocket. Native range input, so keyboard and screen readers work. */
export function PocketSlider({ value, onChange, color, label, min = 0, max = 100, step = 1 }: Props) {
  const style = { "--slider-color": color, "--slider-pct": `${((value - min) / (max - min)) * 100}%` } as CSSProperties;
  return (
    <input
      type="range"
      className="tt-slider"
      style={style}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      aria-valuetext={`${value}%`}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}
