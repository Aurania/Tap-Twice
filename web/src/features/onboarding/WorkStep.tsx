import { useNavigate } from "react-router";
import { WEEKDAYS, type Weekday } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { Button, ScrollPicker } from "@/ui";
import { OnboardingHeader, OnboardingScreen, useOnboardingDraft, useStepAction, weeklyHours } from "./OnboardingLayout";

const HOURS = [4, 5, 6, 7, 8, 9, 10];

/** 01a-2 Work time: pick the days you work (default Mon–Fri) and scroll to set hours per day (4–10). */
export function WorkStep() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { draft, update } = useOnboardingDraft();
  const action = useStepAction(() => navigate("/onboarding/pockets"));

  const days = draft.workDays.length;
  const total = weeklyHours(draft.hoursPerDay, days);
  const toggle = (day: Weekday) =>
    update({ workDays: WEEKDAYS.filter((d) => (d === day ? !draft.workDays.includes(d) : draft.workDays.includes(d))) });

  return (
    <OnboardingScreen>
      <OnboardingHeader step={2} onBack={() => navigate("/onboarding/money")} />
      <h1 className="tt-h1 mt-4">{t("onboarding.workTitle")}</h1>
      <p className="tt-body mt-2 text-ink-2">{t("onboarding.workSub")}</p>

      <div className="mt-5 flex flex-1 flex-col gap-4">
        <fieldset>
          <legend className="tt-small mb-2 text-ink-2">{t("onboarding.workDays")}</legend>
          <div className="flex gap-1.5">
            {WEEKDAYS.map((d) => {
              const on = draft.workDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(d)}
                  className={cx(
                    "tt-body-strong h-[39px] min-w-0 flex-1 rounded-pill text-[13px] transition-colors duration-150",
                    on ? "bg-action text-white" : "bg-surface text-ink",
                  )}
                >
                  {t(`onboarding.day.${d}`)}
                </button>
              );
            })}
          </div>
          {days === 0 && (
            <p role="alert" className="tt-small mt-2 text-warn">
              {/* TODO(design): "no work day selected" is not designed; this is a plain inline hint. */}
              {t("onboarding.workNoDays")}
            </p>
          )}
        </fieldset>

        <div>
          <p className="tt-small mb-2 text-ink-2">{t("onboarding.workHours")}</p>
          <div className="rounded-card bg-surface px-2">
            <ScrollPicker
              label={t("onboarding.workHours")}
              bandClassName="bg-page"
              value={draft.hoursPerDay}
              onChange={(hoursPerDay) => update({ hoursPerDay })}
              options={HOURS.map((n) => ({ value: n, label: t("onboarding.hrs", { n }) }))}
            />
          </div>
          <p className="tt-small mt-2 text-ink-2">{t("onboarding.workHoursHelp", { total, days })}</p>
        </div>

        <section className="rounded-card bg-surface p-4">
          <p className="tt-small text-ink-2">{t("onboarding.workWeek")}</p>
          <p className="tt-body-lg mt-1 text-ink">{t("onboarding.workWeekSum", { hours: draft.hoursPerDay, days, total })}</p>
          <p className="tt-small mt-1 text-ink-2">{t("onboarding.workWeekUse")}</p>
        </section>

        {action.error && (
          <p role="alert" className="tt-small text-center text-warn">
            {t("onboarding.saveError")}
          </p>
        )}
        <Button className="mt-auto" disabled={days === 0 || action.busy} onClick={action.run}>
          {action.label}
        </Button>
      </div>
    </OnboardingScreen>
  );
}
