import { useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { parseRupiah } from "@/lib/money";
import { Button, ChoiceChip, MoneyField, TextField } from "@/ui";
import { OnboardingHeader, OnboardingScreen, useOnboardingDraft, type WorkPreset } from "./OnboardingLayout";

const PRESETS: Record<Exclude<WorkPreset, "varies">, { hoursPerDay: string; daysPerWeek: string }> = {
  "9to5": { hoursPerDay: "8", daysPerWeek: "5" },
  shifts: { hoursPerDay: "8", daysPerWeek: "6" },
};

/** hoursPerWeek = hoursPerDay × daysPerWeek (BACKEND_GAPS.md #2). Not money. */
export function hoursPerWeek(hoursPerDay: string, daysPerWeek: string): number {
  return (Number(hoursPerDay) || 0) * (Number(daysPerWeek) || 0);
}

/** 01a Onboarding · Money. Currency fixed to IDR and income required (gaps #1, #3). */
export function MoneyStep() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { draft, update } = useOnboardingDraft();

  const income = parseRupiah(draft.income);
  const weekly = hoursPerWeek(draft.hoursPerDay, draft.daysPerWeek);
  const hoursValid = weekly >= 1 && weekly <= 120;
  const canContinue = income !== null && income > 0 && hoursValid;

  const pickPreset = (preset: WorkPreset) => update(preset === "varies" ? { preset } : { preset, ...PRESETS[preset] });
  const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

  return (
    <OnboardingScreen>
      <OnboardingHeader step={1} onBack={() => navigate("/welcome/4")} />
      <h1 className="tt-h1 mt-4">{t("onboarding.moneyTitle")}</h1>
      <p className="tt-body mt-2 text-ink-2">{t("onboarding.moneySub")}</p>

      <form
        className="mt-6 flex flex-1 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) navigate("/onboarding/goal");
        }}
      >
        <TextField
          label={t("onboarding.nickname")}
          placeholder={t("onboarding.nicknamePlaceholder")}
          value={draft.nickname}
          onChange={(nickname) => update({ nickname })}
          maxLength={20}
          showCounter
          autoComplete="nickname"
        />

        <div>
          <p className="tt-small mb-1.5 text-ink-2">{t("onboarding.currency")}</p>
          <p className="tt-body-lg flex h-[52px] items-center rounded-md border border-line bg-page px-4 text-ink">{t("onboarding.currencyValue")}</p>
        </div>

        <MoneyField
          label={t("onboarding.income")}
          value={draft.income}
          onChange={(income) => update({ income })}
          helper={t("onboarding.incomeHelp")}
          required
        />

        <fieldset>
          <legend className="tt-small mb-2 text-ink-2">{t("onboarding.work")}</legend>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip selected={draft.preset === "9to5"} onClick={() => pickPreset("9to5")}>
              {t("onboarding.preset95")}
            </ChoiceChip>
            <ChoiceChip selected={draft.preset === "shifts"} onClick={() => pickPreset("shifts")}>
              {t("onboarding.presetShifts")}
            </ChoiceChip>
            <ChoiceChip selected={draft.preset === "varies"} onClick={() => pickPreset("varies")}>
              {t("onboarding.presetVaries")}
            </ChoiceChip>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2.5">
          <TextField
            label={t("onboarding.hoursPerDay")}
            inputMode="numeric"
            value={draft.hoursPerDay}
            onChange={(v) => update({ hoursPerDay: digits(v, 2), preset: "varies" })}
          />
          <TextField
            label={t("onboarding.daysPerWeek")}
            inputMode="numeric"
            value={draft.daysPerWeek}
            onChange={(v) => update({ daysPerWeek: digits(v, 1), preset: "varies" })}
          />
        </div>
        {!hoursValid && draft.hoursPerDay && draft.daysPerWeek && (
          <p className="tt-small -mt-2 text-warn">{t("onboarding.hoursInvalid", { hours: weekly })}</p>
        )}

        <Button type="submit" className="mt-auto" disabled={!canContinue}>
          {t("common.next")}
        </Button>
      </form>
    </OnboardingScreen>
  );
}
