import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { api, type PaylaterQuote } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { parseAmount } from "@/lib/amount";
import { cx } from "@/lib/cx";
import { formatDecimal, formatMoney } from "@/lib/format";
import { DEFAULT_TENORS, OTHER_PROVIDER_ID, PROVIDERS, PROVIDERS_CHECKED_AT, tenorsFor, typicalRate, type Provider } from "@/lib/paylater";
import { usePay } from "@/state/PayProvider";
import { useProfile } from "@/state/ProfileProvider";
import { AmountField, BagIcon, BottomSheet, Button, CalendarIcon, ChevronIcon, Chip, ChoiceChip, OptionRow, TextField, useToast, WarningIcon } from "@/ui";

/**
 * Paying for a wishlist item. 05e "How are you paying?" → 06a "Which paylater?" → 06b "Pick your plan"
 * (or 06c "Enter your plan") → 06 "The real cost" (its own screen) → back to 05e with the plan chosen.
 * "Log it" records the purchase on the server: pay in full takes the price from the pocket this month,
 * PayLater takes an installment each month of the tenor. Figma still shows the v1 versions of these
 * screens (cart, screenshot, joy budget); the wording here is adapted to a wishlist item.
 */
export function PayFlow({ onLogged }: { onLogged: () => void }) {
  const pay = usePay();
  if (!pay.item) return null;
  return (
    <>
      <PaySheet onLogged={onLogged} />
      <ProvidersSheet />
      <PlansSheet />
      <EnterSheet />
    </>
  );
}

/* ---------------- 05e How are you paying? ---------------- */

