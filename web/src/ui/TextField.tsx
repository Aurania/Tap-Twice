import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Shows "5/20" inside the field (nickname). Requires maxLength. */
  showCounter?: boolean;
  helper?: ReactNode;
  /** Leading text inside the field, e.g. "Rp". */
  prefix?: string;
  tone?: "default" | "warning" | "danger";
};

/** Labelled input, 52 px tall, radius 16. */
export function TextField({ label, value, onChange, showCounter, helper, prefix, tone = "default", maxLength, className, id, ...rest }: Props) {
  const { t } = useI18n();
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-help`;
  return (
    <div className={cx("min-w-0", className)}>
      <label htmlFor={inputId} className="tt-small mb-1.5 block text-ink-2">
        {label}
      </label>
      <div
        className={cx(
          "flex h-[52px] items-center gap-2 rounded-md border px-4",
          tone === "warning" && "border-warn/40 bg-warning-bg",
          tone === "danger" && "border-danger bg-page",
          tone === "default" && "border-line bg-page focus-within:border-action",
        )}
      >
        {prefix && <span className="tt-body-lg text-ink-2">{prefix}</span>}
        <input
          id={inputId}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={helper ? helperId : undefined}
          className="tt-body-lg min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-2/70"
          {...rest}
        />
        {showCounter && maxLength !== undefined && (
          <span className="tt-caption shrink-0 text-ink-2" aria-hidden>
            {t("field.counter", { count: value.length, max: maxLength })}
          </span>
        )}
      </div>
      {helper && (
        <p id={helperId} className={cx("tt-small mt-1.5", tone === "danger" ? "text-danger" : "text-ink-2")}>
          {helper}
        </p>
      )}
    </div>
  );
}
