import type { Language } from "@/api";

const locale = (lang: Language) => (lang === "id" ? "id-ID" : "en-US");
const JAKARTA = "Asia/Jakarta";

/** "June 2027" / "Juni 2027" from "YYYY-MM-DD". */
export function formatMonthYear(isoDate: string, lang: Language): string {
  const [y, m] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(locale(lang), { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, 1)),
  );
}

/** Month name in Jakarta time, offset from now ("October", or next month "November"). */
export function monthName(lang: Language, offset = 0): string {
  const { year, month } = jakartaYearMonth(new Date());
  return new Intl.DateTimeFormat(locale(lang), { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month + offset, 1)));
}

function jakartaYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: JAKARTA, year: "numeric", month: "numeric" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month") - 1 };
}

/** True when an ISO timestamp falls in the current calendar month, Jakarta time (as the API counts it). */
export function isThisJakartaMonth(iso: string): boolean {
  const a = jakartaYearMonth(new Date(iso));
  const b = jakartaYearMonth(new Date());
  return a.year === b.year && a.month === b.month;
}

/** The next `count` months as goal dates: last day of each month, "YYYY-MM-DD". */
export function upcomingMonths(count: number): string[] {
  const { year, month } = jakartaYearMonth(new Date());
  return Array.from({ length: count }, (_, i) => {
    const last = new Date(Date.UTC(year, month + i + 2, 0)); // day 0 of the following month
    return last.toISOString().slice(0, 10);
  });
}

/** Days left on the one-week pause (BACKEND_GAPS.md #9). */
export function pauseDaysLeft(createdAt: string, now = Date.now()): number {
  const days = Math.floor((now - new Date(createdAt).getTime()) / 86_400_000);
  return Math.max(0, 7 - days);
}
