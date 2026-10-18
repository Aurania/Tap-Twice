import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import type { ProfileV2 } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { parseAmount } from "@/lib/amount";
import { formatMonthYear } from "@/lib/dates";
import { useProfile } from "@/state/ProfileProvider";
import { AmountField, Button, TextField } from "@/ui";
import { ChevronDown } from "lucide-react";
import { DateSheet } from "./DateSheet";
import { OnboardingHeader, OnboardingScreen, useOnboardingDraft } from "./OnboardingLayout";

/**
 * 01b Goal. Still the v1 layout with v2 data: the goal is required, and the "Just spend less" segment and
 * "Skip" stay hidden. TODO(design): handoff §12 #2, this screen has not been redesigned.
 * Saving sends the whole profile; the server re-checks N1 and N2.
 */
export function GoalStep() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { save } = useProfile();
  const { draft, update } = useOnboardingDraft();
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const income = parseAmount(draft.income, draft.currency, lang);
  const expenses = parseAmount(draft.expenses, draft.currency, lang);
  if (income === null || expenses === null) return <Navigate to="/onboarding/money" replace />;

  const target = parseAmount(draft.target, draft.currency, lang);
  const canFinish = draft.goalName.trim().length > 0 && target !== null && target > 0 && draft.targetDate !== null;

  const finish = async () => {
    if (!canFinish || target === null || draft.targetDate === null) return;
    const nickname = draft.nickname.trim();
    const profile: ProfileV2 = {
      ...(nickname ? { nickname } : {}),
      currency: draft.currency,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      workDays: draft.workDays,
      hoursPerDay: draft.hoursPerDay,
      pockets: draft.pockets.map(({ id, name, allocationPct }) => ({ id, name, allocationPct })),
      goal: { name: draft.goalName.trim(), targetAmount: target, savedAmount: parseAmount(draft.saved, draft.currency, lang) ?? 0, targetDate: draft.targetDate },
      language: lang,
    };
    setSaving(true);
    setError(false);
    try {
      await save(profile);
      navigate("/home", { replace: true });
    } catch {
      setError(true);
      setSaving(false);
    }
  };

  return (
    <OnboardingScreen>
      <OnboardingHeader step={4} onBack={() => navigate("/onboarding/pockets")} showLanguage={false} />
      <h1 className="tt-h1 mt-4">{t("onboarding.goalTitle")}</h1>
      <p className="tt-body mt-2 text-ink-2">{t("onboarding.goalSub")}</p>

      <form
        className="mt-6 flex flex-1 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void finish();
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

        {error && (
          <p role="alert" className="tt-small text-center text-warn">
            {t("onboarding.saveError")}
          </p>
        )}
        <Button type="submit" className="mt-auto" disabled={!canFinish || saving}>
          {t("onboarding.finish")}
        </Button>
      </form>

      <DateSheet open={dateOpen} onClose={() => setDateOpen(false)} value={draft.targetDate} onPick={(targetDate) => update({ targetDate })} />
    </OnboardingScreen>
  );
}
