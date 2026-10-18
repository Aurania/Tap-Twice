import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Navigate, Outlet, useNavigate } from "react-router";
import type { Currency, ProfileV2, Weekday } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { amountToInput, parseAmount } from "@/lib/amount";
import { cx } from "@/lib/cx";
import { useProfile } from "@/state/ProfileProvider";
import { BackIcon, CircleButton } from "@/ui";

export type PocketDraft = { id: string; name: string; allocationPct: number; custom?: boolean };

/** Everything the four onboarding screens collect. Inputs keep their display strings; parsing happens where it is used. */
export type OnboardingDraft = {
  nickname: string;
  currency: Currency;
  income: string;
  expenses: string;
  workDays: Weekday[];
  hoursPerDay: number;
  pockets: PocketDraft[];
  goalName: string;
  target: string;
  saved: string;
  targetDate: string | null;
};

/** Suggested split from the Figma design: Fashion 30, Gadgets 20, Entertainment 25, Travel 25. These are defaults, not calculations. */
export const DEFAULT_POCKET_SPLIT = [
  { id: "fashion", allocationPct: 30 },
  { id: "gadgets", allocationPct: 20 },
  { id: "entertainment", allocationPct: 25 },
  { id: "travel", allocationPct: 25 },
] as const;

const BUILT_IN_IDS: readonly string[] = DEFAULT_POCKET_SPLIT.map((p) => p.id);

export const MAX_POCKETS = 12;

type DraftContext = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  /** True when Settings reopened a screen to change one part of the profile. */
  edit: boolean;
  /** Saves the whole profile (PUT /api/profile) and goes Home, or back to Settings when editing. */
  finish: () => Promise<void>;
  saving: boolean;
  saveError: boolean;
};

const Ctx = createContext<DraftContext | null>(null);

export function useOnboardingDraft(): DraftContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboardingDraft must be used inside <OnboardingLayout>");
  return ctx;
}

/** The draft as a profile, or null while a required answer is missing. The app is English only. */
export function draftToProfile(draft: OnboardingDraft): ProfileV2 | null {
  const income = parseAmount(draft.income, draft.currency, "en");
  const expenses = parseAmount(draft.expenses, draft.currency, "en");
  const target = parseAmount(draft.target, draft.currency, "en");
  if (income === null || expenses === null || target === null || !(target > 0) || draft.targetDate === null || !draft.goalName.trim()) return null;
  const nickname = draft.nickname.trim();
  return {
    ...(nickname ? { nickname } : {}),
    currency: draft.currency,
    monthlyIncome: income,
    monthlyExpenses: expenses,
    workDays: draft.workDays,
    hoursPerDay: draft.hoursPerDay,
    pockets: draft.pockets.map(({ id, name, allocationPct }) => ({ id, name, allocationPct })),
    goal: { name: draft.goalName.trim(), targetAmount: target, savedAmount: parseAmount(draft.saved, draft.currency, "en") ?? 0, targetDate: draft.targetDate },
    language: "en",
  };
}

function profileToDraft(p: ProfileV2): OnboardingDraft {
  const amount = (n: number) => amountToInput(n, p.currency, "en");
  return {
    nickname: p.nickname ?? "",
    currency: p.currency,
    income: amount(p.monthlyIncome),
    expenses: amount(p.monthlyExpenses),
    workDays: p.workDays,
    hoursPerDay: p.hoursPerDay,
    pockets: p.pockets.map((x) => ({ ...x, custom: !BUILT_IN_IDS.includes(x.id) })),
    goalName: p.goal.name,
    target: amount(p.goal.targetAmount),
    saved: amount(p.goal.savedAmount),
    targetDate: p.goal.targetDate,
  };
}

/**
 * Wraps the onboarding screens and keeps their answers while moving back and forth.
 * With `edit`, the same screens are reopened from Settings, prefilled from the saved profile.
 */
export function OnboardingLayout({ edit = false }: { edit?: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { profile, save } = useProfile();
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    edit && profile
      ? profileToDraft(profile)
      : {
          nickname: "",
          currency: "USD",
          income: "",
          expenses: "",
          workDays: ["mon", "tue", "wed", "thu", "fri"],
          hoursPerDay: 8,
          pockets: DEFAULT_POCKET_SPLIT.map((p) => ({ ...p, name: t(`pocket.${p.id}`) })),
          goalName: "",
          target: "",
          saved: "",
          targetDate: null,
        },
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const update = useCallback((patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch })), []);

  const finish = useCallback(async () => {
    const next = draftToProfile(draft);
    if (!next) return;
    setSaving(true);
    setSaveError(false);
    try {
      await save(next); // the server re-checks N1 and N2
      navigate(edit ? "/settings" : "/home", { replace: true });
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }, [draft, edit, navigate, save]);

  const value = useMemo(() => ({ draft, update, edit, finish, saving, saveError }), [draft, update, edit, finish, saving, saveError]);
  if (edit && !profile) return <Navigate to="/" replace />;
  return (
    <Ctx.Provider value={value}>
      <Outlet />
    </Ctx.Provider>
  );
}

/** Settings → edit: the onboarding screens, prefilled, saving straight back. */
export function EditProfileLayout() {
  return <OnboardingLayout edit />;
}

const STEPS = 4;

/** Back button and the 4-step progress bar (left out when editing from Settings, where there are no steps). */
export function OnboardingHeader({ step, onBack }: { step: 1 | 2 | 3 | 4; onBack: () => void }) {
  const { t } = useI18n();
  const { edit } = useOnboardingDraft();
  const navigate = useNavigate();
  return (
    <header className="flex h-14 items-center gap-3">
      <CircleButton label={t("common.back")} icon={<BackIcon className="size-5" />} onClick={edit ? () => navigate("/settings") : onBack} />
      {edit ? (
        <p className="tt-body-strong text-ink">{t("settings.editTitle")}</p>
      ) : (
        <div className="flex flex-1 gap-1.5" role="img" aria-label={t("common.stepOf", { n: step, total: STEPS })}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={cx("h-1 flex-1 rounded-pill", i < step ? "bg-action" : "bg-line")} />
          ))}
        </div>
      )}
    </header>
  );
}

/** The step's main button: "Next" during onboarding, "Save" when editing from Settings. */
export function useStepAction(next: () => void): { label: string; run: () => void; busy: boolean; error: boolean } {
  const { t } = useI18n();
  const { edit, finish, saving, saveError } = useOnboardingDraft();
  return edit ? { label: t("common.save"), run: () => void finish(), busy: saving, error: saveError } : { label: t("common.next"), run: next, busy: false, error: false };
}

export function OnboardingScreen({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      {children}
    </main>
  );
}

/** Hours per week = hours per day × work days. A count of hours, not money. */
export const weeklyHours = (hoursPerDay: number, days: number) => hoursPerDay * days;

export type { ProfileV2 };
