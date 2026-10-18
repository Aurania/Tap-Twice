import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, type Summary } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMonthYear } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { clearAppKeys } from "@/lib/storage";
import { useProfile } from "@/state/ProfileProvider";
import { Button, Disclaimer, Mark, PocketCard, ProgressRing } from "@/ui";

/**
 * 02 Home, minimal for now: greeting, goal and pockets from the server's summary.
 * TODO(phase 5): the full v2 Home (Check the stuff card, Saved wishlist, floating Future Me robot, N11 empty state).
 */
export function Home() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { state, profile, reload } = useProfile();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!profile) return;
    api.getSummary().then((r) => setSummary(r.summary)).catch(() => setSummary(null));
  }, [profile]);

  if (state.status === "loading" || state.status === "error") return <Navigate to="/" replace />;
  if (!profile) return <Navigate to="/welcome/1" replace />;

  const name = profile.nickname?.trim();
  const goal = summary?.goal;

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <header className="flex h-14 items-center">
        <span className="tt-body-strong inline-flex items-center gap-2 text-ink">
          <Mark size={20} />
          {t("app.name")}
        </span>
      </header>

      {/* Heading/Greeting wraps; long nicknames are never truncated (rule 7). */}
      <h1 className="tt-greeting mt-4 break-words">{name ? t("home.greeting", { name }) : t("home.greetingAnon")}</h1>

      {goal && (
        <section className="mt-5 flex items-center gap-4 rounded-card bg-surface p-4">
          <ProgressRing value={goal.progressPct / 100} label={t("home.goalProgress", { pct: goal.progressPct })}>
            <span className={goal.tone === "danger" ? "text-danger" : undefined}>{goal.progressPct}%</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="tt-body-strong break-words text-ink">{goal.name}</p>
            <p className="tt-small text-ink-2">
              {t("home.goalOf", { saved: formatMoney(goal.savedAmount, profile.currency, lang), target: formatMoney(goal.targetAmount, profile.currency, lang) })}
            </p>
            <p className="tt-caption text-ink-2">{t("home.goalBy", { date: formatMonthYear(goal.targetDate, lang) })}</p>
          </div>
        </section>
      )}

      {summary && (
        <section className="mt-5">
          <h2 className="tt-h2">{t("home.pockets")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {summary.pockets.map((p) => (
              <PocketCard key={p.id} pocketId={p.id} name={p.name} pct={p.wishlistPct} detail={formatMoney(p.budget, profile.currency, lang)} />
            ))}
          </div>
        </section>
      )}

      <Disclaimer className="mt-5" />

      {import.meta.env.DEV && (
        <div className="mt-6 flex flex-col gap-2 rounded-card border border-dashed border-line p-3">
          <p className="tt-caption text-ink-2">Dev only</p>
          <Button
            variant="secondary"
            size="small"
            onClick={async () => {
              await api.deleteMe();
              clearAppKeys();
              reload();
              navigate("/", { replace: true });
            }}
          >
            Reset my data and start over
          </Button>
        </div>
      )}
    </main>
  );
}
