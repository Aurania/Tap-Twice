import { useState } from "react";
import { useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { parseAmount } from "@/lib/amount";
import { formatMoney } from "@/lib/format";
import { AmountField, Button, TextField } from "@/ui";
import { ChevronDown } from "lucide-react";
import { CurrencySheet, currencyFlag, currencyName } from "./CurrencySheet";
import { OnboardingHeader, OnboardingScreen, useOnboardingDraft } from "./OnboardingLayout";
import { useBudgetPreview } from "./useBudgetPreview";

/** 01a-1 Money & income. Currency (default USD), income and expenses are required. N1 comes from the server's numbers. */
export function MoneyStep() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { draft, update } = useOnboardingDraft();
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const income = parseAmount(draft.income, draft.currency, lang);
  const expenses = parseAmount(draft.expenses, draft.currency, lang);
  const filled = income !== null && income > 0 && expenses !== null;

  const { status, preview } = useBudgetPreview(filled ? { monthlyIncome: income, monthlyExpenses: expenses, pockets: [] } : null);
  // Only trust the preview that matches what is on screen.
  const checked = filled && status === "ready" && preview !== null;
  const noRoom = checked && !preview.hasRoom;
  const canContinue = checked && preview.hasRoom;

  const error = noRoom
    ? preview.expensesOverBy > 0
      ? t("onboarding.expensesOver", { amount: formatMoney(preview.expensesOverBy, draft.currency, lang) })
      : t("onboarding.expensesEqual")
    : null;

  return (
    <OnboardingScreen>
      <OnboardingHeader step={1} onBack={() => navigate("/welcome/4")} />
      <h1 className="tt-h1 mt-4">{t("onboarding.moneyTitle")}</h1>
      <p className="tt-body mt-2 text-ink-2">{t("onboarding.moneySub")}</p>

      <form
        className="mt-6 flex flex-1 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) navigate("/onboarding/work");
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
          <p className="tt-small mb-1.5 text-ink-2" id="currency-label">
            {t("onboarding.currency")}
          </p>
          <button
            type="button"
            aria-labelledby="currency-label"
            aria-haspopup="dialog"
            onClick={() => setCurrencyOpen(true)}
            className="tt-body-lg flex h-[52px] w-full items-center justify-between rounded-md border border-line bg-page px-4 text-left"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden>{currencyFlag(draft.currency)}</span>
              {draft.currency} · {currencyName(draft.currency, lang)}
            </span>
            <ChevronDown aria-hidden className="size-5 text-ink" />
          </button>
          <p className="tt-small mt-1.5 text-ink-2">{t("onboarding.currencyHelp")}</p>
        </div>

        <AmountField
          label={t("onboarding.income")}
          currency={draft.currency}
          value={draft.income}
          onChange={(income) => update({ income })}
          helper={t("onboarding.incomeHelp")}
          required
        />
        <AmountField
          label={t("onboarding.expenses")}
          currency={draft.currency}
          value={draft.expenses}
          onChange={(expenses) => update({ expenses })}
          helper={error ?? t("onboarding.expensesHelp")}
          tone={error ? "danger" : "default"}
          aria-invalid={error ? true : undefined}
          required
        />
        {status === "error" && (
          <p role="alert" className="tt-small text-center text-warn">
            {t("onboarding.previewError")}
          </p>
        )}

        <Button type="submit" className="mt-auto" disabled={!canContinue}>
          {t("common.next")}
        </Button>
      </form>

      <CurrencySheet open={currencyOpen} onClose={() => setCurrencyOpen(false)} value={draft.currency} onPick={(currency) => update({ currency, income: "", expenses: "" })} />
    </OnboardingScreen>
  );
}
