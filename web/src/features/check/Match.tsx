import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, type Reality } from "@/api";
import { AddPocketSheet } from "@/features/onboarding/AddPocketSheet";
import { useI18n } from "@/i18n/I18nProvider";
import { amountToInput, parseAmount } from "@/lib/amount";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/lib/format";
import { useCheck } from "@/state/CheckProvider";
import { useProfile } from "@/state/ProfileProvider";
import { AmountField, Button, pocketColor, useToast, WarningIcon } from "@/ui";
import { CheckHeader } from "./CheckHeader";

const BUILT_IN = ["fashion", "gadgets", "entertainment", "travel"] as const;

/** Mirrors the API's LOW_POCKET_PCT, used only while the deployed API does not send `lowAfter` yet. */
const LOW_POCKET_PCT_FALLBACK = 20;

/** The pocket line under "Goes into pocket": a warning when buying overspends the pocket or leaves it low. */
function pocketWarning(r: Reality): "empty" | "over" | "low" | null {
  if (r.status === "pocket_empty") return "empty";
  if (r.status === "not_healthy") return "over";
  const low = r.lowAfter ?? (r.remainingAfterPct !== null && r.remainingAfterPct < LOW_POCKET_PCT_FALLBACK);
  return low ? "low" : null;
}

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
  // The server's verdict for the current price and pocket, for the "Goes into pocket" warning (and reused by the button).
  const [preview, setPreview] = useState<{ key: string; reality: Reality } | null>(null);
  const priceNow = profile ? parseAmount(priceText, profile.currency, lang) : null;
  const previewKey = product && check.pocketId && priceNow !== null && priceNow > 0 ? `${check.pocketId}|${priceNow}` : null;

  useEffect(() => {
    if (!previewKey || !product || !check.pocketId || priceNow === null) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      api
        .check({ name: product.name, price: priceNow, pocketId: check.pocketId! })
        .then(({ reality }) => alive && setPreview({ key: previewKey, reality }))
        .catch(() => undefined); // the warning is a hint; "Check my reality" still asks again
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // previewKey stands for pocket + price.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  if (!profile || !product || !summary || !check.pocketId) return <Navigate to="/check" replace />;

  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const price = parseAmount(priceText, profile.currency, lang);
  const noPrice = price === null || price <= 0;
  const pocket = summary.pockets.find((p) => p.id === check.pocketId);
  const aiPicked = check.pocketId === product.pocketId;
  // Only trust the verdict that matches what is on screen.
  const current = preview && preview.key === previewKey ? preview.reality : null;
  const warning = current ? pocketWarning(current) : null;
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
      const key = `${check.pocketId}|${price}`;
      const reality = preview?.key === key ? preview.reality : (await api.check({ name: product.name, price, pocketId: check.pocketId! })).reality;
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
              <span className="tt-h2 text-danger-ink">{t("match.addPrice")}</span>
              <button type="button" onClick={() => setEditing(true)} className="tt-link -my-3 px-1 py-3 underline">
                {t("match.typeIt")}
              </button>
            </p>
          ) : (
            <p className="mt-1 flex items-baseline gap-3">
              <span className="tt-h2">{money(price ?? 0)}</span>
              <button type="button" onClick={() => setEditing(true)} className="tt-link -my-3 px-1 py-3 underline">
                {t("match.edit")}
              </button>
            </p>
          )}
        </div>
      </section>

      <p className="tt-small mt-4 mb-1.5 text-ink-2">{t("match.goesInto")}</p>
      {pocket && (
        <section className={cx("rounded-card border-2 p-4", warning ? "border-danger bg-danger-tint" : "border-action")}>
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
          {warning && current && (
            <p role="status" className="tt-small mt-2 flex gap-1.5 font-semibold text-danger-ink">
              <WarningIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {warning === "empty"
                ? t("match.warnEmpty", { pocket: pocket.name })
                : warning === "over"
                  ? t("match.warnOver", { pocket: pocket.name, amount: money(current.overBy) })
                  : t("match.warnLow", { pocket: pocket.name, left: money(current.remainingAfter), pct: current.remainingAfterPct ?? 0 })}
            </p>
          )}
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
        className="tt-link mt-2 -mb-1 self-start py-3 underline"
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
