import type { Language } from "@/api";

// Formatting only. Every money value comes from the API (web/CLAUDE.md rule 1).

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const idrSigned = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});
const idrCompact = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 2,
});

/** "Rp 451.000" */
export const formatIDR = (value: number): string => idr.format(value);

/** "+Rp 13.910" / "-Rp 65.700" (stat cards) */
export const formatIDRSigned = (value: number): string => idrSigned.format(value);

/** "Rp 1,06 jt" for tight spaces such as stat cards. */
export const formatIDRCompact = (value: number): string => idrCompact.format(value);

/** Hours, days: "44,5" in Indonesian, "44.5" in English. */
export function formatDecimal(value: number, lang: Language, maxFractionDigits = 1): string {
  return new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/** Hero number on the reality card: whole hours from 10 up, else 1 decimal (BACKEND_GAPS.md #20). */
export const formatHours = (hours: number, lang: Language): string =>
  formatDecimal(hours, lang, hours >= 10 ? 0 : 1);

/** Whole days (BACKEND_GAPS.md #20). */
export const formatDays = (days: number, lang: Language): string => formatDecimal(Math.round(days), lang, 0);

/** "$89.90", "Rp 90.000", "¥9,000": any profile currency, display only. */
export function formatMoney(value: number, currency: string, lang: Language): string {
  return new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", { style: "currency", currency }).format(value);
}
