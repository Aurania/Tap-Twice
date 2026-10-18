import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney } from "@/lib/format";
import { useCountUp } from "@/lib/useCountUp";
import { ai } from "@/services/ai";
import { useFutureMe } from "@/features/futureMe/FutureMeProvider";
import type { CheckedProduct } from "@/services/ai";
import { useCheck } from "@/state/CheckProvider";
import { useProfile } from "@/state/ProfileProvider";
import { BackIcon, Button, ChevronIcon, CircleButton, Dialog, Disclaimer, FutureMeRobot, ItemTile, Mark, Ripple, StatCard, Sticker, useToast, Verdict } from "@/ui";

/**
 * 05 Reality card: Healthy, Not healthy and Pocket empty (N7). Every number comes from `/api/check`;
 * the paragraph comes from the AI service. "Add to wishlist" asks first when it is already there (N10).
 * "Not now" asks before leaving. Future Me is a card under the buttons that opens the chat.
 */
export function Reality() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const check = useCheck();
  const { openChat, queueNudge } = useFutureMe();
  const { reality, product, price } = check;
  const [reflection, setReflection] = useState<string | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    if (!reality || !product || !profile || price === null) return;
    const ctrl = new AbortController();
    ai.reflect(
      {
        currency: profile.currency,
        productName: product.name,
        pocketName: reality.pocket.name,
        status: reality.status,
        price,
        remaining: reality.pocket.remaining,
        remainingAfter: reality.remainingAfter,
        overBy: reality.overBy,
        displayWorkHours: reality.displayWorkHours,
        daysUntilRefill: reality.daysUntilRefill,
        refillDate: reality.refillDate,
      },
      ctrl.signal,
    )
      .then(setReflection)
      .catch(() => setReflection(null));
    return () => ctrl.abort();
  }, [reality, product, profile, price]);

  const hours = useCountUp(reality ? reality.displayWorkHours : null);

  if (!reality || !product || !profile || price === null) return leaving.current ? null : <Navigate to="/check" replace />;

  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const pocket = reality.pocket.name;
  const status = reality.status;

  const sticker =
    status === "healthy"
      ? t("reality.stickerFits", { pocket, emoji: product.emoji })
      : status === "not_healthy"
        ? t("reality.stickerOver", { pocket })
        : t("reality.stickerEmpty", { pocket, emoji: product.emoji });

  const verdict = {
    healthy: {
      title: t("reality.healthy"),
      sub: t("reality.subHealthy", { pocket, pct: reality.remainingAfterPct ?? 0 }),
      value: t("reality.barHealthy", { left: money(reality.remainingAfter), budget: money(reality.pocket.budget) }),
      bar: reality.remainingAfterPct ?? 0,
    },
    not_healthy: {
      title: t("reality.notHealthy"),
      sub: t("reality.subOver", { pocket, amount: money(reality.overBy) }),
      value: t("reality.barOver", { left: money(reality.pocket.remaining), price: money(price) }),
      bar: 100,
    },
    pocket_empty: {
      title: t("reality.pocketEmpty"),
      sub: t("reality.subEmpty", { pocket }),
      value: t("reality.barOver", { left: money(0), price: money(price) }),
      bar: 100,
    },
  }[status];

  const checked: CheckedProduct = {
    name: product.name,
    emoji: product.emoji,
    price,
    pocketId: reality.pocket.id,
    pocketName: pocket,
    status,
    remainingAfter: reality.remainingAfter,
    overBy: reality.overBy,
    displayWorkHours: reality.displayWorkHours,
    daysUntilRefill: reality.daysUntilRefill,
  };

  const leave = (to: string) => {
    leaving.current = true;
    navigate(to, { replace: true });
    check.reset();
  };

  const add = async () => {
    setSaving(true);
    try {
      await api.addWishlist({ name: product.name, price, pocketId: reality.pocket.id, emoji: product.emoji });
      toast({ message: t("reality.added"), icon: true });
      leave("/wishlist");
    } catch {
      toast({ message: t("reality.addError") });
      setSaving(false);
    }
  };

  const addedOn = reality.duplicateAddedAt
    ? new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", { month: "short", day: "numeric" }).format(new Date(reality.duplicateAddedAt))
    : "";

  return (
    <main className="flex flex-1 flex-col bg-action">
      <section className="relative overflow-hidden px-5 pt-[max(12px,env(safe-area-inset-top))] pb-16 text-white">
        <div aria-hidden className="absolute -top-[130px] -right-[150px]">
          <Ripple size={420} rings={4} className="text-white/45" />
          <span className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-highlight" />
        </div>
        <div className="relative">
          <header className="grid h-14 grid-cols-[40px_1fr_40px] items-center">
            <CircleButton label={t("common.back")} icon={<BackIcon className="size-5" />} onClick={() => navigate("/check/match", { replace: true })} />
            <p className="tt-body-strong flex items-center justify-center gap-2">
              <Mark size={16} tone="highlight" />
              {t("realTalk")}
            </p>
          </header>
          {/* The big number is decoration for the eyes; screen readers get the sentence as the page heading. */}
          <h1 className="sr-only">
            {t("reality.costs")} {reality.displayWorkHours} {t("reality.hoursUnit")}
          </h1>
          <p aria-hidden className="tt-body-strong mt-4 text-white/95">
            {t("reality.costs")}
          </p>
          <p aria-hidden className="mt-1 flex items-center gap-3">
            <span className="font-display text-[120px] leading-[0.95] font-extrabold tabular-nums">{Math.round(hours ?? reality.displayWorkHours)}</span>
            <span className="tt-h1 max-w-[150px]">{t("reality.hoursUnit")}</span>
          </p>
          <div className="mt-6 flex min-h-12 flex-wrap items-center gap-x-3 gap-y-4">
            <Sticker rotate={-4} className="tt-pop">
              {sticker}
            </Sticker>
            <Sticker tone="white" rotate={5} className="ml-auto">
              {money(price)}
            </Sticker>
          </div>
        </div>
      </section>

      <section className="relative -mt-8 flex flex-1 flex-col rounded-t-sheet bg-page px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
        <span aria-hidden className="mx-auto mb-4 h-1 w-9 rounded-pill bg-line" />
        {reflection && (
          <div className="flex gap-3">
            <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-pill bg-soft">
              <Mark size={18} />
            </span>
            <p className="tt-body text-ink">{reflection}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <StatCard label={t("reality.left", { pocket })} value={money(reality.remainingAfter)} />
          <StatCard label={t("reality.income")} value={t("reality.pct", { pct: reality.pctOfIncome })} />
        </div>

        <Verdict
          className="mt-3"
          status={status}
          title={verdict.title}
          subtitle={verdict.sub}
          barLabel={t("reality.barLabel", { pocket })}
          barValue={verdict.value}
          barPct={verdict.bar}
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="secondary" disabled={saving} onClick={() => setLeaveOpen(true)}>
            {t("reality.notNow")}
          </Button>
          <Button disabled={saving} onClick={() => (reality.duplicateOf ? setDupOpen(true) : void add())}>
            {t("reality.addWishlist")}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => openChat(checked)}
          className="mt-4 flex w-full items-center gap-3 rounded-card border border-line bg-soft p-4 text-left active:opacity-80"
        >
          <FutureMeRobot size={44} />
          <span className="min-w-0 flex-1">
            <span className="tt-body-strong block text-ink">{t("reality.futureCardTitle")}</span>
            <span className="tt-small block text-ink-2">{t("reality.futureCardBody")}</span>
          </span>
          <ChevronIcon aria-hidden className="size-5 shrink-0 text-ink" />
        </button>

        <Disclaimer className="mt-auto pt-6" />
      </section>

      <Dialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        art={<ItemTile emoji={product.emoji} size="lg" tone="soft" />}
        title={t("reality.leaveTitle")}
        description={t("reality.leaveBody", { name: product.name })}
        actions={
          <>
            <Button
              onClick={() => {
                // A product that did not fit gets a Future Me nudge on Home.
                if (status !== "healthy") queueNudge(checked);
                setLeaveOpen(false);
                leave("/home");
              }}
            >
              {t("reality.leaveYes")}
            </Button>
            <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
              {t("reality.leaveNo")}
            </Button>
          </>
        }
      />

      <Dialog
        open={dupOpen}
        onClose={() => setDupOpen(false)}
        art={<ItemTile emoji={product.emoji} size="lg" tone="soft" />}
        title={t("reality.dupTitle", { pocket })}
        description={t("reality.dupBody", { name: product.name, date: addedOn })}
        actions={
          <>
            <Button onClick={() => leave("/wishlist")}>{t("reality.viewWishlist")}</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDupOpen(false);
                void add();
              }}
            >
              {t("reality.addAnyway")}
            </Button>
          </>
        }
      />
    </main>
  );
}
