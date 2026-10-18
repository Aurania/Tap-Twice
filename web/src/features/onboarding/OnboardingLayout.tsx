import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Outlet } from "react-router";
import type { Currency, ProfileV2, Weekday } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { amountToInput, parseAmount } from "@/lib/amount";
import { cx } from "@/lib/cx";
import { BackIcon, CircleButton, LanguageSwitch } from "@/ui";

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

export const MAX_POCKETS = 12;

type DraftContext = { draft: OnboardingDraft; update: (patch: Partial<OnboardingDraft>) => void };

const Ctx = createContext<DraftContext | null>(null);

export function useOnboardingDraft(): DraftContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboardingDraft must be used inside <OnboardingLayout>");
  return ctx;
}

/** Wraps the onboarding screens and keeps their answers while moving back and forth. */
export function OnboardingLayout() {
  const { t, lang } = useI18n();
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({
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
  }));
  const update = useCallback((patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch })), []);

  // Amounts are kept as typed text, which depends on the language's separators ("3,200" vs "3.200").
  // When the language changes, re-read each amount with the old language and write it with the new one.
  const prevLang = useRef(lang);
  useEffect(() => {
    const from = prevLang.current;
    if (from === lang) return;
    prevLang.current = lang;
    setDraft((d) => {
      const convert = (text: string) => {
        const n = parseAmount(text, d.currency, from);
        return n === null ? text : amountToInput(n, d.currency, lang);
      };
      return { ...d, income: convert(d.income), expenses: convert(d.expenses), target: convert(d.target), saved: convert(d.saved) };
    });
  }, [lang]);

  const value = useMemo(() => ({ draft, update }), [draft, update]);
  return (
    <Ctx.Provider value={value}>
      <Outlet />
    </Ctx.Provider>
  );
}

const STEPS = 4;

/** Back button, 4-step progress bar and (optionally) the EN | ID switch. */
export function OnboardingHeader({ step, onBack, showLanguage = true }: { step: 1 | 2 | 3 | 4; onBack: () => void; showLanguage?: boolean }) {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="flex h-14 items-center gap-3">
      <CircleButton label={t("common.back")} icon={<BackIcon className="size-5" />} onClick={onBack} />
      <div className="flex flex-1 gap-1.5" role="img" aria-label={t("common.stepOf", { n: step, total: STEPS })}>
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={cx("h-1 flex-1 rounded-pill", i < step ? "bg-action" : "bg-line")} />
        ))}
      </div>
      {showLanguage && <LanguageSwitch value={lang} onChange={setLang} />}
    </header>
  );
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
