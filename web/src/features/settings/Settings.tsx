import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { api } from "@/api";
import { endSession } from "@/auth/firebase";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMonthYear } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { clearAppKeys } from "@/lib/storage";
import { useProfile } from "@/state/ProfileProvider";
import { BackIcon, Button, ChevronIcon, CircleButton, Dialog, pocketColor, TrashIcon, useToast } from "@/ui";

/**
 * Settings: the saved profile, each part editable by reopening its onboarding screen (prefilled, "Save" comes back here),
 * and Reset everything (DELETE /api/me, sign out of the anonymous user, clear local keys, start again from the splash).
 * Currency is shown but fixed: saved wishlist items and purchases are in it.
 */
export function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { profile, reload } = useProfile();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!profile) return null; // RequireProfile handles loading and no profile

  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const edit = (step: "money" | "work" | "pockets" | "goal") => navigate(`/settings/edit/${step}`);

  const resetEverything = async () => {
    setResetting(true);
    try {
      await api.deleteMe();
      await endSession();
      clearAppKeys();
      navigate("/", { replace: true });
      reload();
    } catch {
      setResetting(false);
      toast({ message: t("settings.resetError"), position: "bottom" });
    }
  };

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      <header className="grid h-14 grid-cols-[40px_1fr_40px] items-center">
        <CircleButton label={t("common.back")} icon={<BackIcon className="size-5" />} onClick={() => navigate("/home")} />
        <h1 className="tt-body-lg text-center text-ink">{t("settings.header")}</h1>
      </header>

      <Group title={t("settings.you")}>
        <Row label={t("settings.nickname")} value={profile.nickname?.trim() || "–"} onClick={() => edit("money")} />
        <Row label={t("settings.currency")} value={profile.currency} />
        <Row label={t("settings.income")} value={money(profile.monthlyIncome)} onClick={() => edit("money")} />
        <Row label={t("settings.expenses")} value={money(profile.monthlyExpenses)} onClick={() => edit("money")} />
        <Row label={t("settings.work")} value={t("settings.workValue", { hours: profile.hoursPerDay, days: profile.workDays.length })} onClick={() => edit("work")} />
      </Group>

      <Group title={t("settings.pockets")}>
        <li>
          <button type="button" onClick={() => edit("pockets")} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
            <span className="min-w-0 flex-1">
              <span className="tt-body-strong block text-ink">{t("settings.pocketsValue", { count: profile.pockets.length })}</span>
              <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {profile.pockets.map((p) => (
                  <span key={p.id} className="tt-small inline-flex items-center gap-1.5 text-ink-2">
                    <span aria-hidden className="size-2 shrink-0 rounded-pill" style={{ background: pocketColor(p.id) }} />
                    {p.name} {p.allocationPct}%
                  </span>
                ))}
              </span>
            </span>
            <ChevronIcon aria-hidden className="size-5 shrink-0 text-ink" />
          </button>
        </li>
      </Group>

      <Group title={t("settings.yourGoal")}>
        <Row
          label={t("settings.goal")}
          value={`${profile.goal.name} · ${money(profile.goal.targetAmount)} · ${formatMonthYear(profile.goal.targetDate, lang)}`}
          onClick={() => edit("goal")}
        />
      </Group>

      <Group title={t("settings.data")}>
        <li className="px-4 py-3.5">
          <p className="tt-small text-ink-2">{t("settings.dataNote")}</p>
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="tt-body-strong mt-3 inline-flex min-h-11 items-center gap-2 rounded-pill bg-danger-tint px-4 text-danger-ink"
          >
            <TrashIcon aria-hidden className="size-4" />
            {t("settings.reset")}
          </button>
        </li>
      </Group>

      <Dialog
        open={resetOpen}
        onClose={() => !resetting && setResetOpen(false)}
        title={t("settings.resetTitle")}
        description={t("settings.resetBody")}
        actions={
          <>
            <Button onClick={() => void resetEverything()} disabled={resetting} className="!bg-danger-ink">
              {resetting ? t("common.loading") : t("settings.resetYes")}
            </Button>
            <Button variant="secondary" onClick={() => setResetOpen(false)} disabled={resetting}>
              {t("common.cancel")}
            </Button>
          </>
        }
      />
    </main>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="tt-small mb-1.5 text-ink-2">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">{children}</ul>
    </section>
  );
}

/** Label on the left, the full value on the right (wraps instead of truncating), a chevron when it opens an editor. */
function Row({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="tt-body-strong shrink-0 text-ink">{label}</span>
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
