import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, type Summary } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney } from "@/lib/format";
import { useProfile } from "@/state/ProfileProvider";
import { BackIcon, Button, CircleButton, EmptyState, FutureMeRobot, ItemTile, PercentRing, PocketBar, pocketColor, useToast } from "@/ui";

/**
 * 06 Wishlist by pocket, and N9 when it is empty. Summary card, then one card per pocket that has items.
 * TODO(phase 8): tapping an item opens "How are you paying?" (PayLater flow); rows are static until then.
 * TODO(design): pockets without items are left out; the handoff only shows pockets with items.
 */
export function Wishlist() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { state, profile } = useProfile();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!profile) return;
    api.getSummary().then((r) => setSummary(r.summary)).catch(() => setFailed(true));
  }, [profile]);

  if (state.status === "loading" || state.status === "error") return <Navigate to="/" replace />;
  if (!profile) return <Navigate to="/welcome/1" replace />;

  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const items = summary?.wishlist.items ?? [];

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      <header className="grid h-14 grid-cols-[40px_1fr_40px] items-center">
        <CircleButton label={t("wishlist.back")} icon={<BackIcon className="size-5" />} onClick={() => navigate("/home")} />
        <h1 className="tt-body-lg text-center text-ink">{t("wishlist.title")}</h1>
      </header>

      {failed && (
        <p role="alert" className="tt-small mt-6 text-center text-warn">
          {t("wishlist.loadError")}
        </p>
      )}

      {summary && items.length === 0 && (
        <EmptyState
          className="pt-10"
          art={<FutureMeRobot size={96} />}
          title={t("wishlist.emptyTitle")}
          description={t("wishlist.emptyBody")}
          // TODO(phase 6): opens the Check the stuff flow.
          action={<Button onClick={() => toast({ message: "Check the stuff arrives in the next phase." })}>{t("wishlist.emptyCta")}</Button>}
        />
      )}

      {summary && items.length > 0 && (
        <>
          <section className="mt-2 flex items-center gap-4 rounded-card bg-action p-4 text-white">
            <PercentRing
              size={84}
              label={`${summary.wishlist.pct ?? 0}%`}
              track="color-mix(in srgb, var(--tt-color-text-on-action) 25%, transparent)"
              segments={[{ pct: summary.wishlist.pct ?? 0, color: "var(--tt-color-action-highlight)" }]}
            >
              <span className="tt-body-strong text-white">{summary.wishlist.pct ?? 0}%</span>
            </PercentRing>
            <div className="min-w-0">
              <p className="tt-small text-white/80">{t("wishlist.soFar")}</p>
              <p className="tt-hero leading-none" style={{ fontSize: 36 }}>
                {money(summary.wishlist.total)}
              </p>
              <p className="tt-caption mt-1 text-white/80">
                {t("wishlist.summary", { pct: summary.wishlist.pct ?? 0, budget: money(summary.leftover), count: summary.pockets.length })}
              </p>
            </div>
          </section>

          <div className="mt-3 flex flex-col gap-2.5">
            {summary.pockets
              .filter((p) => p.wishlistCount > 0)
              .map((p) => (
                <section key={p.id} className="rounded-card border border-line p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="tt-body-lg flex items-center gap-2 text-ink" style={{ fontWeight: 700 }}>
                      <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ background: pocketColor(p.id) }} />
                      {p.name}
                    </h2>
                    <span className="tt-caption text-ink-2">{t("wishlist.pocketOf", { total: formatMoney(p.wishlistTotal, profile.currency, lang), budget: money(p.budget) })}</span>
                    <span className="tt-body-lg shrink-0" style={{ color: pocketColor(p.id), fontWeight: 700 }}>
                      {p.wishlistPct ?? 0}%
                    </span>
                  </div>
                  <PocketBar pocketId={p.id} pct={p.wishlistPct ?? 0} track="bg-surface" className="mt-2.5 h-2" />
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {/* The API sends newest first; this screen lists oldest first, as in the design. */}
                    {items
                      .filter((it) => it.pocketId === p.id)
                      .reverse()
                      .map((it) => (
                        <li key={it.id} className="flex items-center gap-3">
                          <ItemTile emoji={it.emoji} className="size-8" />
                          <span className="tt-body min-w-0 flex-1 text-ink">{it.name}</span>
                          <span className="tt-small shrink-0 text-ink-2">{t("wishlist.itemLine", { price: money(it.price), pct: it.pocketPct ?? 0 })}</span>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
          </div>
        </>
      )}
    </main>
  );
}
