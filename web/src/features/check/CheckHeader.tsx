import { useI18n } from "@/i18n/I18nProvider";
import { BackIcon, CircleButton } from "@/ui";

/** Back circle and a centred title: "Check a product" (Figma Snap, Match). */
export function CheckHeader({ onBack, onDark = false, mark = false }: { onBack: () => void; onDark?: boolean; mark?: boolean }) {
  const { t } = useI18n();
  return (
    <header className="relative z-10 grid h-14 grid-cols-[40px_1fr_40px] items-center">
      <CircleButton label={t("common.back")} icon={<BackIcon className="size-5" />} onClick={onBack} />
      <h1 className={onDark ? "tt-body-lg text-center text-white" : "tt-body-lg text-center text-ink"} style={{ fontSize: 15, fontWeight: 600 }}>
        {mark && <span aria-hidden className="mr-2 inline-block size-3 rounded-pill border-[3px] border-action align-middle" />}
        {t("check.header")}
      </h1>
    </header>
  );
}
