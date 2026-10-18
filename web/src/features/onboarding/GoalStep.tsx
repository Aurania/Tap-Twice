import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { parseAmount } from "@/lib/amount";
import { formatMonthYear } from "@/lib/dates";
import { AmountField, Button, TextField } from "@/ui";
import { ChevronDown } from "lucide-react";
import { DateSheet } from "./DateSheet";
import { draftToProfile, OnboardingHeader, OnboardingScreen, useOnboardingDraft } from "./OnboardingLayout";

/**
 * 01b Goal. Still the v1 layout with v2 data: the goal is required, and the "Just spend less" segment and
 * "Skip" stay hidden. TODO(design): handoff §12 #2, this screen has not been redesigned.
 * Saving sends the whole profile; the server re-checks N1 and N2.
 */
export function GoalStep() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { draft, update, edit, finish, saving, saveError } = useOnboardingDraft();
  const [dateOpen, setDateOpen] = useState(false);

  const income = parseAmount(draft.income, draft.currency, lang);
  const expenses = parseAmount(draft.expenses, draft.currency, lang);
  if (income === null || expenses === null) return <Navigate to="/onboarding/money" replace />;

  // Saving sends the whole profile (draftToProfile); the server re-checks N1 and N2.
  const canFinish = draftToProfile(draft) !== null;

  return (
    <OnboardingScreen>
      <OnboardingHeader step={4} onBack={() => navigate("/onboarding/pockets")} />
      <h1 className="tt-h1 mt-4">{t("onboarding.goalTitle")}</h1>
      <p className="tt-body mt-2 text-ink-2">{t("onboarding.goalSub")}</p>

      <form
        className="mt-6 flex flex-1 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canFinish) void finish();
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
          <AmountField label={t("onboarding.target")} currency={draft.currency} value={draft.target} onChange={(target) => update({ target })} />
          <AmountField label={t("onboarding.savedSoFar")} currency={draft.currency} value={draft.saved} onChange={(saved) => update({ saved })} placeholder="0" />
        </div>

        <div>
          <p className="tt-small mb-1.5 text-ink-2" id="by-when">
            {t("onboarding.byWhen")}
          </p>
          <button
            type="button"
            aria-labelledby="by-when"
            aria-haspopup="dialog"
            onClick={() => setDateOpen(true)}
            className="tt-body-lg flex h-[52px] w-full items-center justify-between rounded-md border border-line bg-page px-4 text-left"
          >
            <span className={draft.targetDate ? "text-ink" : "text-ink-2"}>
              {draft.targetDate ? formatMonthYear(draft.targetDate, lang) : t("onboarding.pickMonth")}
            </span>
            <ChevronDown aria-hidden className="size-5 text-ink" />
          </button>
        </div>

        {saveError && (
          <p role="alert" className="tt-small text-center text-warn">
            {t("onboarding.saveError")}
          </p>
        )}
        <Button type="submit" className="mt-auto" disabled={!canFinish || saving}>
          {edit ? t("common.save") : t("onboarding.finish")}
        </Button>
      </form>

      <DateSheet open={dateOpen} onClose={() => setDateOpen(false)} value={draft.targetDate} onPick={(targetDate) => update({ targetDate })} />
    </OnboardingScreen>
  );
}
