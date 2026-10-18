import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, ApiError, type ReflectResponse } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDays, formatHours, formatIDR, formatIDRCompact, formatIDRSigned } from "@/lib/format";
import { useCountUp } from "@/lib/useCountUp";
import { useCartCheck } from "@/state/CartCheckProvider";
import { useProfile } from "@/state/ProfileProvider";
import {
  BagIcon,
  BookmarkIcon,
  Button,
  ChevronIcon,
  CircleButton,
  Disclaimer,
  Mark,
  Ripple,
  ScreenHeader,
  SparkleIcon,
  StatCard,
  Sticker,
} from "@/ui";
import { PaylaterFlow } from "./PaylaterFlow";
import { PaySheet } from "./PaySheet";
import { useSaveForLater } from "./useSaveForLater";

/** 05 Reality card. One POST /api/reflect when it opens; every number comes from the API. */
export function Reality() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const { cart, paylater, result, setResult } = useCartCheck();
  const [failed, setFailed] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const job = useRef<Promise<ReflectResponse> | null>(null);
  const { save: saveForLater, saving, leaving } = useSaveForLater();
  const [paylaterOpen, setPaylaterOpen] = useState(false);

  useEffect(() => {
    if (!cart || result) return;
    job.current ??= api.reflect({ cart, paylater });
    let alive = true;
    job.current
      .then((r) => alive && setResult(r))
      .catch((err) => {
        job.current = null;
        if (alive && !(err instanceof ApiError && err.code === "no_profile")) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [cart, paylater, result, setResult, attempt]);

  const cost = result?.cost ?? null;
  const hours = useCountUp(cost ? cost.hoursOfWork : null);

  if (!cart) return leaving.current ? null : <Navigate to="/home" replace />;

  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  const delay = cost?.goal.delayDays;
  const showDelay = delay !== null && delay !== undefined && Math.round(delay) >= 1;

  return (
    <main className="flex flex-1 flex-col bg-action">
      <section className="relative overflow-hidden px-5 pt-[max(12px,env(safe-area-inset-top))] pb-16 text-white">
        <div aria-hidden className="absolute -top-[130px] -right-[150px]">
          <Ripple size={420} rings={4} className="text-white/45" />
          <span className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-highlight" />
        </div>
        <div className="relative">
          <ScreenHeader title={t("realTalk")} onBlue onBack={() => navigate("/check/confirm")} />
          <p className="tt-body-strong mt-4 text-white/90">{t("reality.costs")}</p>
          {cost && hours !== null ? (
            <p className="mt-1 flex items-center gap-3">
              <span className="font-display text-[112px] leading-[0.95] font-extrabold tabular-nums">{formatHours(hours, lang)}</span>
              <span className="tt-h1 max-w-[150px]">{t("reality.hoursUnit")}</span>
            </p>
          ) : (
            <p className="tt-h1 mt-6 mb-10 animate-pulse" aria-live="polite">
              {failed ? t("reality.error") : t("reality.loading")}
            </p>
          )}
          <div className="mt-6 flex min-h-12 flex-wrap items-center gap-x-3 gap-y-4">
            {cost && showDelay && (
              <Sticker rotate={3} className="tt-pop">
                {t("reality.daysSticker", { days: formatDays(delay!, lang), goal: profile?.goal.name ?? cost.goal.name })}
              </Sticker>
            )}
            <Sticker tone="white" rotate={-5} className="ml-auto">
              {formatIDR(cart.total)}
            </Sticker>
          </div>
          {failed && (
            <Button variant="secondary" className="mt-6" onClick={retry}>
              {t("common.tryAgain")}
            </Button>
          )}
        </div>
      </section>

      <section className="relative -mt-8 flex flex-1 flex-col rounded-t-sheet bg-page px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
        <span aria-hidden className="mx-auto mb-4 h-1 w-9 rounded-pill bg-line" />
        {result?.reflection && (
          <div className="flex gap-3">
            <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-pill bg-soft">
              <Mark size={18} />
            </span>
            <p className="tt-body text-ink">{result.reflection}</p>
          </div>
        )}

        {cost && (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <StatCard label={t("reality.joy")} value={formatIDRCompact(cost.joy.leftAfter)} className={cost.paylater ? "" : "col-span-2"} />
            {cost.paylater && <StatCard label={t("reality.withPaylater")} value={formatIDRSigned(cost.paylater.extraCost)} />}
          </div>
        )}

        <button
          type="button"
          onClick={() => setPaylaterOpen(true)}
          className="mt-3 flex items-center gap-3 rounded-card bg-inverse px-4 py-3.5 text-left text-white"
        >
          <span className="min-w-0 flex-1">
            <span className="tt-body-strong block">{t("reality.paylaterTeaser")}</span>
            <span className="tt-caption block text-highlight">{t("reality.paylaterTeaserSub")}</span>
          </span>
          <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-pill bg-action">
            <ChevronIcon className="size-5" />
          </span>
        </button>

        <div className="mt-5 flex justify-around">
          <CircleButton size="large" showLabel label={t("decide.buyIt")} icon={<BagIcon />} onClick={() => setPayOpen(true)} disabled={!cost || saving} />
          <CircleButton size="large" variant="primary" showLabel label={t("decide.save")} icon={<BookmarkIcon />} onClick={saveForLater} disabled={saving} />
          <CircleButton
            size="large"
            variant="primary"
            showLabel
            label={t("decide.futureMe")}
            icon={<SparkleIcon />}
            onClick={() => navigate("/check/future-me")}
            disabled={!cost || saving}
          />
        </div>

        <Disclaimer className="mt-auto pt-6" />
      </section>

      {cost && (
        <PaySheet
          open={payOpen}
          onClose={() => setPayOpen(false)}
          cost={cost}
          onPickPlan={() => {
            setPayOpen(false);
            setPaylaterOpen(true);
          }}
        />
      )}
      <PaylaterFlow open={paylaterOpen} onClose={() => setPaylaterOpen(false)} />
    </main>
  );
}
