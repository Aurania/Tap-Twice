import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, type Summary } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMonthYear } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { clearAppKeys } from "@/lib/storage";
import { useFutureMe } from "@/features/futureMe/FutureMeProvider";
import { useProfile } from "@/state/ProfileProvider";
import {
  BookmarkIcon,
  Button,
  Chip,
  CircleButton,
  Disclaimer,
  FutureMeFab,
  ItemTile,
  Mark,
  PocketCard,
  pocketColor,
  ProgressRing,
  Ripple,
  SettingsIcon,
} from "@/ui";

const HOME_ITEMS = 4;

/**
 * 02 Home. Greeting with a line that depends on the wishlist (N11 when it is empty), goal, pockets,
 * the Check the stuff card, a short Saved wishlist and the floating Future Me robot.
 * Every number comes from `/api/summary`.
 * Tapping a pocket opens that pocket's wishlist. The gear opens Settings (edit profile, reset).
 */
export function Home() {
  const navigate = useNavigate();
  const { openChat } = useFutureMe();
  const { t, lang } = useI18n();
  const { state, profile, reload } = useProfile();
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(() => {
    api.getSummary().then((r) => setSummary(r.summary)).catch(() => setSummary(null));
  }, []);
  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  if (state.status === "loading" || state.status === "error") return <Navigate to="/" replace />;
  if (!profile) return <Navigate to="/welcome/1" replace />;

  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const name = profile.nickname?.trim();
  const items = summary?.wishlist.items ?? [];
  const count = items.length;
  const pocketName = (id: string) => summary?.pockets.find((p) => p.id === id)?.name ?? "";
  const roomy = summary?.roomiestPocketId ? pocketName(summary.roomiestPocketId) : null;

  // N11 (empty) first; then the pocket with the most room; else just the count.
  // TODO(design): only the first two wordings are designed.
  const subtitle = !summary
    ? ""
    : count === 0
      ? t("home.subEmpty", { count: summary.pockets.length })
      : roomy
        ? t(count === 1 ? "home.subRoomOne" : "home.subRoomMany", { pocket: roomy, count })
        : t(count === 1 ? "home.subWishlistOne" : "home.subWishlistMany", { count });

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(120px,env(safe-area-inset-bottom))]">
      <header className="flex h-14 items-center justify-between">
        <span className="tt-body-strong inline-flex items-center gap-2 text-ink">
          <Mark size={20} />
          {t("app.name")}
        </span>
        <div className="flex gap-2">
          <CircleButton label={t("home.saved")} icon={<BookmarkIcon className="size-5" />} onClick={() => navigate("/wishlist")} />
          <CircleButton label={t("home.settings")} icon={<SettingsIcon className="size-5" />} onClick={() => navigate("/settings")} />
        </div>
      </header>

      {/* Heading/Greeting wraps; long nicknames are never truncated (rule 7). */}
      <h1 className="tt-greeting mt-4 break-words">{name ? t("home.greeting", { name }) : t("home.greetingAnon")}</h1>
      <p className="tt-body-lg mt-2 min-h-[44px] text-ink-2" style={{ fontWeight: 600 }}>
        {subtitle}
      </p>

      {summary && (
        <>
          <section className="mt-4 flex items-center gap-4 rounded-card bg-surface p-4">
            <ProgressRing value={summary.goal.progressPct / 100} label={t("home.goalProgress", { pct: summary.goal.progressPct })}>
              <span className={summary.goal.tone === "danger" ? "text-danger-ink" : undefined}>{summary.goal.progressPct}%</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="tt-body-strong break-words text-ink">{summary.goal.name}</p>
              <p className="tt-small text-ink-2">{t("home.goalOf", { saved: money(summary.goal.savedAmount), target: money(summary.goal.targetAmount) })}</p>
              <p className="tt-caption text-ink-2">{t("home.goalBy", { date: formatMonthYear(summary.goal.targetDate, lang) })}</p>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="tt-h2">{t("home.pockets")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {summary.pockets.map((p) => (
                <PocketCard
                  key={p.id}
                  pocketId={p.id}
                  name={p.name}
                  value={money(p.budget)}
                  pct={p.wishlistPct}
                  caption={t("home.wishlisted", { pct: p.wishlistPct ?? 0 })}
                  onClick={() => navigate(`/wishlist/pocket/${encodeURIComponent(p.id)}`)}
                />
              ))}
            </div>
          </section>

          <section className="relative mt-6 overflow-hidden rounded-card bg-action p-5 text-white">
            <div aria-hidden className="absolute -top-[70px] -right-[110px]">
              <Ripple size={300} rings={4} className="text-white/45" />
              <span className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-highlight" />
            </div>
            <div className="relative">
              <Chip tone="highlight">{t("home.startHere")}</Chip>
              <h2 className="tt-h1 mt-3 max-w-[200px]">{t("home.ctaTitle")}</h2>
              <p className="tt-body mt-2 max-w-[280px] text-white/90">{t("home.ctaBody")}</p>
              <Button variant="secondary" className="mt-5" onClick={() => navigate("/check")}>
                {t("home.ctaButton")}
              </Button>
            </div>
          </section>

          {count > 0 && (
            <section className="mt-6">
              <div className="flex items-baseline justify-between">
                <h2 className="tt-h2">{t("home.savedWishlist")}</h2>
                <button type="button" onClick={() => navigate("/wishlist")} className="tt-link -mr-2 inline-flex min-h-11 items-center gap-1 px-2">
                  {t("home.seeAll")} →
                </button>
              </div>
              <div className="mt-3 rounded-card border border-line p-4">
                <ul className="flex flex-col gap-3">
                  {items.slice(0, HOME_ITEMS).map((it) => (
                    <li key={it.id} className="flex items-center gap-3">
                      <ItemTile emoji={it.emoji} />
                      <div className="min-w-0 flex-1">
                        <p className="tt-body-strong truncate text-ink">{it.name}</p>
                        <p className="tt-caption flex items-center gap-1.5 text-ink-2">
                          <span aria-hidden className="size-2 shrink-0 rounded-pill" style={{ background: pocketColor(it.pocketId) }} />
                          {t("home.itemPocket", { pocket: pocketName(it.pocketId), pct: it.pocketPct ?? 0 })}
                        </p>
                      </div>
                      <span className="tt-body-strong shrink-0 text-ink">{money(it.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="tt-small mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-ink-2">{t("home.totalWishlist")}</span>
                  <span className="tt-body-strong text-ink">{t("home.totalLine", { amount: money(summary.wishlist.total), pct: summary.wishlist.pct ?? 0 })}</span>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <Disclaimer className="mt-5" />

      {import.meta.env.DEV && (
        <div className="mt-6 flex flex-col gap-2 rounded-card border border-dashed border-line p-3">
          <p className="tt-caption text-ink-2">Dev only</p>
          <Button variant="secondary" size="small" onClick={() => seedWishlist().then(load)}>
            Add the 5 sample wishlist items
          </Button>
          <Button variant="secondary" size="small" onClick={() => api.addPurchase({ name: "Winter coat", price: 278, pocketId: "fashion" }).then(load)}>
            Spend $278 in Fashion (Not healthy)
          </Button>
          <Button variant="secondary" size="small" onClick={() => api.addPurchase({ name: "Winter coat", price: 330, pocketId: "fashion" }).then(load)}>
            Spend $330 in Fashion (Pocket empty)
          </Button>
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

      <FutureMeFab label={t("home.robot")} tooltip={t("home.tooltip")} onClick={() => openChat()} />
    </main>
  );
}

/** Dev helper: the handoff's sample wishlist, so the screens can be checked before the check flow exists. Pockets must be the default four. */
async function seedWishlist() {
  const sample = [
    { name: "New Balance Fresh Foam 680", price: 89.9, pocketId: "fashion", emoji: "👟" },
    { name: "Denim jacket", price: 65.7, pocketId: "fashion", emoji: "🧥" },
    { name: "Sony earbuds", price: 119, pocketId: "gadgets", emoji: "🎧" },
    { name: "Switch game", price: 59.99, pocketId: "entertainment", emoji: "🎮" },
    { name: "Bali weekend flight", price: 180, pocketId: "travel", emoji: "✈️" },
  ];
  for (const item of sample) await api.addWishlist(item).catch(() => undefined);
}
