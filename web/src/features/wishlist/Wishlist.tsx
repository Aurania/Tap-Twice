import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { api, type PocketSummary, type Summary, type WishlistItemV2 } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney } from "@/lib/format";
import { usePay } from "@/state/PayProvider";
import { useProfile } from "@/state/ProfileProvider";
import { PayFlow } from "./PayFlow";
import { BackIcon, Button, CircleButton, EmptyState, FutureMeRobot, ItemTile, PercentRing, PocketBar, pocketColor } from "@/ui";

/**
 * 06 Wishlist by pocket, and N9 when it is empty. Summary card, then one card per pocket that has items.
 * `/wishlist/pocket/:pocketId` (a pocket card on Home) shows one pocket: its own summary and items, or an empty state.
 * Tapping an item opens "How are you paying?" (PayFlow).
 */
export function Wishlist() {
  const navigate = useNavigate();
  const { pocketId } = useParams();
  const { t, lang } = useI18n();
  const { state, profile } = useProfile();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  const pay = usePay();

  const load = useCallback(() => {
    api.getSummary().then((r) => setSummary(r.summary)).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  if (state.status === "loading" || state.status === "error") return <Navigate to="/" replace />;
  if (!profile) return <Navigate to="/welcome/1" replace />;

  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const items = summary?.wishlist.items ?? [];
  const onePocket = pocketId ? (summary?.pockets.find((p) => p.id === pocketId) ?? null) : null;
  if (pocketId && summary && !onePocket) return <Navigate to="/wishlist" replace />;

  const openItem = (it: WishlistItemV2, p: PocketSummary) => pay.start({ ...it, pocketName: p.name });

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      <header className="grid h-14 grid-cols-[40px_1fr_40px] items-center">
        <CircleButton label={t("wishlist.back")} icon={<BackIcon className="size-5" />} onClick={() => navigate("/home")} />
        <h1 className="tt-body-lg text-center break-words text-ink">{onePocket ? t("wishlist.pocketTitle", { pocket: onePocket.name }) : pocketId ? "" : t("wishlist.title")}</h1>
      </header>

      {failed && (
        <p role="alert" className="tt-small mt-6 text-center text-warn">
          {t("wishlist.loadError")}
        </p>
      )}

      {/* One pocket, from a pocket card on Home. */}
      {onePocket && (
        <>
          <section className="mt-2 flex items-center gap-4 rounded-card bg-action p-4 text-white">
            <PercentRing
              size={84}
              label={`${onePocket.wishlistPct ?? 0}%`}
              track="color-mix(in srgb, var(--tt-color-text-on-action) 25%, transparent)"
              segments={[{ pct: onePocket.wishlistPct ?? 0, color: pocketColor(onePocket.id) }]}
            >
              <span className="tt-body-strong text-white">{onePocket.wishlistPct ?? 0}%</span>
            </PercentRing>
            <div className="min-w-0">
              <p className="tt-small flex items-center gap-2 text-white/95">
                <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ background: pocketColor(onePocket.id) }} />
                {onePocket.name}
              </p>
              <p className="tt-hero leading-none" style={{ fontSize: 36 }}>
                {money(onePocket.wishlistTotal)}
              </p>
              <p className="tt-caption mt-1 text-white/95">{t("wishlist.pocketSummary", { total: money(onePocket.wishlistTotal), budget: money(onePocket.budget) })}</p>
              <p className="tt-caption text-white/95">{t("wishlist.pocketLeft", { amount: money(onePocket.remaining) })}</p>
            </div>
          </section>

          {onePocket.wishlistCount === 0 ? (
            <EmptyState
              className="pt-8"
              art={<FutureMeRobot size={80} />}
              title={t("wishlist.pocketEmptyTitle", { pocket: onePocket.name })}
              description={t("wishlist.pocketEmptyBody", { pocket: onePocket.name })}
              action={<Button onClick={() => navigate("/check")}>{t("wishlist.emptyCta")}</Button>}
            />
          ) : (
            <div className="mt-3">
              <PocketItems pocket={onePocket} items={items} money={money} onOpen={openItem} />
            </div>
          )}

          <button type="button" onClick={() => navigate("/wishlist")} className="tt-link mt-4 self-center py-3 underline">
            {t("wishlist.allPockets")}
          </button>
        </>
      )}

      {/* Every pocket. */}
      {!pocketId && summary && items.length === 0 && (
        <EmptyState
          className="pt-10"
          art={<FutureMeRobot size={96} />}
          title={t("wishlist.emptyTitle")}
          description={t("wishlist.emptyBody")}
          action={<Button onClick={() => navigate("/check")}>{t("wishlist.emptyCta")}</Button>}
        />
      )}

      {!pocketId && summary && items.length > 0 && (
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
              <p className="tt-small text-white/95">{t("wishlist.soFar")}</p>
              <p className="tt-hero leading-none" style={{ fontSize: 36 }}>
                {money(summary.wishlist.total)}
              </p>
              <p className="tt-caption mt-1 text-white/95">
                {t("wishlist.summary", { pct: summary.wishlist.pct ?? 0, budget: money(summary.leftover), count: summary.pockets.length })}
              </p>
            </div>
          </section>

          <div className="mt-3 flex flex-col gap-2.5">
            {summary.pockets
              .filter((p) => p.wishlistCount > 0)
              .map((p) => (
                <PocketItems key={p.id} pocket={p} items={items} money={money} onOpen={openItem} />
              ))}
          </div>
        </>
      )}

      <PayFlow onLogged={load} />
    </main>
  );
}

/** One pocket's card: name, wishlist total of its budget, a bar, and the items (oldest first, as in the design). */
function PocketItems({
  pocket: p,
  items,
  money,
  onOpen,
}: {
  pocket: PocketSummary;
  items: WishlistItemV2[];
  money: (n: number) => string;
  onOpen: (it: WishlistItemV2, p: PocketSummary) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="rounded-card border border-line p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="tt-body-lg flex items-center gap-2 text-ink" style={{ fontWeight: 700 }}>
          <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ background: pocketColor(p.id) }} />
          {p.name}
        </h2>
        <span className="tt-caption text-ink-2">{t("wishlist.pocketOf", { total: money(p.wishlistTotal), budget: money(p.budget) })}</span>
        {/* Ink, not the pocket color: the light pocket colors fail text contrast. The dot and the bar keep the color. */}
        <span className="tt-body-lg shrink-0 text-ink" style={{ fontWeight: 700 }}>
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
            <li key={it.id}>
              <button type="button" onClick={() => onOpen(it, p)} className="flex min-h-11 w-full items-center gap-3 rounded-md text-left active:bg-surface">
                <ItemTile emoji={it.emoji} size="sm" />
                <span className="tt-body min-w-0 flex-1 text-ink">{it.name}</span>
                <span className="tt-small shrink-0 text-ink-2">{t("wishlist.itemLine", { price: money(it.price), pct: it.pocketPct ?? 0 })}</span>
              </button>
            </li>
          ))}
      </ul>
    </section>
  );
}
