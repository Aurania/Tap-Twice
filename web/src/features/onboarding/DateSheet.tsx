import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { BottomSheet, Button, PICKER_PAD, PICKER_ROW, ScrollPicker } from "@/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  /** "YYYY-MM-DD" or null. */
  value: string | null;
  /** Receives the last day of the chosen month, "YYYY-MM-DD". */
  onPick: (isoDate: string) => void;
};

/** 01b-s Pick month & year: two scroll pickers sharing one selection band, then "Set date". */
export function DateSheet({ open, onClose, value, onPick }: Props) {
  const { t, lang } = useI18n();
  const now = new Date();
  const nowIndex = now.getFullYear() * 12 + now.getMonth();

  const initial = value ? { y: Number(value.slice(0, 4)), m: Number(value.slice(5, 7)) - 1 } : { y: nowIndex % 12 === 11 ? now.getFullYear() + 1 : now.getFullYear(), m: (now.getMonth() + 1) % 12 };
  const [month, setMonth] = useState(initial.m);
  const [year, setYear] = useState(initial.y);

  const months = Array.from({ length: 12 }, (_, m) => ({
    value: m,
    label: new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, m, 1))),
  }));
  const years = Array.from({ length: 11 }, (_, i) => ({ value: now.getFullYear() + i, label: String(now.getFullYear() + i) }));

  const inPast = year * 12 + month < nowIndex;

  return (
    <BottomSheet open={open} onClose={onClose} title={t("onboarding.byWhen")} description={t("onboarding.monthSheetBody")}>
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 rounded-md border border-action bg-soft"
          style={{ top: PICKER_ROW * PICKER_PAD, height: PICKER_ROW }}
        />
        <div className="relative grid grid-cols-2">
          <ScrollPicker band={false} label={t("onboarding.byWhen")} value={month} onChange={setMonth} options={months} />
          <ScrollPicker band={false} label={t("onboarding.byWhen")} value={year} onChange={setYear} options={years} />
        </div>
      </div>
      {inPast && (
        <p role="alert" className="tt-small mt-2 text-warn">
          {t("onboarding.dateInPast")}
        </p>
      )}
      <Button
        className="mt-4"
        disabled={inPast}
        onClick={() => {
          onPick(new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10));
          onClose();
        }}
      >
        {t("onboarding.setDate")}
      </Button>
    </BottomSheet>
  );
}
