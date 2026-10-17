import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import type { Profile } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { parseRupiah } from "@/lib/money";
import { KEYS, writeKey } from "@/lib/storage";
import { useProfile } from "@/state/ProfileProvider";
import { Button, Mark } from "@/ui";
import { hoursPerWeek } from "./MoneyStep";
import { OnboardingHeader, OnboardingScreen, useOnboardingDraft } from "./OnboardingLayout";

/** 01c Onboarding · Avoid interest. Either answer saves the profile (PUT /api/profile) and opens Home. */
export function InterestStep() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { save } = useProfile();
  const { draft, update } = useOnboardingDraft();
  const [saving, setSaving] = useState<boolean | null>(null);
  const [error, setError] = useState(false);

  const income = parseRupiah(draft.income);
  const target = parseRupiah(draft.target);
  const joy = parseRupiah(draft.joy ?? "");
  if (!income || !target || !draft.targetDate || joy === null) return <Navigate to="/onboarding/money" replace />;

  const finish = async (avoidInterest: boolean) => {
    // Not in the API yet: kept on this device and used only for "Contains interest" chips (gaps #3).
    writeKey(KEYS.avoidInterest, String(avoidInterest));
    update({ avoidInterest });
    const nickname = draft.nickname.trim();
    const profile: Profile = {
      ...(nickname ? { nickname } : {}),
      monthlyIncome: income,
      hoursPerWeek: hoursPerWeek(draft.hoursPerDay, draft.daysPerWeek),
      joyBudget: joy,
      goal: {
        name: draft.goalName.trim(),
        targetAmount: target,
        savedAmount: parseRupiah(draft.saved) ?? 0,
        targetDate: draft.targetDate!,
      },
      language: lang,
    };
    setSaving(avoidInterest);
    setError(false);
    try {
      await save(profile);
      navigate("/home", { replace: true });
    } catch {
      setError(true);
      setSaving(null);
    }
  };

  return (
    <OnboardingScreen>
      <OnboardingHeader step={3} onBack={() => navigate("/onboarding/goal")} showLanguage={false} />
      <div className="flex flex-1 flex-col justify-center pb-16">
        <span aria-hidden className="inline-flex size-[72px] items-center justify-center rounded-pill bg-soft">
          <Mark size={32} />
        </span>
        <h1 className="tt-h1 mt-6">{t("onboarding.interestTitle")}</h1>
        <p className="tt-body mt-3 text-ink-2">{t("onboarding.interestBody")}</p>
        <div className="mt-6 space-y-2.5">
          <Button onClick={() => finish(true)} disabled={saving !== null} aria-busy={saving === true}>
            {saving === true ? t("common.loading") : t("onboarding.interestYes")}
          </Button>
          <Button variant="secondary" onClick={() => finish(false)} disabled={saving !== null} aria-busy={saving === false}>
            {saving === false ? t("common.loading") : t("onboarding.interestNo")}
          </Button>
        </div>
        <p className="tt-caption mt-4 text-center text-ink-2">{t("onboarding.interestNote")}</p>
        {error && (
          <p role="alert" className="tt-small mt-4 text-center text-warn">
            {t("onboarding.saveError")}
          </p>
        )}
      </div>
    </OnboardingScreen>
  );
}
