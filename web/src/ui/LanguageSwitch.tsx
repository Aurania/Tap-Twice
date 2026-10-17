import type { Language } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";

type Props = {
  value: Language;
  onChange: (lang: Language) => void;
  /** On the blue welcome screen the track is white. */
  onBlue?: boolean;
  className?: string;
};

/** Figma "Language switch": EN | ID segmented pill. */
export function LanguageSwitch({ value, onChange, onBlue = false, className }: Props) {
  const { t } = useI18n();
  const options: Language[] = ["en", "id"];
  return (
    <div
      role="radiogroup"
      aria-label={t("language.label")}
      className={cx("inline-flex h-[37px] rounded-pill p-1", onBlue ? "bg-white" : "bg-surface", className)}
    >
      {options.map((lang) => {
        const selected = lang === value;
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(lang)}
            className={cx(
              "tt-caption min-w-10 rounded-pill px-3 transition-colors duration-150",
              selected ? (onBlue ? "bg-surface text-ink" : "bg-page text-ink shadow-sm") : "text-ink-2",
            )}
          >
            {t(lang === "en" ? "language.en" : "language.id")}
          </button>
        );
      })}
    </div>
  );
}
