import { createContext, useContext, useState, type ReactNode } from "react";
import { Outlet } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { rupiahInput } from "@/lib/money";
import { KEYS, readKey } from "@/lib/storage";
import { useProfile } from "@/state/ProfileProvider";
import { BackIcon, CircleButton, LanguageSwitch } from "@/ui";

export type WorkPreset = "9to5" | "shifts" | "varies";

/** Form state shared by 01a → 01b → 01c. Inputs keep their display strings; parsing happens on submit. */
export type OnboardingDraft = {
  nickname: string;
  income: string;
  preset: WorkPreset;
  hoursPerDay: string;
  daysPerWeek: string;
  goalName: string;
  target: string;
  saved: string;
  targetDate: string | null;
  /** null until the goal screen prefills it (10 % of income, gaps decision). */
  joy: string | null;
  avoidInterest: boolean | null;
};

type DraftContext = { draft: OnboardingDraft; update: (patch: Partial<OnboardingDraft>) => void };

const Ctx = createContext<DraftContext | null>(null);

export function useOnboardingDraft(): DraftContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboardingDraft must be used inside <OnboardingLayout>");
  return ctx;
}

/** Wraps the three onboarding screens and keeps their answers while moving back and forth. */
export function OnboardingLayout() {
  const { profile } = useProfile();
  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    // Prefill from an existing profile (Settings reopens these screens later).
    const p = profile;
    const hours = p?.hoursPerWeek;
    const fiveDay = hours !== undefined && hours % 5 === 0 && hours / 5 <= 24;
    const stored = readKey(KEYS.avoidInterest);
    return {
      nickname: p?.nickname ?? "",
      income: p ? rupiahInput(p.monthlyIncome) : "",
      preset: !p || hours === 40 ? "9to5" : hours === 48 ? "shifts" : "varies",
      hoursPerDay: p ? String(fiveDay ? hours! / 5 : hours) : "8",
      daysPerWeek: p ? (fiveDay ? "5" : "1") : "5",
      goalName: p?.goal.name ?? "",
      target: p ? rupiahInput(p.goal.targetAmount) : "",
      saved: p ? rupiahInput(p.goal.savedAmount) : "",
      targetDate: p?.goal.targetDate ?? null,
      joy: p ? rupiahInput(p.joyBudget) : null,
      avoidInterest: stored === null ? null : stored === "true",
    };
  });
  const update = (patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <Ctx.Provider value={{ draft, update }}>
      <Outlet />
    </Ctx.Provider>
  );
}

/** Back button, 3-step progress bar and (optionally) the EN | ID switch. */
export function OnboardingHeader({ step, onBack, showLanguage = true }: { step: 1 | 2 | 3; onBack: () => void; showLanguage?: boolean }) {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="flex h-14 items-center gap-3">
      <CircleButton label={t("common.back")} icon={<BackIcon className="size-5" />} onClick={onBack} />
      <div className="flex flex-1 gap-1.5" role="img" aria-label={t("common.stepOf", { n: step, total: 3 })}>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cx("h-1 flex-1 rounded-pill", i <= step ? "bg-action" : "bg-line")} />
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
