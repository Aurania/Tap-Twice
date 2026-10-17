import { useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { formatIDR } from "@/lib/format";
import { draftTotal, useCartCheck, type CartRow } from "@/state/CartCheckProvider";
import { Button, Chip, MoneyField, Notice, ScreenHeader } from "@/ui";
import { parseRupiah, rupiahInput } from "@/lib/money";
import { AmountSheet, ItemSheet } from "./ItemSheets";
import { ScreenshotPicker } from "./ScreenshotPicker";

type Editing = { kind: "item"; row: CartRow } | { kind: "add" } | { kind: "shipping" } | { kind: "voucher" } | null;

/**
 * 04 Confirm items. Shows the rupiah values (`idr`), lets the user fix rows before any math,
 * and freezes the cart for the reality card. See BACKEND_GAPS.md #5 and #15.
 */
export function Confirm() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { extract, draft, updateRow, removeRow, addRow, updateDraft, confirm } = useCartCheck();
  const [editing, setEditing] = useState<Editing>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!extract || !draft) return <Navigate to="/home" replace />;

  const idrMissing = extract.idr === null;
  const source = extract.idr ?? extract.extraction;
  const total = draftTotal(draft, idrMissing);
  const tenor = source.installment?.tenor_months;
  const fx = extract.fx;
  const close = () => setEditing(null);

  const original = (value: number) =>
    new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", { style: "currency", currency: extract.extraction.currency }).format(value);

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <ScreenHeader title={t("check.header")} onBack={() => navigate("/home")} />
      <h1 className="tt-h1 mt-3">{t("confirm.title")}</h1>

      <section className="mt-4 flex items-center gap-4">
        <span aria-hidden className="flex h-16 w-16 shrink-0 flex-col justify-center gap-1.5 rounded-sm bg-inverse px-3">
          <span className="h-1 w-full rounded-pill bg-white/50" />
          <span className="h-1 w-4/5 rounded-pill bg-white/50" />
          <span className="h-1 w-full rounded-pill bg-white/50" />
          <span className="h-1 w-3/5 rounded-pill bg-highlight" />
        </span>
        <div className="min-w-0">
          <p className="tt-small text-ink-2">{t("confirm.total")}</p>
          <p className="tt-h1">{formatIDR(total)}</p>
          {fx && extract.extraction.total !== null && (
            <p className="tt-small text-ink-2">
              {original(extract.extraction.total)} ≈ {formatIDR(total)}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {tenor ? <Chip>{t("confirm.paylaterDetected", { n: tenor })}</Chip> : null}
            <button type="button" className="tt-link underline underline-offset-2" onClick={() => setPickerOpen(true)}>
              {t("confirm.rescan")}
            </button>
          </div>
        </div>
      </section>

      {fx && (
        <p className="tt-caption mt-3 text-ink-2">
          {t("confirm.fxRate", { currency: fx.currency, rate: formatIDR(fx.rateToIdr), date: fx.date })}
        </p>
      )}

      {idrMissing && (
        <div className="mt-4 space-y-3">
          <Notice title={t("confirm.noRateTitle", { currency: extract.extraction.currency })}>{t("confirm.noRateBody")}</Notice>
          <MoneyField
            label={t("confirm.typeTotal")}
            value={rupiahInput(draft.typedTotal)}
            onChange={(v) => updateDraft({ typedTotal: parseRupiah(v) })}
          />
        </div>
      )}

      <ul className="mt-5 overflow-hidden rounded-card border border-line">
        {draft.items.map((row) => (
          <Row
            key={row.id}
            label={row.quantity > 1 ? `${row.name} ${t("confirm.qty", { n: row.quantity })}` : row.name}
            amount={idrMissing ? null : formatIDR(row.unitPrice)}
            onEdit={idrMissing ? undefined : () => setEditing({ kind: "item", row })}
            editLabel={t("confirm.editAria", { name: row.name })}
          />
        ))}
        {!idrMissing && draft.shipping !== null && (
          <Row
            label={t("confirm.shipping")}
            amount={formatIDR(draft.shipping)}
            onEdit={() => setEditing({ kind: "shipping" })}
            editLabel={t("confirm.editAria", { name: t("confirm.shipping") })}
          />
        )}
        {!idrMissing && draft.discounts !== null && (
          <Row
            label={t("confirm.voucher")}
            amount={`−${formatIDR(draft.discounts)}`}
            onEdit={() => setEditing({ kind: "voucher" })}
            editLabel={t("confirm.editAria", { name: t("confirm.voucher") })}
          />
        )}
        {source.confidence === "low" && (
          <li className="tt-small bg-warning-bg px-4 py-3 text-warn" role="note">
            {t("confirm.lowConfidence")}
          </li>
        )}
      </ul>

      {!idrMissing && (
        <button type="button" className="tt-link mt-4 self-start underline underline-offset-2" onClick={() => setEditing({ kind: "add" })}>
          {t("confirm.addItem")}
        </button>
      )}

      <div className="mt-6">
        {total <= 0 && <p className="tt-small mb-2 text-center text-ink-2">{t("confirm.needTotal")}</p>}
        <Button
          disabled={total <= 0}
          onClick={() => {
            if (confirm()) navigate("/check/reality");
          }}
        >
          {t("confirm.looksRight")}
        </Button>
      </div>

      <ItemSheet
        open={editing?.kind === "item" || editing?.kind === "add"}
        mode={editing?.kind === "item" ? "edit" : "add"}
        initial={editing?.kind === "item" ? editing.row : undefined}
        onClose={close}
        onSave={(values) => {
          if (editing?.kind === "item") updateRow(editing.row.id, values);
          else addRow(values);
          close();
        }}
        onRemove={editing?.kind === "item" ? () => (removeRow(editing.row.id), close()) : undefined}
      />
      <AmountSheet
        open={editing?.kind === "shipping" || editing?.kind === "voucher"}
        label={t(editing?.kind === "voucher" ? "confirm.voucher" : "confirm.shipping")}
        initial={editing?.kind === "voucher" ? draft.discounts : draft.shipping}
        onClose={close}
        onSave={(value) => {
          updateDraft(editing?.kind === "voucher" ? { discounts: value } : { shipping: value });
          close();
        }}
      />
      <ScreenshotPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </main>
  );
}

function Row({ label, amount, onEdit, editLabel }: { label: ReactNode; amount: string | null; onEdit?: () => void; editLabel: string }) {
  const { t } = useI18n();
  return (
    <li className={cx("flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0")}>
      <span className="tt-body min-w-0 flex-1 break-words text-ink">{label}</span>
      {amount && <span className="tt-body-strong shrink-0 text-ink">{amount}</span>}
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label={editLabel} className="tt-link shrink-0 underline underline-offset-2">
          {t("confirm.edit")}
        </button>
      )}
    </li>
  );
}
