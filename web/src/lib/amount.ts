import type { Currency, Language } from "@/api";

/** Input helpers for currency amounts: parsing what the user types and showing it back. Never money math. */

type AmountFormat = { symbol: string; decimals: number; group: string; decimal: string };

const locale = (lang: Language) => (lang === "id" ? "id-ID" : "en-US");

export function amountFormat(currency: Currency, lang: Language): AmountFormat {
  const nf = new Intl.NumberFormat(locale(lang), { style: "currency", currency, currencyDisplay: "narrowSymbol" });
  const parts = nf.formatToParts(12345.6);
  const decimals = nf.resolvedOptions().maximumFractionDigits ?? 2;
  const plain = new Intl.NumberFormat(locale(lang)).formatToParts(12345.6);
  return {
    symbol: parts.find((p) => p.type === "currency")?.value ?? currency,
    decimals,
    group: parts.find((p) => p.type === "group")?.value ?? ",",
    decimal: plain.find((p) => p.type === "decimal")?.value ?? ".",
  };
}

/** Keeps an input formatted while typing: "3200" → "3,200", "122.5" → "122.5". Extra decimals are dropped. */
export function formatAmountInput(raw: string, currency: Currency, lang: Language): string {
  const { decimals, group, decimal } = amountFormat(currency, lang);
  const hasDecimal = decimals > 0 && raw.includes(decimal);
  const [intPart = "", ...rest] = raw.split(decimal);
  const intDigits = intPart.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const fraction = rest.join("").replace(/\D/g, "").slice(0, decimals);
  if (!intDigits && !hasDecimal) return "";
  const grouped = (intDigits || "0").replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return hasDecimal ? `${grouped}${decimal}${fraction}` : grouped;
}

/** "3,200" → 3200, "122.50" → 122.5. Empty or unparseable → null. */
export function parseAmount(input: string, currency: Currency, lang: Language): number | null {
  const { group, decimal } = amountFormat(currency, lang);
  const normalized = input.split(group).join("").replace(decimal, ".");
  if (!/^\d+(\.\d*)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** A stored number back into an input string: 122.5 → "122.5", 3200 → "3,200". */
export function amountToInput(value: number, currency: Currency, lang: Language): string {
  const { decimals } = amountFormat(currency, lang);
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: decimals }).format(value);
}
