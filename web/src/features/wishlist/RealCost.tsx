import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, type PaylaterQuote } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDecimal, formatMoney } from "@/lib/format";
import { usePay } from "@/state/PayProvider";
import { useProfile } from "@/state/ProfileProvider";
import { Button, CalendarIcon, Chip, Notice, OptionRow, ScreenHeader, SproutIcon, WalletIcon, WarningIcon } from "@/ui";

/**
 * 06 The real cost: pay in full next to PayLater for this wishlist item, with the server's numbers.
 * "Use this plan" goes back to "How are you paying?" with the plan chosen.
 * TODO(design): Figma shows the v1 screen (cart, screenshot, "Save for later"). The late-payment note names SLIK OJK, an Indonesian
 * regulator; it is shown to everyone until the handoff says otherwise.
 */
export function RealCost() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const pay = usePay();
  const { item, terms } = pay;
  const [plan, setPlan] = useState<PaylaterQuote | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!item || !terms) return;
    let alive = true;
    setFailed(false);
    api
      .paylaterCost(item.price, { tenorMonths: terms.tenorMonths, monthlyRatePct: terms.monthlyRatePct, adminFee: terms.adminFee })
      .then((r) => alive && setPlan(r.plan))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [item, terms, attempt]);

  if (!profile) return <Navigate to="/" replace />;
  if (!item || !terms) return <Navigate to="/wishlist" replace />;

  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const short = item.name.length <= 24 ? item.name : null;
  const sourceLabel = t(`source.${terms.source}` as const);
  // Bar lengths compare two server totals (display only).
  const fullShare = plan && plan.totalPaid > 0 ? Math.min(1, item.price / plan.totalPaid) : 1;
  const back = () => {
    pay.patch({ step: "pay", choice: "full" });
    navigate("/wishlist", { replace: true });
  };

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <ScreenHeader title={t("realcost.header")} onBack={back} />

      <h1 className="tt-h1 mt-3">
        {short ? t("realcost.titleOne", { item: short }) : t("realcost.titleItem")}
        <br />
        {plan ? (plan.extraCostPct > 0 ? t("realcost.titleExtra", { pct: formatDecimal(plan.extraCostPct, lang, 0) }) : t("realcost.titleNoExtra")) : "…"}
      </h1>
      <p className="tt-small mt-2 text-ink-2">
        {t("realcost.source", { provider: pay.providerName ?? "PayLater", n: terms.tenorMonths, source: sourceLabel })}{" "}
        <button type="button" className="tt-link underline underline-offset-2" onClick={() => { pay.patch({ step: "providers" }); navigate("/wishlist", { replace: true }); }}>
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
              <span>{money(item.price)}</span>
            </div>
            <div className="mt-2 h-2.5 rounded-pill bg-action" style={{ width: `${fullShare * 100}%` }} />
            <div className="tt-body-strong mt-4 flex justify-between">
              <span>{t("pay.paylaterMonths", { n: plan.tenorMonths })}</span>
              <span>{money(plan.totalPaid)}</span>
            </div>
            <div className="mt-2 flex h-2.5 overflow-hidden rounded-pill bg-highlight">
              <span className="h-full bg-action" style={{ width: `${fullShare * 100}%` }} />
            </div>
            <p className="tt-small mt-3 flex items-center gap-2 text-ink-2">
              <span aria-hidden className="size-2 rounded-pill bg-highlight" />
              {t("realcost.extraLine", { amount: money(plan.extraCost) })}
            </p>
          </section>

          <div className="mt-3 space-y-2.5">
            <OptionRow display selected icon={<WalletIcon className="size-5" />} title={t("pay.inFull")} detail={t("pay.inFullDetail", { extra: money(0) })} trailing={money(item.price)} />
            <OptionRow
              display
              selected={false}
              icon={<CalendarIcon className="size-5" />}
              title={t("pay.paylaterMonths", { n: plan.tenorMonths })}
              detail={t("pay.paylaterDetail", { monthly: money(plan.monthlyInstallment), rate: formatDecimal(terms.monthlyRatePct, lang, 2) })}
              trailing={money(plan.totalPaid)}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {plan.extraCost > 0 && (
              <Chip tone="highlight" icon={<WarningIcon className="size-3.5" />}>
                {t("pay.containsInterest")}
              </Chip>
            )}
            {/* Monthly, not weekly: the numbers have no weekly split. */}
            <Chip icon={<SproutIcon className="size-3.5" />}>{t("realcost.debtFree", { amount: money(plan.monthlyInstallment), n: plan.tenorMonths })}</Chip>
          </div>
        </>
      )}

      <Notice className="mt-4" title={t("notice.lateTitle")}>
        {t("notice.lateBody")}
      </Notice>

      <div className="mt-auto space-y-2.5 pt-6">
        <Button
          disabled={!plan}
          onClick={() => {
            pay.patch({ step: "pay", choice: "later" });
            navigate("/wishlist", { replace: true });
          }}
        >
          {t("realcost.use")}
        </Button>
        <Button variant="secondary" onClick={back}>
          {t("realcost.backToCart")}
        </Button>
      </div>
    </main>
  );
}
