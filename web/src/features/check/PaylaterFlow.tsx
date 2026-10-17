import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { api, type Cost } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { formatDecimal, formatIDR } from "@/lib/format";
import { parseRupiah, rupiahInput } from "@/lib/money";
import {
  DEFAULT_TENORS,
  matchProvider,
  OTHER_PROVIDER_ID,
  PROVIDERS,
  PROVIDERS_CHECKED_AT,
  resolveTerms,
  screenshotTerms,
  tenorsFor,
  type Provider,
  type Terms,
  type TypedPlan,
} from "@/lib/paylater";
import { useCartCheck } from "@/state/CartCheckProvider";
import { BagIcon, BottomSheet, Button, ChevronIcon, Chip, ChoiceChip, MoneyField, TextField } from "@/ui";

type Step = "providers" | "plans" | "enter";

/**
 * Paying with PayLater: 06a Which paylater? → 06b Pick your plan (or 06c Enter your plan) →
 * 06 Real cost. Numbers start from the screenshot; typical rates only fill gaps (gaps #6).
 */
export function PaylaterFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { cart, extract, paylater, paylaterInfo, setPaylater } = useCartCheck();
  const idr = extract?.idr ?? null;
  const detected = useMemo(() => matchProvider(idr?.installment?.provider ?? idr?.payment_method), [idr]);

  const [step, setStep] = useState<Step>("providers");
  const [providerId, setProviderId] = useState<string | null>(null);
  const [typed, setTyped] = useState<TypedPlan | null>(null);
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("providers");
    setProviderId(paylaterInfo?.providerId ?? detected?.id ?? null);
    setTyped(null);
  }, [open, paylaterInfo, detected]);

  if (!cart) return null;
  const provider = PROVIDERS.find((p) => p.id === providerId) ?? null;
  const shot = screenshotTerms(idr, providerId);

  const finish = (tenor: number, terms: Terms, name: string | null) => {
    setPaylater(
      { tenorMonths: tenor, monthlyRatePct: terms.monthlyRatePct, adminFee: terms.adminFee },
      { providerId, providerName: name, source: terms.source },
    );
    onClose();
    navigate("/check/paylater");
  };

  return (
    <>
      <ProvidersSheet
        open={open && step === "providers"}
        onClose={onClose}
        selectedId={providerId}
        detectedId={detected?.id ?? null}
        onPick={(p) => {
          setProviderId(p.id);
          setTyped(null);
          setStep(p.id === OTHER_PROVIDER_ID ? "enter" : "plans");
        }}
      />
      {provider && provider.id !== OTHER_PROVIDER_ID && (
        <PlansSheet
          open={open && step === "plans"}
          onClose={onClose}
          provider={provider}
          terms={resolveTerms(cart.total, provider, shot, typed)}
          tenors={tenorsFor(provider, shot)}
          shotTenor={shot?.tenor ?? null}
          shotMonthly={shot?.monthly ?? null}
          initialTenor={typed?.tenor ?? (paylaterInfo?.providerId === provider.id ? paylater?.tenorMonths : null) ?? shot?.tenor ?? null}
          onEdit={() => setStep("enter")}
          onChange={() => setStep("providers")}
          onSee={(tenor, terms) => finish(tenor, terms, provider.name)}
        />
      )}
      <EnterSheet
        open={open && step === "enter"}
        isOther={!provider || provider.id === OTHER_PROVIDER_ID}
        initialName={typedName}
        initialTenor={typed?.tenor ?? shot?.tenor ?? paylater?.tenorMonths ?? 6}
        initialMonthly={typed?.monthly ?? shot?.monthly ?? null}
        initialFee={typed?.fee ?? shot?.adminFee ?? null}
        onCancel={() => setStep(provider && provider.id !== OTHER_PROVIDER_ID ? "plans" : "providers")}
        onClose={onClose}
        onSee={(plan, name) => {
          setTyped(plan);
          setTypedName(name);
          const terms = resolveTerms(cart.total, provider, shot, plan);
          finish(plan.tenor, terms, name.trim() || provider?.name || "PayLater");
        }}
      />
    </>
  );
}

/* ---------------- 06a Which paylater? ---------------- */

