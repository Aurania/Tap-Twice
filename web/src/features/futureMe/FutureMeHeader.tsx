import { useI18n } from "@/i18n/I18nProvider";
import { CircleButton, CloseIcon, FutureMeRobot } from "@/ui";

/** Robot, "Future Me / AI assistant · knows your pockets" and a close button (Figma 02a, 02b). */
export function FutureMeHeader({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3">
      <FutureMeRobot size={44} />
      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="tt-body-lg text-ink" style={{ fontWeight: 700 }}>
          {t("futureMe.name")}
        </h2>
        <p className="tt-small text-ink-2">{t("futureMe.role")}</p>
      </div>
      <CircleButton label={t("common.close")} icon={<CloseIcon className="size-5" />} onClick={onClose} />
    </div>
  );
}
