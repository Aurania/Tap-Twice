import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { formatMonthYear, upcomingMonths } from "@/lib/dates";
import { parseRupiah, rupiahInput } from "@/lib/money";
import { BottomSheet, Button, CheckIcon, MoneyField, TextField } from "@/ui";
import { ChevronDown } from "lucide-react";
import { OnboardingHeader, OnboardingScreen, useOnboardingDraft } from "./OnboardingLayout";

/**
 * 01b Onboarding · Goal. Goal is required for now, so the "Just spend less" segment and
 * "Skip for now" are hidden (BACKEND_GAPS.md #3).
 */
export function GoalStep() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { draft, update } = useOnboardingDraft();
  const [monthsOpen, setMonthsOpen] = useState(false);
  const income = parseRupiah(draft.income);

  // Joy budget prefill: 10 % of income, editable (team decision in REPO_CONTEXT.md §8).
  useEffect(() => {
    if (draft.joy === null && income) update({ joy: rupiahInput(Math.round((income * 0.1) / 1000) * 1000) });
  }, [draft.joy, income, update]);

  if (!income) return <Navigate to="/onboarding/money" replace />;

  const target = parseRupiah(draft.target);
  const joy = parseRupiah(draft.joy ?? "");
  const canContinue = draft.goalName.trim().length > 0 && !!target && target > 0 && draft.targetDate !== null && joy !== null;

  return (
    <OnboardingScreen>
      <OnboardingHeader step={2} onBack={() => navigate("/onboarding/money")} showLanguage={false} />
      <h1 className="tt-h1 mt-4">{t("onboarding.goalTitle")}</h1>
      <p className="tt-body mt-2 text-ink-2">{t("onboarding.goalSub")}</p>

      <form
        className="mt-6 flex flex-1 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) navigate("/onboarding/interest");
        }}
      >
        <TextField
          label={t("onboarding.goalName")}
          placeholder={t("onboarding.goalNamePlaceholder")}
          value={draft.goalName}
          onChange={(goalName) => update({ goalName })}
          maxLength={80}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <MoneyField label={t("onboarding.target")} value={draft.target} onChange={(target) => update({ target })} />
          <MoneyField label={t("onboarding.savedSoFar")} value={draft.saved} onChange={(saved) => update({ saved })} placeholder="0" />
        </div>

        <div>
          <p className="tt-small mb-1.5 text-ink-2" id="by-when">
            {t("onboarding.byWhen")}
          </p>
          <button
            type="button"
            aria-labelledby="by-when"
            aria-haspopup="dialog"
            onClick={() => setMonthsOpen(true)}
            className="tt-body-lg flex h-[52px] w-full items-center justify-between rounded-md border border-line bg-page px-4 text-left"
          >
            <span className={draft.targetDate ? "text-ink" : "text-ink-2"}>
              {draft.targetDate ? formatMonthYear(draft.targetDate, lang) : t("onboarding.pickMonth")}
            </span>
            <ChevronDown aria-hidden className="size-5 text-ink" />
          </button>
        </div>

        <MoneyField label={t("onboarding.joyBudget")} value={draft.joy ?? ""} onChange={(joy) => update({ joy })} helper={t("onboarding.joyHelp")} />

        <Button type="submit" className="mt-auto" disabled={!canContinue}>
          {t("common.next")}
        </Button>
      </form>

      <BottomSheet open={monthsOpen} onClose={() => setMonthsOpen(false)} title={t("onboarding.byWhen")} description={t("onboarding.monthSheetBody")}>
        <ul className="-mx-1 max-h-[50dvh] space-y-2 overflow-y-auto px-1 pb-1">
          {upcomingMonths(24).map((date) => {
            const selected = date === draft.targetDate;
            return (
              <li key={date}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    update({ targetDate: date });
                    setMonthsOpen(false);
                  }}
                  className={cx(
                    "tt-body-strong flex h-12 w-full items-center justify-between rounded-md border px-4 text-left",
                    selected ? "border-action bg-soft" : "border-line bg-page",
                  )}
                >
                  {formatMonthYear(date, lang)}
                  {selected && <CheckIcon aria-hidden className="size-5 text-action" />}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </OnboardingScreen>
  );
}
