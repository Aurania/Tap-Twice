import { useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, type Language } from "@/api";
import { endSession } from "@/auth/firebase";
import { useI18n } from "@/i18n/I18nProvider";
import { formatIDR } from "@/lib/format";
import { clearAppKeys, KEYS, readKey, writeKey } from "@/lib/storage";
import { useCartCheck } from "@/state/CartCheckProvider";
import { useProfile } from "@/state/ProfileProvider";
import { BottomSheet, Button, ChevronIcon, LanguageSwitch, ScreenHeader, Toggle, useToast } from "@/ui";

/** "8h × 5 days" when it divides cleanly, else "40 h/week" (BACKEND_GAPS.md #2). */
function workPattern(hoursPerWeek: number, t: ReturnType<typeof useI18n>["t"]): string {
  for (const days of [5, 6]) {
    const perDay = hoursPerWeek / days;
    if (Number.isInteger(perDay) && perDay <= 24) return t("settings.workDays", { hours: perDay, days });
  }
  return t("settings.workWeekly", { hours: hoursPerWeek });
}

/** 10 Settings and 10b Reset everything? */
export function Settings() {
  const navigate = useNavigate();
  const { t, setLang } = useI18n();
  const toast = useToast();
  const { state, profile, save, reload } = useProfile();
  const { reset: resetCart } = useCartCheck();
  const [avoidInterest, setAvoidInterest] = useState(readKey(KEYS.avoidInterest) === "true");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (state.status === "loading") return null; // a refresh lands here; wait for the profile
  if (state.status === "error") return <Navigate to="/" replace />;
  if (!profile) return <Navigate to="/welcome/1" replace />;

  const edit = (step: "money" | "goal") => navigate(`/onboarding/${step}?edit=1`);

  const changeLanguage = async (language: Language) => {
    if (language === profile.language) return;
    setLang(language);
    try {
      await save({ ...profile, language }); // Gemini replies follow profile.language
    } catch {
      setLang(profile.language);
      toast({ message: t("common.error"), position: "bottom" });
    }
  };

  // 10b: DELETE /api/me, sign out of the anonymous user, clear tt.* keys, back to the splash (gaps #11).
  const resetEverything = async () => {
    setResetting(true);
    try {
      await api.deleteMe();
      await endSession();
      clearAppKeys();
      resetCart();
      navigate("/", { replace: true });
      reload();
    } catch {
      setResetting(false);
      toast({ message: t("common.error"), position: "bottom" });
    }
  };

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <ScreenHeader title={t("settings.header")} onBack={() => navigate("/home")} />

      <Group title={t("settings.you")}>
        <Row label={t("settings.nickname")} value={profile.nickname?.trim() || "–"} onClick={() => edit("money")} />
        {/* Fixed to IDR for now (BACKEND_GAPS.md #1). */}
        <Row label={t("settings.currency")} value="IDR" />
        <Row label={t("settings.income")} value={formatIDR(profile.monthlyIncome)} onClick={() => edit("money")} />
        <Row label={t("settings.work")} value={workPattern(profile.hoursPerWeek, t)} onClick={() => edit("money")} />
      </Group>

      <Group title={t("settings.yourGoal")}>
        <Row label={t("settings.goal")} value={profile.goal.name} onClick={() => edit("goal")} />
        <Row label={t("settings.joy")} value={t("settings.perMonth", { amount: formatIDR(profile.joyBudget) })} onClick={() => edit("goal")} />
      </Group>

      <Group title={t("settings.preferences")}>
        <li className="flex items-center justify-between gap-3 px-4 py-3.5">
          <span className="tt-body-strong">{t("settings.avoidInterest")}</span>
          <Toggle
            checked={avoidInterest}
            label={t("settings.avoidInterest")}
            onChange={(v) => {
              setAvoidInterest(v);
              writeKey(KEYS.avoidInterest, String(v)); // device-only until the API stores it (gaps #3)
            }}
          />
        </li>
        <li className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="tt-body-strong">{t("language.label")}</span>
          <LanguageSwitch value={profile.language} onChange={changeLanguage} />
        </li>
      </Group>

      <p className="tt-small mt-5 text-ink-2">{t("settings.dataNote")}</p>
      <button type="button" onClick={() => setResetOpen(true)} className="tt-link mt-2 self-start !text-warn underline underline-offset-2">
        {t("settings.reset")}
      </button>

      <BottomSheet open={resetOpen} onClose={() => setResetOpen(false)} title={t("settings.resetTitle")} description={t("settings.resetBody")}>
        <div className="space-y-2.5">
          <Button onClick={resetEverything} disabled={resetting}>
            {resetting ? t("common.loading") : t("settings.resetYes")}
          </Button>
          <Button variant="secondary" onClick={() => setResetOpen(false)} disabled={resetting}>
            {t("common.cancel")}
          </Button>
        </div>
      </BottomSheet>
    </main>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="tt-small mb-1.5 text-ink-2">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">{children}</ul>
    </section>
  );
}

function Row({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="tt-body-strong shrink-0 text-ink">{label}</span>
      {/* Full value, wraps instead of truncating (long nicknames). */}
      <span className="tt-body min-w-0 flex-1 text-right break-words text-ink-2">{value}</span>
      {onClick && <ChevronIcon aria-hidden className="size-5 shrink-0 text-ink" />}
    </>
  );
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
          {content}
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3.5">{content}</div>
      )}
    </li>
  );
}
