import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { api, type DecisionsResponse, type WishlistItem } from "@/api";
import { ScreenshotPicker } from "@/features/check/ScreenshotPicker";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMonthYear, isThisJakartaMonth } from "@/lib/dates";
import { formatIDR, formatIDRCompact } from "@/lib/format";
import { useProfile } from "@/state/ProfileProvider";
import { BookmarkIcon, Button, Chip, CircleButton, Disclaimer, Mark, ProgressRing, Ripple, SettingsIcon, StatCard } from "@/ui";

/** 02 Home. Greeting, goal ring, joy budget left, held off this month, and the Cart Check entry. */
export function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useI18n();
  const { state, profile } = useProfile();
  const [pickerOpen, setPickerOpen] = useState(Boolean((location.state as { pick?: boolean } | null)?.pick));
  const [decisions, setDecisions] = useState<DecisionsResponse | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    api.listDecisions().then(setDecisions).catch(() => setDecisions(null));
    api.listWishlist().then((r) => setWishlist(r.items)).catch(() => setWishlist(null));
  }, [profile]);

  if (state.status === "loading" || state.status === "error") return <Navigate to="/" replace />;
  if (!profile) return <Navigate to="/welcome/1" replace />;

  // Sum of items saved this month, Jakarta time (BACKEND_GAPS.md #10). Summing for display only.
  const heldOff = wishlist?.filter((w) => isThisJakartaMonth(w.createdAt)).reduce((sum, w) => sum + w.price, 0) ?? null;
  const { goal } = profile;
  const progress = goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount : 0;
  const pct = Math.min(100, Math.round(progress * 100));
  const name = profile.nickname?.trim();

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <header className="flex h-14 items-center justify-between">
        <span className="tt-body-strong inline-flex items-center gap-2 text-ink">
          <Mark size={20} />
          {t("app.name")}
        </span>
        <div className="flex gap-2">
          <CircleButton label={t("home.saved")} icon={<BookmarkIcon className="size-5" />} onClick={() => navigate("/saved")} />
          <CircleButton label={t("home.settings")} icon={<SettingsIcon className="size-5" />} onClick={() => navigate("/settings")} />
        </div>
      </header>

      {/* Heading/Greeting wraps; long nicknames are never truncated (rule 7). */}
      <h1 className="tt-greeting mt-4 break-words">{name ? t("home.greeting", { name }) : t("home.greetingAnon")}</h1>
      <p className="tt-body-strong mt-2 text-ink-2">
        {heldOff ? t("home.heldOffLine", { amount: formatIDR(heldOff) }) : t("home.readyLine")}
      </p>

      <section className="mt-5 flex items-center gap-4 rounded-card bg-surface p-4">
        <ProgressRing value={progress} label={t("home.goalProgress", { pct })}>
          {pct}%
        </ProgressRing>
        <div className="min-w-0">
          <p className="tt-body-strong break-words text-ink">{goal.name}</p>
          <p className="tt-small text-ink-2">
            {t("home.goalOf", { saved: formatIDR(goal.savedAmount), target: formatIDR(goal.targetAmount) })}
          </p>
          <p className="tt-caption text-ink-2">{t("home.goalBy", { date: formatMonthYear(goal.targetDate, lang) })}</p>
        </div>
      </section>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <StatCard
          label={t("home.joyLeft")}
          value={decisions?.joyBudgetLeft != null ? formatIDRCompact(decisions.joyBudgetLeft) : "–"}
        />
        <StatCard label={t("home.heldOff")} value={heldOff !== null ? formatIDRCompact(heldOff) : "–"} />
      </div>

      <section className="relative mt-4 overflow-hidden rounded-card bg-action p-5 text-white">
        <div aria-hidden className="absolute -top-[70px] -right-[110px]">
          <Ripple size={300} rings={4} className="text-white/45" />
          <span className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-highlight" />
        </div>
        <div className="relative">
          <Chip tone="highlight">{t("home.startHere")}</Chip>
          <h2 className="tt-h1 mt-3 max-w-[180px]">{t("home.ctaTitle")}</h2>
          <p className="tt-body mt-2 max-w-[280px] text-white/90">{t("home.ctaBody")}</p>
          <Button variant="secondary" className="mt-5" onClick={() => setPickerOpen(true)}>
            {t("home.ctaButton")}
          </Button>
        </div>
      </section>

      <Disclaimer className="mt-5" />
      <ScreenshotPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </main>
  );
}
