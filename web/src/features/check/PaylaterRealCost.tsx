import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, ApiError, type Cost } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDecimal, formatIDR } from "@/lib/format";
import { KEYS, readKey } from "@/lib/storage";
import { useCartCheck } from "@/state/CartCheckProvider";
import { Button, CalendarIcon, Chip, Notice, OptionRow, ScreenHeader, SproutIcon, WalletIcon, WarningIcon } from "@/ui";
import { PaylaterFlow } from "./PaylaterFlow";
import { useSaveForLater } from "./useSaveForLater";

/**
 * 06 Paylater · Real cost. POST /api/cost with the chosen plan; pay in full is shown first.
 * The new numbers also update the reality card (the reflection is kept).
 */
export function PaylaterRealCost() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { cart, paylater, paylaterInfo, setCost } = useCartCheck();
  const { save, saving, leaving } = useSaveForLater();
  const [cost, setLocalCost] = useState<Cost | null>(null);
  const [failed, setFailed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!cart || !paylater) return;
    let alive = true;
    setFailed(false);
    api
      .cost({ cart, paylater })
      .then(({ cost }) => {
        if (!alive) return;
        setLocalCost(cost);
        setCost(cost);
      })
      .catch((err) => alive && !(err instanceof ApiError && err.code === "no_profile") && setFailed(true));
    return () => {
      alive = false;
    };
  }, [cart, paylater, setCost, attempt]);

  if (!cart) return leaving.current ? null : <Navigate to="/home" replace />;
  if (!paylater) return <Navigate to="/check/reality" replace />;

  const plan = cost?.paylater ?? null;
  const avoidInterest = readKey(KEYS.avoidInterest) === "true";
  const single = cart.items.length === 1 && cart.items[0] && cart.items[0].name.length <= 24 ? cart.items[0].name : null;
  const sourceLabel = t(`source.${paylaterInfo?.source ?? "default"}` as const);
  // Bar lengths compare two API totals (display only).
  const fullShare = plan && plan.totalPaid > 0 ? Math.min(1, cart.total / plan.totalPaid) : 1;

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <ScreenHeader title={t("realcost.header")} onBack={() => navigate("/check/reality")} />

      <h1 className="tt-h1 mt-3">
        {single ? t("realcost.titleOne", { item: single }) : t("realcost.titleCart")}
        <br />
        {plan ? (plan.extraCostPct > 0 ? t("realcost.titleExtra", { pct: formatDecimal(plan.extraCostPct, lang, 0) }) : t("realcost.titleNoExtra")) : "…"}
      </h1>
      <p className="tt-small mt-2 text-ink-2">
        {t("realcost.source", { provider: paylaterInfo?.providerName ?? "PayLater", n: paylater.tenorMonths, source: sourceLabel })}{" "}
        <button type="button" className="tt-link underline underline-offset-2" onClick={() => setPickerOpen(true)}>
          {t("realcost.change")}
        </button>
      </p>

      {failed && (
        <div className="mt-6 space-y-3 text-center">
          <p className="tt-body text-ink-2">{t("plans.error")}</p>
          <Button size="small" onClick={() => setAttempt((n) => n + 1)}>
            {t("common.tryAgain")}
          </Button>
        </div>
      )}

      {plan && (
        <>
          <section className="mt-5 rounded-card bg-surface p-4" aria-label={t("realcost.compare")}>
            <div className="tt-body-strong flex justify-between">
              <span>{t("pay.inFull")}</span>
              <span>{formatIDR(cart.total)}</span>
            </div>
            <div className="mt-2 h-2.5 rounded-pill bg-action" style={{ width: `${fullShare * 100}%` }} />
            <div className="tt-body-strong mt-4 flex justify-between">
              <span>{t("pay.paylaterMonths", { n: plan.tenorMonths })}</span>
              <span>{formatIDR(plan.totalPaid)}</span>
            </div>
            <div className="mt-2 flex h-2.5 overflow-hidden rounded-pill bg-highlight">
              <span className="h-full bg-action" style={{ width: `${fullShare * 100}%` }} />
            </div>
            <p className="tt-small mt-3 flex items-center gap-2 text-ink-2">
              <span aria-hidden className="size-2 rounded-pill bg-highlight" />
              {t("realcost.extraLine", { amount: formatIDR(plan.extraCost) })}
            </p>
          </section>

          <div className="mt-3 space-y-2.5">
            <OptionRow display selected icon={<WalletIcon className="size-5" />} title={t("pay.inFull")} detail={t("pay.inFullDetail")} trailing={formatIDR(cart.total)} />
            <OptionRow
              display
              selected={false}
              icon={<CalendarIcon className="size-5" />}
              title={t("pay.paylaterMonths", { n: plan.tenorMonths })}
              detail={t("pay.paylaterDetail", { monthly: formatIDR(plan.monthlyInstallment), rate: formatDecimal(paylater.monthlyRatePct, lang, 2) })}
              trailing={formatIDR(plan.totalPaid)}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {avoidInterest && plan.extraCost > 0 && (
              <Chip tone="highlight" icon={<WarningIcon className="size-3.5" />}>
                {t("pay.containsInterest")}
              </Chip>
            )}
            {/* Monthly, not weekly: the API has no weekly split (BACKEND_GAPS.md #14). */}
            <Chip icon={<SproutIcon className="size-3.5" />}>
              {t("realcost.debtFree", { amount: formatIDR(plan.monthlyInstallment), n: plan.tenorMonths })}
            </Chip>
          </div>
        </>
      )}

      <Notice className="mt-4" title={t("notice.lateTitle")}>
        {t("notice.lateBody")}
      </Notice>

      <div className="mt-auto space-y-2.5 pt-6">
        <Button onClick={save} disabled={saving}>
          {t("decide.saveForLater")}
        </Button>
        <Button variant="secondary" onClick={() => navigate("/check/reality")}>
          {t("realcost.backToCart")}
        </Button>
      </div>

      <PaylaterFlow open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </main>
  );
}