function ProvidersSheet({
  open,
  onClose,
  selectedId,
  detectedId,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  selectedId: string | null;
  detectedId: string | null;
  onPick: (p: Provider) => void;
}) {
  const { t, lang } = useI18n();
  const days = Math.max(0, Math.floor((Date.now() - new Date(`${PROVIDERS_CHECKED_AT}T00:00:00+07:00`).getTime()) / 86_400_000));
  const source = PROVIDERS.find((p) => p.sourceUrl)?.sourceUrl;
  const pct = (fraction: number) => formatDecimal(fraction * 100, lang, 2);

  const detail = (p: Provider) => {
    if (p.id === OTHER_PROVIDER_ID) return t("paylater.othersDetail");
    if (!p.typicalMonthlyRateFrom) return t("paylater.ratesVary");
    return p.serviceFeeRate
      ? t("paylater.fromWithFee", { rate: pct(p.typicalMonthlyRateFrom), fee: pct(p.serviceFeeRate) })
      : t("paylater.from", { rate: pct(p.typicalMonthlyRateFrom) });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("paylater.whichTitle")} description={t("paylater.whichBody")}>
      <ul className="space-y-2.5">
        {PROVIDERS.map((p) => {
          const selected = p.id === selectedId;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(p)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-md px-4 py-3 text-left",
                  selected ? "border-2 border-action bg-soft" : "border border-line bg-page",
                )}
              >
                <span aria-hidden className="tt-body-strong inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface text-ink">
                  {p.id === OTHER_PROVIDER_ID ? "+" : p.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="tt-body-strong block text-ink">{p.id === OTHER_PROVIDER_ID ? t("paylater.others") : p.name}</span>
                  {p.id === detectedId && (
                    <Chip tone="highlight" className="my-1">
                      {t("paylater.inScreenshot")}
                    </Chip>
                  )}
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

type PlanRow = { tenor: number; cost: Cost["paylater"] };

function PlansSheet({
  open,
  onClose,
  provider,
  terms,
  tenors,
  shotTenor,
  shotMonthly,
  initialTenor,
  onEdit,
  onChange,
  onSee,
}: {
  open: boolean;
  onClose: () => void;
  provider: Provider;
  terms: Terms;
  tenors: number[];
  shotTenor: number | null;
  shotMonthly: number | null;
  initialTenor: number | null;
  onEdit: () => void;
  onChange: () => void;
  onSee: (tenor: number, terms: Terms) => void;
}) {
  const { t, lang } = useI18n();
  const { cart } = useCartCheck();
  const [rows, setRows] = useState<PlanRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tenor, setTenor] = useState<number | null>(null);
  const key = `${terms.monthlyRatePct}|${terms.adminFee}|${tenors.join(",")}`;

  useEffect(() => {
    if (!open) return;
    setTenor((cur) =>
      cur && tenors.includes(cur) ? cur : initialTenor && tenors.includes(initialTenor) ? initialTenor : (tenors.find((n) => n === 6) ?? tenors[0] ?? null),
    );
  }, [open, initialTenor, tenors]);

  // One POST /api/cost per tenor (numbers only, no AI). Debounced so quick changes send one batch.
  useEffect(() => {
    if (!open || !cart) return;
    let alive = true;
    setRows(null);
    setFailed(false);
    const timer = window.setTimeout(() => {
      Promise.all(
        tenors.map((n) =>
          api
            .cost({ cart, paylater: { tenorMonths: n, monthlyRatePct: terms.monthlyRatePct, adminFee: terms.adminFee } })
            .then((r) => ({ tenor: n, cost: r.cost.paylater })),
        ),
      )
        .then((r) => alive && setRows(r))
        .catch(() => alive && setFailed(true));
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // `key` stands in for terms + tenors, which are new objects on every render.
  }, [open, key, cart]);

  const rate = formatDecimal(terms.monthlyRatePct, lang, 2);
  const body =
    terms.source === "screenshot" && shotTenor && shotMonthly
      ? t("plans.bodyScreenshot", { monthly: formatIDR(shotMonthly), n: shotTenor, rate })
      : terms.source === "screenshot"
        ? t("plans.bodyScreenshotRate", { rate })
        : terms.source === "typed"
          ? t("plans.bodyTyped", { rate })
          : terms.source === "typical"
            ? t("plans.bodyTypical", { provider: provider.name, rate })
            : t("plans.bodyDefault", { rate });

  return (
    <BottomSheet open={open} onClose={onClose} title={t("plans.title", { provider: provider.name })} description={body}>
      {failed ? (
        <p className="tt-small py-4 text-center text-warn">{t("plans.error")}</p>
      ) : (
        <ul className="space-y-2.5" aria-busy={!rows}>
          {tenors.map((n) => {
            const row = rows?.find((r) => r.tenor === n)?.cost ?? null;
            const selected = n === tenor;
            const fromShot = terms.source === "screenshot" && n === shotTenor;
            return (
              <li key={n}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTenor(n)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-md p-4 text-left",
                    selected ? "border-2 border-[var(--tt-color-border-strong)] bg-soft" : "border border-line bg-page",
                  )}
                >
                  <span
                    aria-hidden
                    className={cx("inline-flex size-10 shrink-0 items-center justify-center rounded-pill", selected ? "bg-action text-white" : "bg-surface text-ink")}
                  >
                    <BagIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="tt-body-strong block text-ink">{t("plans.months", { n })}</span>
                    <span className="tt-small block text-ink-2">
                      {row
                        ? fromShot
                          ? t("plans.fromScreenshot", { amount: formatIDR(row.extraCost) })
                          : t("plans.includes", { amount: formatIDR(row.extraCost) })
                        : t("plans.loading")}
                    </span>
                  </span>
                  <span className="tt-body-strong shrink-0 text-ink">{row ? t("plans.perMonth", { amount: formatIDR(row.monthlyInstallment) }) : "…"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="tt-small text-ink-2">{t("plans.footer", { rate, fee: formatIDR(terms.adminFee) })}</p>
        <button type="button" onClick={onEdit} className="tt-link shrink-0 underline underline-offset-2">
          {t("plans.edit")}
        </button>
      </div>
      <div className="mt-4 space-y-2.5">
        <Button disabled={!tenor || !rows} onClick={() => tenor && onSee(tenor, terms)}>
          {t("plans.seeCost")}
        </Button>
        <Button variant="secondary" onClick={onChange}>
          {t("plans.change")}
        </Button>
      </div>
    </BottomSheet>
  );
}

/* ---------------- 06c Enter your plan ---------------- */

function EnterSheet({
  open,
  isOther,
  initialName,
  initialTenor,
  initialMonthly,
  initialFee,
  onCancel,
  onClose,
  onSee,
}: {
  open: boolean;
  isOther: boolean;
  initialName: string;
  initialTenor: number;
  initialMonthly: number | null;
  initialFee: number | null;
  onCancel: () => void;
  onClose: () => void;
  onSee: (plan: TypedPlan, name: string) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [tenor, setTenor] = useState(6);
  const [otherTenor, setOtherTenor] = useState("");
  const [isOtherTenor, setIsOtherTenor] = useState(false);
  const [monthly, setMonthly] = useState("");
  const [fee, setFee] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    const preset = DEFAULT_TENORS.includes(initialTenor);
    setIsOtherTenor(!preset);
    setTenor(preset ? initialTenor : 6);
    setOtherTenor(preset ? "" : String(initialTenor));
    setMonthly(rupiahInput(initialMonthly));
    setFee(rupiahInput(initialFee ?? 0));
  }, [open, initialName, initialTenor, initialMonthly, initialFee]);

  const months = isOtherTenor ? Number(otherTenor) : tenor;
  const valid = months >= 1 && months <= 36;

  return (
    <BottomSheet open={open} onClose={onClose} title={t("enter.title")} description={t("enter.body")}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSee({ tenor: months, monthly: parseRupiah(monthly), fee: parseRupiah(fee) }, name);
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
        {isOtherTenor && (
          <TextField
            label={t("enter.otherMonths")}
            inputMode="numeric"
            value={otherTenor}
            onChange={(v) => setOtherTenor(v.replace(/\D/g, "").slice(0, 2))}
          />
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <MoneyField label={t("enter.monthly")} value={monthly} onChange={setMonthly} placeholder="0" />
          <MoneyField label={t("enter.fee")} value={fee} onChange={setFee} placeholder="0" />
        </div>
        <Button type="submit" disabled={!valid}>
          {t("plans.seeCost")}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </form>
    </BottomSheet>
  );
}
