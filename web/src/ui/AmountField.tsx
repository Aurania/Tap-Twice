import type { ComponentProps } from "react";
import type { Currency } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { amountFormat, formatAmountInput } from "@/lib/amount";
import { TextField } from "./TextField";

type Props = Omit<ComponentProps<typeof TextField>, "prefix" | "inputMode" | "onChange"> & {
  currency: Currency;
  onChange: (value: string) => void;
};

/** Money input in the profile currency: symbol prefix, thousands separators while typing, decimals where the currency has them. */
export function AmountField({ currency, onChange, ...rest }: Props) {
  const { lang } = useI18n();
  const { symbol, decimals } = amountFormat(currency, lang);
  return (
    <TextField
      prefix={symbol}
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      autoComplete="off"
      onChange={(raw) => onChange(formatAmountInput(raw, currency, lang))}
      {...rest}
    />
  );
}
