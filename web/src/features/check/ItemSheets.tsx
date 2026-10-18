import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { parseRupiah, rupiahInput } from "@/lib/money";
import { BottomSheet, Button, MoneyField, TextField } from "@/ui";

export type ItemValues = { name: string; quantity: number; unitPrice: number };

type ItemSheetProps = {
  open: boolean;
  mode: "edit" | "add";
  initial?: ItemValues;
  onClose: () => void;
  onSave: (values: ItemValues) => void;
  onRemove?: () => void;
};

/** 04b Edit item / 04c Add item. */
export function ItemSheet({ open, mode, initial, onClose, onSave, onRemove }: ItemSheetProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setPrice(initial ? rupiahInput(initial.unitPrice) : "");
    setQty(String(initial?.quantity ?? 1));
  }, [open, initial]);

  const unitPrice = parseRupiah(price);
  const quantity = Number(qty);
  const valid = name.trim().length > 0 && unitPrice !== null && quantity >= 1;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t(mode === "edit" ? "item.editTitle" : "item.addTitle")}
      description={t(mode === "edit" ? "item.editBody" : "item.addBody")}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave({ name: name.trim(), unitPrice: unitPrice!, quantity: Math.round(quantity) });
        }}
      >
        <TextField label={t("item.name")} value={name} onChange={setName} placeholder={t("item.namePlaceholder")} maxLength={200} />
        <div className="grid grid-cols-[1fr_110px] gap-2.5">
          <MoneyField label={t("item.price")} value={price} onChange={setPrice} placeholder="0" />
          <TextField label={t("item.quantity")} inputMode="numeric" value={qty} onChange={(v) => setQty(v.replace(/\D/g, "").slice(0, 3))} />
        </div>
        <Button type="submit" disabled={!valid}>
          {t(mode === "edit" ? "item.save" : "item.add")}
        </Button>
        {mode === "edit" && onRemove ? (
          <button type="button" onClick={onRemove} className="tt-link mx-auto block py-1 !text-warn underline underline-offset-2">
            {t("item.remove")}
          </button>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        )}
      </form>
    </BottomSheet>
  );
}

type AmountSheetProps = {
  open: boolean;
  label: string;
  initial: number | null;
  onClose: () => void;
  onSave: (value: number | null) => void;
};

/** Edit the shipping or voucher row: one amount, or remove it. */
export function AmountSheet({ open, label, initial, onClose, onSave }: AmountSheetProps) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  useEffect(() => {
    if (open) setValue(rupiahInput(initial));
  }, [open, initial]);

  return (
    <BottomSheet open={open} onClose={onClose} title={t("item.amountTitle", { label })} description={t("item.editBody")}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(parseRupiah(value));
        }}
      >
        <MoneyField label={label} value={value} onChange={setValue} placeholder="0" />
        <Button type="submit">{t("item.save")}</Button>
        <button type="button" onClick={() => onSave(null)} className="tt-link mx-auto block py-1 !text-warn underline underline-offset-2">
          {t("item.remove")}
        </button>
      </form>
    </BottomSheet>
  );
}
