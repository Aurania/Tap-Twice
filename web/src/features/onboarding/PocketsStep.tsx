import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { parseAmount } from "@/lib/amount";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/lib/format";
import { BottomSheet, Button, PercentRing, pocketColor, pocketRingColor, PocketSlider, TextField } from "@/ui";
import { MAX_POCKETS, OnboardingHeader, OnboardingScreen, useOnboardingDraft } from "./OnboardingLayout";
import { useBudgetPreview } from "./useBudgetPreview";

/**
 * 01a-3 Pocket allocation. Sliders set each pocket's share of the leftover; every money amount and the
 * 100% check come from the server's preview. N2 (not 100%) turns the summary red and disables the button.
 */
export function PocketsStep() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { draft, update } = useOnboardingDraft();
  const [addOpen, setAddOpen] = useState(false);

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

  const setPct = (id: string, allocationPct: number) =>
    update({ pockets: draft.pockets.map((p) => (p.id === id ? { ...p, allocationPct } : p)) });
  const removePocket = (id: string) => update({ pockets: draft.pockets.filter((p) => p.id !== id) });

  const headline = !preview
    ? "–"
    : state === "ok"
      ? money(preview.leftover)
      : money(Math.abs(preview.overAllocatedAmount));

  return (
    <OnboardingScreen>
      <OnboardingHeader step={3} onBack={() => navigate("/onboarding/work")} />
      <h1 className="tt-h1 mt-4">{t("onboarding.pocketsTitle")}</h1>
      <p className="tt-body mt-2 text-ink-2">{t("onboarding.pocketsSub")}</p>

      <section className={cx("mt-4 flex items-center gap-4 rounded-card p-4 text-white", state === "over" ? "bg-danger" : "bg-action")}>
        <PercentRing
          size={84}
          label={`${pctTotal}%`}
          track="transparent"
          segments={state === "over" ? [{ pct: 100, color: "var(--tt-color-text-on-action)" }] : draft.pockets.map((p) => ({ pct: p.allocationPct, color: pocketRingColor(p.id) }))}
        >
          <span className="tt-body-strong text-white">{pctTotal}%</span>
        </PercentRing>
        <div className="min-w-0" aria-live="polite">
          <p className="tt-small text-white/80">{state === "over" ? t("onboarding.overAllocated") : t("onboarding.leftToAllocate")}</p>
          <p className="tt-hero leading-none break-words" style={{ fontSize: headlineSize(headline) }}>{headline}</p>
          <p className="tt-caption mt-1 text-white/80">
            {state === "over"
              ? t("onboarding.overAllocatedHelp", { pct: pctTotal })
              : state === "under"
                ? /* TODO(design): the under-100% state is not designed; reuses the blue card with this hint. */
                  t("onboarding.underAllocatedHelp", { pct: pctTotal })
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
                <span className="truncate">{p.name}</span>
              </span>
              <span className="tt-body-strong shrink-0 text-ink">
                {money(budgetOf(p.id))} · {p.allocationPct}%
              </span>
            </div>
            <div className="mt-3">
              <PocketSlider value={p.allocationPct} onChange={(v) => setPct(p.id, v)} color={pocketRingColor(p.id)} label={t("onboarding.pocketAlloc", { name: p.name })} />
            </div>
            {p.custom && (
              <button type="button" onClick={() => removePocket(p.id)} className="tt-caption mt-2 text-link underline">
                {/* TODO(design): removing a custom pocket is not designed; a plain text action so a mistake can be undone. */}
                {t("onboarding.pocketRemove", { name: p.name })}
              </button>
            )}
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

      <Button className="mt-5" disabled={!canContinue} onClick={() => navigate("/onboarding/goal")}>
        {state === "ok" ? t("onboarding.looksGood") : t("onboarding.fixAllocation")}
      </Button>

      <AddPocketSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        taken={draft.pockets.map((p) => p.name.toLowerCase())}
        onAdd={(name) => update({ pockets: [...draft.pockets, { id: `custom-${Date.now().toString(36)}`, name, allocationPct: 0, custom: true }] })}
      />
    </OnboardingScreen>
  );
}

/** The big number shrinks for long amounts ("Rp 1.500.000", "¥1,500,000") so it stays inside the card. */
function headlineSize(text: string): number {
  if (text.length <= 7) return 36;
  if (text.length <= 9) return 30;
  if (text.length <= 12) return 26;
  return 22;
}

/** TODO(design): custom pocket rules (empty, duplicate, limit) are not designed. Minimal: a name is required and unique, up to 12 pockets. */
function AddPocketSheet({ open, onClose, taken, onAdd }: { open: boolean; onClose: () => void; taken: string[]; onAdd: (name: string) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const duplicate = taken.includes(trimmed.toLowerCase());
  return (
    <BottomSheet open={open} onClose={onClose} title={t("onboarding.addPocketTitle")}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed || duplicate) return;
          onAdd(trimmed);
          setName("");
          onClose();
        }}
      >
        <TextField
          label={t("onboarding.pocketName")}
          placeholder={t("onboarding.pocketNamePlaceholder")}
          value={name}
          onChange={setName}
          maxLength={30}
          autoFocus
          tone={duplicate ? "danger" : "default"}
          helper={duplicate ? t("onboarding.pocketNameTaken") : undefined}
        />
        <Button type="submit" disabled={!trimmed || duplicate}>
          {t("onboarding.pocketAdd")}
        </Button>
      </form>
    </BottomSheet>
  );
}
