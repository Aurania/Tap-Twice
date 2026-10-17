import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";

/** Persistent "not financial advice" line (web/CLAUDE.md rule 5). */
export function Disclaimer({ className }: { className?: string }) {
  const { t } = useI18n();
  return <p className={cx("tt-caption text-center text-ink-2", className)}>{t("disclaimer.advice")}</p>;
}
