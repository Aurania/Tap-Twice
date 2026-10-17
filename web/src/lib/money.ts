/** Helpers for rupiah inputs. Parsing and display only, never money math. */

/** "1.513.000" or "Rp 1.513.000" → 1513000. Empty → null. */
export function parseRupiah(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}

/** 1513000 → "1.513.000" for an input with an "Rp" prefix. */
export function rupiahInput(value: number | null): string {
  if (value === null) return "";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

/** Keeps an input value formatted while typing ("1513" → "1.513"). */
export function reformatRupiahInput(raw: string): string {
  return rupiahInput(parseRupiah(raw));
}
