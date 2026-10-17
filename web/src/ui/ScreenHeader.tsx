import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { CircleButton } from "./CircleButton";
import { BackIcon } from "./icons";
import { MarkLabel } from "./Mark";

type Props = {
  /** Small centred label with the mark, e.g. "Cart Check". */
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
  /** On blue screens the label is white with a yellow mark. */
  onBlue?: boolean;
  className?: string;
};

/** Top bar: back circle button, centred mark + label, optional right slot. */
export function ScreenHeader({ title, onBack, right, onBlue = false, className }: Props) {
  const { t } = useI18n();
  return (
    <header className={cx("grid h-14 grid-cols-[40px_1fr_40px] items-center", className)}>
      <div>
        {onBack && (
          <CircleButton
            label={t("common.back")}
            icon={<BackIcon className="size-5" />}
            onClick={onBack}
            className={onBlue ? "bg-white/90" : undefined}
          />
        )}
      </div>
      <div className="flex justify-center">{title && <MarkLabel tone={onBlue ? "highlight" : "action"}>{title}</MarkLabel>}</div>
      <div className="flex justify-end">{right}</div>
    </header>
  );
}
