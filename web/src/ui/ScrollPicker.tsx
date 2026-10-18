import { useEffect, useId, useRef, useState } from "react";

export type PickerOption<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
  options: PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

const ROW = 44;
const VISIBLE = 5; // 5 rows, the middle one is selected
const PAD = Math.floor(VISIBLE / 2);

/** Row opacity by distance from the selected row: 1, 0.5, 0.25 (handoff §11). */
const fade = (distance: number) => (distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25);

/** Scroll-snap picker: 5 visible rows, a band behind the middle one, rows above and below fade out. */
export function ScrollPicker<T extends string | number>({ options, value, onChange, label }: Props<T>) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));
  const [center, setCenter] = useState(selected);

  // Follow the value from outside (initial render, programmatic changes).
  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== selected) el.scrollTop = selected * ROW;
    setCenter(selected);
  }, [selected]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ROW)));
    setCenter(idx);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      if (options[idx] && options[idx].value !== value) onChange(options[idx].value);
    }, 120);
  };

  const step = (delta: number) => {
    const next = Math.max(0, Math.min(options.length - 1, selected + delta));
    ref.current?.scrollTo({ top: next * ROW, behavior: "smooth" });
    if (options[next]) onChange(options[next].value);
  };

  return (
    <div className="relative mx-auto w-full" style={{ height: ROW * VISIBLE }}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 rounded-md bg-soft" style={{ top: ROW * PAD, height: ROW }} />
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`${id}-${selected}`}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") (e.preventDefault(), step(1));
          if (e.key === "ArrowUp") (e.preventDefault(), step(-1));
        }}
        className="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-md outline-offset-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ height: ROW * PAD }} aria-hidden />
        {options.map((o, i) => (
          <div
            key={String(o.value)}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === selected}
            onClick={() => step(i - selected)}
            className="tt-body-lg flex snap-center items-center justify-center text-ink transition-opacity"
            style={{ height: ROW, opacity: fade(Math.abs(i - center)) }}
          >
            {o.label}
          </div>
        ))}
        <div style={{ height: ROW * PAD }} aria-hidden />
      </div>
    </div>
  );
}
