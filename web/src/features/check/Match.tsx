import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api } from "@/api";
import { AddPocketSheet } from "@/features/onboarding/AddPocketSheet";
import { useI18n } from "@/i18n/I18nProvider";
import { amountToInput, parseAmount } from "@/lib/amount";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/lib/format";
import { useCheck } from "@/state/CheckProvider";
import { useProfile } from "@/state/ProfileProvider";
import { AmountField, Button, pocketColor, useToast } from "@/ui";
import { CheckHeader } from "./CheckHeader";

const BUILT_IN = ["fashion", "gadgets", "entertainment", "travel"] as const;

/**
 * 04 Product & pocket match, and N5 (price not found). The price can be edited, the pocket changed or a custom one made.
 * "Check my reality" asks the server for the verdict.
 */
export function Match() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { profile, save } = useProfile();
  const check = useCheck();
  const { product, summary } = check;
  const [priceText, setPriceText] = useState(() => (check.price !== null && profile ? amountToInput(check.price, profile.currency, lang) : ""));
  const [editing, setEditing] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!profile || !product || !summary || !check.pocketId) return <Navigate to="/check" replace />;

  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const price = parseAmount(priceText, profile.currency, lang);
  const noPrice = price === null || price <= 0;
  const pocket = summary.pockets.find((p) => p.id === check.pocketId);
  const aiPicked = check.pocketId === product.pocketId;
  const describe = (id: string) => (BUILT_IN.includes(id as (typeof BUILT_IN)[number]) ? t(`pocket.desc.${id as (typeof BUILT_IN)[number]}`) : null);

  const addCustom = async (name: string) => {
    const id = `custom-${Date.now().toString(36)}`;
    try {
      await save({ ...profile, pockets: [...profile.pockets, { id, name, allocationPct: 0 }] });
      const { summary: next } = await api.getSummary();
      check.patch({ summary: next, pocketId: id });
    } catch {
      toast({ message: t("match.failed") });
    }
  };

  const go = async () => {
    if (noPrice || price === null) return;
    setBusy(true);
    try {
      const { reality } = await api.check({ name: product.name, price, pocketId: check.pocketId! });
      check.patch({ price, reality });
      navigate("/check/reality");
    } catch {
      toast({ message: t("match.failed") });
      setBusy(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      <CheckHeader onBack={() => navigate("/check", { replace: true })} />
      <h2 className="tt-h1 mt-2">{t("match.title")}</h2>
      <p className="tt-body mt-2 text-ink-2">{check.price === null && noPrice ? t("match.subNoPrice") : t("match.sub")}</p>

      <section className={cx("mt-4 flex gap-4 rounded-card p-4", check.price === null && noPrice ? "border-2 border-danger" : "border border-line")}>
        <span aria-hidden className="inline-flex size-[88px] shrink-0 items-center justify-center rounded-md bg-soft text-[44px]">
          {product.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="tt-body-strong text-ink">{product.name}</p>
          {product.detail && <p className="tt-small text-ink-2">{product.detail}</p>}
          {editing ? (
            <AmountField
              className="mt-2"
              label={t("match.priceLabel")}
              currency={profile.currency}
              value={priceText}
              onChange={setPriceText}
              autoFocus
              onBlur={() => !noPrice && setEditing(false)}
            />
          ) : noPrice ? (
            <p className="mt-1 flex items-baseline gap-3">
              <span className="tt-h2 text-danger">{t("match.addPrice")}</span>
              <button type="button" onClick={() => setEditing(true)} className="tt-link underline">
                {t("match.typeIt")}
              </button>
            </p>
          ) : (
            <p className="mt-1 flex items-baseline gap-3">
              <span className="tt-h2">{money(price ?? 0)}</span>
              <button type="button" onClick={() => setEditing(true)} className="tt-link underline">
                {t("match.edit")}
              </button>
            </p>
          )}
        </div>
      </section>

      <p className="tt-small mt-4 mb-1.5 text-ink-2">{t("match.goesInto")}</p>
      {pocket && (
        <section className="rounded-card border-2 border-action p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="tt-body-lg flex items-center gap-2 text-ink" style={{ fontWeight: 700 }}>
              <span aria-hidden className="size-3 rounded-pill" style={{ background: pocketColor(pocket.id) }} />
              {pocket.name}
            </span>
            {aiPicked && <span className="tt-caption rounded-pill bg-soft px-3 py-1 text-link">{t("match.aiMatched", { pct: product.matchConfidencePct })}</span>}
          </div>
          <p className="tt-small mt-2 text-ink-2">
            {[describe(pocket.id), t("match.leftMonth", { amount: money(pocket.remaining) })].filter(Boolean).join(" · ")}
          </p>
        </section>
      )}

      <p className="tt-small mt-4 mb-2 text-ink-2">{t("match.notRight")}</p>
      <div className="flex flex-wrap gap-2">
        {summary.pockets.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === check.pocketId}
            onClick={() => check.patch({ pocketId: p.id })}
            className={cx("tt-body-strong h-[42px] rounded-pill px-4", p.id === check.pocketId ? "bg-action text-white" : "bg-surface text-ink")}
          >
            {p.name}
          </button>
        ))}
        <button type="button" onClick={() => setCustomOpen(true)} className="tt-body-strong h-[42px] rounded-pill bg-surface px-4 text-ink">
          {t("match.custom")}
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          check.reset();
          navigate("/check", { replace: true });
        }}
        className="tt-link mt-5 self-start underline"
      >
        {t("match.rescan")}
      </button>

      <Button className="mt-5" disabled={noPrice || busy} onClick={() => void go()}>
        {t("match.cta")}
      </Button>

      <AddPocketSheet open={customOpen} onClose={() => setCustomOpen(false)} taken={profile.pockets.map((p) => p.name.toLowerCase())} onAdd={(name) => void addCustom(name)} />
    </main>
  );
}