function PaySheet({ onLogged }: { onLogged: () => void }) {
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const toast = useToast();
  const pay = usePay();
  const { item, terms, choice } = pay;
  const [plan, setPlan] = useState<PaylaterQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const open = pay.step === "pay";

  useEffect(() => {
    if (!open || !item || !terms) {
      setPlan(null);
      return;
    }
    let alive = true;
    api
      .paylaterCost(item.price, { tenorMonths: terms.tenorMonths, monthlyRatePct: terms.monthlyRatePct, adminFee: terms.adminFee })
      .then((r) => alive && setPlan(r.plan))
      .catch(() => alive && setPlan(null));
    return () => {
      alive = false;
    };
  }, [open, item, terms]);

  if (!item || !profile) return null;
  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const later = choice === "later" && plan !== null;

  const logIt = async () => {
    setBusy(true);
    setError(false);
    try {
      await api.addPurchase({
        name: item.name,
        price: item.price,
        pocketId: item.pocketId,
        wishlistId: item.id,
        paylater: later && terms ? { tenorMonths: terms.tenorMonths, monthlyRatePct: terms.monthlyRatePct, adminFee: terms.adminFee } : null,
      });
      toast({ message: t("pay.logged"), icon: true });
      pay.close();
      onLogged();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={pay.close} title={t("pay.title")} description={t("pay.body", { pocket: item.pocketName })}>
      <div className="space-y-2.5">
        {/* Pay in full is always first and selected by default. */}
        <OptionRow
          selected={!later}
          onClick={() => pay.patch({ choice: "full" })}
          icon={<BagIcon className="size-5" />}
          title={t("pay.inFull")}
          detail={t("pay.inFullDetail", { extra: money(0) })}
          trailing={money(item.price)}
        />
        {plan && terms ? (
          <OptionRow
            selected={later}
            onClick={() => pay.patch({ choice: "later" })}
            icon={<CalendarIcon className="size-5" />}
            title={t("pay.paylaterMonths", { n: plan.tenorMonths })}
            detail={t("pay.paylaterDetail", { monthly: money(plan.monthlyInstallment), rate: formatDecimal(terms.monthlyRatePct, lang, 2) })}
            trailing={money(plan.totalPaid)}
          />
        ) : (
          <OptionRow
            selected={false}
            onClick={() => pay.patch({ step: "providers" })}
            icon={<CalendarIcon className="size-5" />}
            title={t("pay.paylaterPick")}
            detail={t("pay.paylaterPickDetail")}
            trailing={<ChevronIcon aria-hidden className="size-5" />}
          />
        )}
        {plan && plan.extraCost > 0 && (
          <Chip tone="highlight" icon={<WarningIcon className="size-3.5" />}>
            {t("pay.paylaterContainsInterest")}
          </Chip>
        )}
        {error && (
          <p role="alert" className="tt-small text-warn">
            {t("pay.error")}
          </p>
        )}
        <div className="space-y-2.5 pt-1">
          <Button onClick={() => void logIt()} disabled={busy}>
            {busy ? t("common.loading") : t("pay.logIt")}
          </Button>
          <Button variant="secondary" onClick={pay.close} disabled={busy}>
            {t("pay.notYet")}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

/* ---------------- 06a Which paylater? ---------------- */

function ProvidersSheet() {
  const { t, lang } = useI18n();
  const pay = usePay();
  const open = pay.step === "providers";
  const days = Math.max(0, Math.floor((Date.now() - new Date(`${PROVIDERS_CHECKED_AT}T00:00:00+07:00`).getTime()) / 86_400_000));
  const source = PROVIDERS.find((p) => p.sourceUrl)?.sourceUrl;
  const pct = (fraction: number) => formatDecimal(fraction * 100, lang, 2);

  const detail = (p: Provider) => {
    if (p.id === OTHER_PROVIDER_ID) return t("paylater.othersDetail");
    if (!p.typicalMonthlyRateFrom) return t("paylater.ratesVary");
    return p.serviceFeeRate ? t("paylater.fromWithFee", { rate: pct(p.typicalMonthlyRateFrom), fee: pct(p.serviceFeeRate) }) : t("paylater.from", { rate: pct(p.typicalMonthlyRateFrom) });
  };

  return (
    <BottomSheet open={open} onClose={pay.close} title={t("paylater.whichTitle")} description={t("paylater.whichBody")}>
      <ul className="space-y-2.5">
        {PROVIDERS.map((p) => {
          const selected = p.id === pay.providerId;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => pay.patch({ providerId: p.id, providerName: p.id === OTHER_PROVIDER_ID ? null : p.name, step: p.id === OTHER_PROVIDER_ID ? "enter" : "plans" })}
                className={cx("flex w-full items-center gap-3 rounded-md px-4 py-3 text-left", selected ? "border-2 border-action bg-soft" : "border border-line bg-page")}
              >
                <span aria-hidden className="tt-body-strong inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface text-ink">
                  {p.id === OTHER_PROVIDER_ID ? "+" : p.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="tt-body-strong block text-ink">{p.id === OTHER_PROVIDER_ID ? t("paylater.others") : p.name}</span>
                  <span className="tt-small block text-ink-2">{detail(p)}</span>
                </span>
                <ChevronIcon aria-hidden className="size-5 shrink-0 text-ink" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="tt-caption mt-4 text-center text-ink-2">
        {days === 0 ? t("paylater.checkedToday") : days === 1 ? t("paylater.checkedYesterday") : t("paylater.checked", { n: days })}
        {source && (
          <>
            {" · "}
            <a href={source} target="_blank" rel="noreferrer" className="text-link underline underline-offset-2">
              {t("paylater.sources")}
            </a>
          </>
        )}
        <br />
        {t("paylater.finalNumbers")}
      </p>
    </BottomSheet>
  );
}

/* ---------------- 06b Pick your plan ---------------- */

function PlansSheet() {
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const pay = usePay();
  const { item } = pay;
  const provider = PROVIDERS.find((p) => p.id === pay.providerId) ?? null;
  const open = pay.step === "plans" && provider !== null && provider.id !== OTHER_PROVIDER_ID;
  const { ratePct, source } = typicalRate(provider);
  const tenors = useMemo(() => tenorsFor(provider), [provider]);
  const [rows, setRows] = useState<PaylaterQuote[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tenor, setTenor] = useState<number | null>(null);

  useEffect(() => {
    if (open) setTenor((cur) => (cur && tenors.includes(cur) ? cur : (tenors.find((n) => n === 6) ?? tenors[0] ?? null)));
  }, [open, tenors]);

  // One server call per tenor (numbers only).
  useEffect(() => {
    if (!open || !item) return;
    let alive = true;
    setRows(null);
    setFailed(false);
    Promise.all(tenors.map((n) => api.paylaterCost(item.price, { tenorMonths: n, monthlyRatePct: ratePct, adminFee: 0 }).then((r) => r.plan)))
      .then((r) => alive && setRows(r))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [open, item, tenors, ratePct]);

  if (!item || !profile || !provider) return null;
  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const rate = formatDecimal(ratePct, lang, 2);

  return (
    <BottomSheet
      open={open}
      onClose={pay.close}
      title={t("plans.title", { provider: provider.name })}
      description={source === "typical" ? t("plans.bodyTypical", { provider: provider.name, rate }) : t("plans.bodyDefault", { rate })}
    >
      {failed ? (
        <p className="tt-small py-4 text-center text-warn">{t("plans.error")}</p>
      ) : (
        <ul className="space-y-2.5" aria-busy={!rows}>
          {tenors.map((n) => {
            const row = rows?.find((r) => r.tenorMonths === n) ?? null;
            const selected = n === tenor;
            return (
              <li key={n}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTenor(n)}
                  className={cx("flex w-full items-center gap-3 rounded-md p-4 text-left", selected ? "border-2 border-[var(--tt-color-border-strong)] bg-soft" : "border border-line bg-page")}
                >
                  <span aria-hidden className={cx("inline-flex size-10 shrink-0 items-center justify-center rounded-pill", selected ? "bg-action text-white" : "bg-surface text-ink")}>
                    <BagIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="tt-body-strong block text-ink">{t("plans.months", { n })}</span>
                    <span className="tt-small block text-ink-2">{row ? t("plans.includes", { amount: money(row.extraCost) }) : t("plans.loading")}</span>
                  </span>
                  <span className="tt-body-strong shrink-0 text-ink">{row ? t("plans.perMonth", { amount: money(row.monthlyInstallment) }) : "…"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="tt-small text-ink-2">{t("plans.footer", { rate, fee: money(0) })}</p>
        <button type="button" onClick={() => pay.patch({ step: "enter" })} className="tt-link shrink-0 underline underline-offset-2">
          {t("plans.edit")}
        </button>
      </div>
      <div className="mt-4 space-y-2.5">
        <Button
          disabled={!tenor || !rows}
          onClick={() => {
            if (!tenor) return;
            pay.patch({ terms: { tenorMonths: tenor, monthlyRatePct: ratePct, adminFee: 0, source }, step: "closed" });
            navigate("/wishlist/real-cost");
          }}
        >
          {t("plans.seeCost")}
        </Button>
        <Button variant="secondary" onClick={() => pay.patch({ step: "providers" })}>
          {t("plans.change")}
        </Button>
      </div>
    </BottomSheet>
  );
}

/* ---------------- 06c Enter your plan ---------------- */

function EnterSheet() {
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const pay = usePay();
  const { item } = pay;
  const provider = PROVIDERS.find((p) => p.id === pay.providerId) ?? null;
  const isOther = !provider || provider.id === OTHER_PROVIDER_ID;
  const open = pay.step === "enter";
  const [name, setName] = useState("");
  const [tenor, setTenor] = useState(6);
  const [otherTenor, setOtherTenor] = useState("");
  const [isOtherTenor, setIsOtherTenor] = useState(false);
  const [monthly, setMonthly] = useState("");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setTenor(pay.terms?.tenorMonths && DEFAULT_TENORS.includes(pay.terms.tenorMonths) ? pay.terms.tenorMonths : 6);
    setIsOtherTenor(false);
    setOtherTenor("");
    setMonthly("");
    setFee("");
    setFailed(false);
    // Reset each time the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!item || !profile) return null;
  const months = isOtherTenor ? Number(otherTenor) : tenor;
  const valid = months >= 1 && months <= 36;
  const back = () => pay.patch({ step: isOther ? "providers" : "plans" });

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setFailed(false);
    const monthlyPayment = parseAmount(monthly, profile.currency, lang);
    const adminFee = parseAmount(fee, profile.currency, lang) ?? 0;
    const typical = typicalRate(provider);
    try {
      // A monthly payment copied from the user's app wins; the server works out the rate. Otherwise the provider's typical rate.
      const { plan } = await api.paylaterCost(
        item.price,
        monthlyPayment && monthlyPayment > 0 ? { tenorMonths: months, monthlyPayment, adminFee } : { tenorMonths: months, monthlyRatePct: typical.ratePct, adminFee },
      );
      pay.patch({
        terms: { tenorMonths: months, monthlyRatePct: plan.monthlyRatePct, adminFee, source: monthlyPayment && monthlyPayment > 0 ? "typed" : typical.source },
        providerName: name.trim() || provider?.name || "PayLater",
        step: "closed",
      });
      navigate("/wishlist/real-cost");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={pay.close} title={t("enter.title")} description={t("enter.body")}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {isOther && <TextField label={t("enter.name")} placeholder={t("enter.namePlaceholder")} value={name} onChange={setName} maxLength={40} />}
        <fieldset>
          <legend className="tt-small mb-1.5 text-ink-2">{t("enter.months")}</legend>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TENORS.map((n) => (
              <ChoiceChip
                key={n}
                selected={!isOtherTenor && tenor === n}
                onClick={() => {
                  setIsOtherTenor(false);
                  setTenor(n);
                }}
              >
                {t("enter.monthsChip", { n })}
              </ChoiceChip>
            ))}
            <ChoiceChip selected={isOtherTenor} onClick={() => setIsOtherTenor(true)}>
              {t("enter.other")}
            </ChoiceChip>
          </div>
        </fieldset>
        {isOtherTenor && <TextField label={t("enter.otherMonths")} inputMode="numeric" value={otherTenor} onChange={(v) => setOtherTenor(v.replace(/\D/g, "").slice(0, 2))} />}
        <div className="grid grid-cols-2 gap-2.5">
          <AmountField label={t("enter.monthly")} currency={profile.currency} value={monthly} onChange={setMonthly} placeholder="0" />
          <AmountField label={t("enter.fee")} currency={profile.currency} value={fee} onChange={setFee} placeholder="0" />
        </div>
        {failed && (
          <p role="alert" className="tt-small text-warn">
            {t("plans.error")}
          </p>
        )}
        <Button type="submit" disabled={!valid || busy}>
          {t("plans.seeCost")}
        </Button>
        <Button variant="secondary" onClick={back}>
          {t("common.cancel")}
        </Button>
      </form>
    </BottomSheet>
  );
}
