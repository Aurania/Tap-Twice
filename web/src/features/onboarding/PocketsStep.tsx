import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import type { Currency } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { amountFormat, amountToInput, formatAmountInput, parseAmount } from "@/lib/amount";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/lib/format";
import { Button, EditIcon, PercentRing, pocketColor, pocketRingColor, PocketSlider, useToast } from "@/ui";
import { AddPocketSheet } from "./AddPocketSheet";
import { MAX_POCKETS, OnboardingHeader, OnboardingScreen, useOnboardingDraft, useStepAction } from "./OnboardingLayout";
import { useBudgetPreview } from "./useBudgetPreview";

const WARN_EVERY_MS = 2500;

/**
 * 01a-3 Pocket allocation. Sliders (or a typed amount) set each pocket's share of the leftover. The total can never
 * go past 100%: a slider stops at what is left, a typed amount is capped, and a toast says why. Every money amount
 * and the final 100% check come from the server's preview. Any pocket, built-in or custom, can be renamed or removed.
 */
export function PocketsStep() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { draft, update, edit } = useOnboardingDraft();
  const action = useStepAction(() => navigate("/onboarding/goal"));
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const lastWarn = useRef(0);

  const income = parseAmount(draft.income, draft.currency, lang);
  const expenses = parseAmount(draft.expenses, draft.currency, lang);
  const ready = income !== null && income > 0 && expenses !== null;

  const { status, preview } = useBudgetPreview(
    ready ? { monthlyIncome: income, monthlyExpenses: expenses, pockets: draft.pockets.map((p) => ({ id: p.id, allocationPct: p.allocationPct })) } : null,
  );

  if (!ready) return <Navigate to="/onboarding/money" replace />;

  // Percentages add up instantly for the ring; the server confirms them and supplies every amount.
  const pctTotal = draft.pockets.reduce((sum, p) => sum + p.allocationPct, 0);
  const state: "ok" | "over" | "under" = pctTotal > 100 ? "over" : pctTotal < 100 ? "under" : "ok";
  const money = (n: number | undefined) => (n === undefined ? "–" : formatMoney(n, draft.currency, lang));
  const budgetOf = (id: string) => preview?.budgets.find((b) => b.id === id)?.budget;
  const canContinue = status === "ready" && preview?.valid === true && state === "ok";
  const editing = draft.pockets.find((p) => p.id === editingId) ?? null;

  const warnMax = () => {
    const now = Date.now();
    if (now - lastWarn.current < WARN_EVERY_MS) return;
    lastWarn.current = now;
    toast({ message: t("onboarding.max100"), position: "bottom" });
  };

  /** Sets one pocket's share, capped so the total never goes above 100%. */
  const setPct = (id: string, wanted: number) => {
    const others = draft.pockets.reduce((sum, p) => (p.id === id ? sum : sum + p.allocationPct), 0);
    const room = Math.max(0, 100 - others);
    const allocationPct = Math.max(0, Math.min(wanted, room));
    if (wanted > room) warnMax();
    update({ pockets: draft.pockets.map((p) => (p.id === id ? { ...p, allocationPct } : p)) });
  };

  /**
   * A typed amount becomes the nearest whole percentage of the leftover (the server's number): a share, not money math.
   * The amount shown afterwards is the server's budget for that percentage.
   */
  const setAmount = (id: string, amount: number) => {
    const leftover = preview?.leftover ?? 0;
    if (!(leftover > 0)) return;
    setPct(id, Math.round((amount / leftover) * 100));
  };

  const removePocket = (id: string) => update({ pockets: draft.pockets.filter((p) => p.id !== id) });
  const renamePocket = (id: string, name: string) => update({ pockets: draft.pockets.map((p) => (p.id === id ? { ...p, name } : p)) });

  const headline = !preview ? "–" : state === "ok" ? money(preview.leftover) : money(Math.abs(preview.overAllocatedAmount));

  return (
    <OnboardingScreen>
      <OnboardingHeader step={3} onBack={() => navigate("/onboarding/work")} />
      <h1 className="tt-h1 mt-4">{t("onboarding.pocketsTitle")}</h1>
      <p className="tt-body mt-2 text-ink-2">{t("onboarding.pocketsSub")}</p>

      <section className={cx("mt-4 flex items-center gap-4 rounded-card p-4 text-white", state === "over" ? "bg-danger-ink" : "bg-action")}>
        <PercentRing
          size={84}
          label={`${pctTotal}%`}
          track="transparent"
          segments={state === "over" ? [{ pct: 100, color: "var(--tt-color-text-on-action)" }] : draft.pockets.map((p) => ({ pct: p.allocationPct, color: pocketRingColor(p.id) }))}
        >
          <span className="tt-body-strong text-white">{pctTotal}%</span>
        </PercentRing>
        <div className="min-w-0" aria-live="polite">
          <p className="tt-small text-white/95">{state === "over" ? t("onboarding.overAllocated") : t("onboarding.leftToAllocate")}</p>
          <p className="tt-hero leading-none break-words" style={{ fontSize: headlineSize(headline) }}>{headline}</p>
          <p className="tt-caption mt-1 text-white/95">
            {state === "over"
              ? t("onboarding.overAllocatedHelp", { pct: pctTotal })
              : state === "under"
                ? t("onboarding.underAllocatedHelp", { pct: pctTotal })
                : preview && t("onboarding.incomeMinusExpenses", { income: money(income), expenses: money(expenses) })}
          </p>
        </div>
      </section>

      <ul className="mt-3 flex flex-col gap-2.5">
        {draft.pockets.map((p) => (
          <li key={p.id} className="rounded-card border border-line bg-page px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="tt-body-strong flex min-w-0 items-center gap-2 text-ink">
                <span aria-hidden className="size-2.5 shrink-0 rounded-pill" style={{ background: pocketColor(p.id) }} />
                <span className="break-words">{p.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setEditingId(p.id)}
                aria-label={t("onboarding.pocketEdit", { name: p.name })}
                className="-my-1 inline-flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface text-ink"
              >
                <EditIcon aria-hidden className="size-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <PocketAmount
                currency={draft.currency}
                budget={budgetOf(p.id)}
                disabled={!preview || !(preview.leftover > 0)}
                label={t("onboarding.pocketAmount", { name: p.name })}
                onCommit={(amount) => setAmount(p.id, amount)}
              />
              <span className="tt-body-strong shrink-0 text-ink">{p.allocationPct}%</span>
            </div>
            <div className="mt-3">
              <PocketSlider value={p.allocationPct} onChange={(v) => setPct(p.id, v)} color={pocketRingColor(p.id)} label={t("onboarding.pocketAlloc", { name: p.name })} />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={draft.pockets.length >= MAX_POCKETS}
          className="tt-body-strong inline-flex h-10 items-center rounded-pill bg-surface px-4 text-ink disabled:opacity-50"
        >
          {t("onboarding.addPocket")}
        </button>
        {draft.pockets.length >= MAX_POCKETS && <p className="tt-small mt-1.5 text-ink-2">{t("onboarding.pocketLimit", { max: MAX_POCKETS })}</p>}
      </div>

      {action.error && (
        <p role="alert" className="tt-small mt-4 text-center text-warn">
          {t("onboarding.saveError")}
        </p>
      )}
      <Button className="mt-5" disabled={!canContinue || action.busy} onClick={action.run}>
        {state !== "ok" ? t("onboarding.fixAllocation") : edit ? action.label : t("onboarding.looksGood")}
      </Button>

      <AddPocketSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        taken={draft.pockets.map((p) => p.name.toLowerCase())}
        onAdd={(name) => update({ pockets: [...draft.pockets, { id: `custom-${Date.now().toString(36)}`, name, allocationPct: 0, custom: true }] })}
      />
      <AddPocketSheet
        open={editing !== null}
        onClose={() => setEditingId(null)}
        initialName={editing?.name ?? ""}
        taken={draft.pockets.filter((p) => p.id !== editingId).map((p) => p.name.toLowerCase())}
        onAdd={(name) => editingId && renamePocket(editingId, name)}
        onRemove={() => editingId && removePocket(editingId)}
        canRemove={draft.pockets.length > 1}
      />
    </OnboardingScreen>
  );
}

/**
 * The pocket's monthly amount, typed directly. Shows the server's budget for the current share; while focused it is
 * a plain amount input, and the typed value is applied on blur or Enter.
 */
function PocketAmount({ currency, budget, disabled, label, onCommit }: { currency: Currency; budget: number | undefined; disabled: boolean; label: string; onCommit: (amount: number) => void }) {
  const { lang } = useI18n();
  const [text, setText] = useState<string | null>(null);
  const { symbol, decimals } = amountFormat(currency, lang);
  const shown = text ?? (budget === undefined ? "" : amountToInput(budget, currency, lang));
  const commit = () => {
    if (text === null) return;
    const amount = parseAmount(text, currency, lang);
    setText(null);
    if (amount !== null) onCommit(amount);
  };
  return (
    <label className={cx("flex h-10 w-[160px] items-center gap-1.5 rounded-sm border bg-page px-3", disabled ? "border-line opacity-60" : "border-line focus-within:border-action")}>
      <span className="tt-small shrink-0 text-ink-2">{symbol}</span>
      <input
        aria-label={label}
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        autoComplete="off"
        disabled={disabled}
        value={shown}
        placeholder="0"
        onFocus={() => setText(shown)}
        onChange={(e) => setText(formatAmountInput(e.target.value, currency, lang))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="tt-body-strong min-w-0 flex-1 bg-transparent text-ink outline-none"
      />
    </label>
  );
}

/** The big number shrinks for long amounts ("Rp 1.500.000", "¥1,500,000") so it stays inside the card. */
function headlineSize(text: string): number {
  if (text.length <= 7) return 36;
  if (text.length <= 9) return 30;
  if (text.length <= 12) return 26;
  return 22;
}
