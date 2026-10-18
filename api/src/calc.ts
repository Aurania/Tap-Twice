// v2 calculation rules (docs: tap-twice-v2-handoff.md §8, decisions in docs/v2/PHASE0_AUDIT.md).
// Pure functions: no I/O, no clock, no currency conversion. Every amount is in the profile currency.
// The frontend only displays what the API returns from these; Gemini never does money math.

export const WEEKS_PER_MONTH = 52 / 12;

/** Round to cents. Keeps sums like 89.9 + 65.7 free of float noise. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export type RealityStatus = "healthy" | "not_healthy" | "pocket_empty";

/** income − expenses. Can be ≤ 0; callers use `hasRoomForPockets` to decide on N1. */
export function leftover(monthlyIncome: number, monthlyExpenses: number): number {
  return round2(monthlyIncome - monthlyExpenses);
}

/** N1 trigger: nothing left to split into pockets. */
export function hasRoomForPockets(monthlyIncome: number, monthlyExpenses: number): boolean {
  return leftover(monthlyIncome, monthlyExpenses) > 0;
}

/** Income per working hour. 0 when the inputs cannot produce a rate. */
export function hourlyRate(monthlyIncome: number, hoursPerDay: number, daysPerWeek: number): number {
  const hoursPerMonth = hoursPerDay * daysPerWeek * WEEKS_PER_MONTH;
  if (!(monthlyIncome > 0) || !(hoursPerMonth > 0)) return 0;
  return round2(monthlyIncome / hoursPerMonth);
}

/** Hours of work a price costs. Unrounded; use `displayWorkHours` for the hero number. */
export function workHours(price: number, rate: number): number {
  if (!(rate > 0) || !(price >= 0)) return 0;
  return price / rate;
}

/** Hero number: whole hours ("4.87 → 5"). TODO(design): amounts under 1 hour are not designed. */
export function displayWorkHours(hours: number): number {
  return Math.round(hours);
}

/** Share of monthly income a price takes, as a percentage with one decimal (89.90 / 3200 → 2.8). */
export function pctOfIncome(price: number, monthlyIncome: number): number {
  if (!(monthlyIncome > 0)) return 0;
  return Math.round((price / monthlyIncome) * 1000) / 10;
}

/** A pocket's monthly budget: its share of the leftover. */
export function pocketBudget(leftoverAmount: number, allocationPct: number): number {
  if (!(leftoverAmount > 0)) return 0;
  return round2((leftoverAmount * allocationPct) / 100);
}

/** Budget minus actual purchases in the pocket this month. Wishlist items do NOT reduce it. Never negative. */
export function pocketRemaining(budget: number, spentThisMonth: number): number {
  return Math.max(0, round2(budget - spentThisMonth));
}

/**
 * Reality card status.
 * - Pocket empty: nothing left (takes priority, also when the pocket is overspent).
 * - Not healthy: the price is more than what is left.
 * - Healthy: the price fits (equal counts as fitting).
 */
export function realityStatus(price: number, remaining: number): RealityStatus {
  if (!(remaining > 0)) return "pocket_empty";
  if (price > remaining) return "not_healthy";
  return "healthy";
}

/**
 * What is left in the pocket after buying, as a share of the pocket BUDGET, 0–100.
 * Figma "Fashion stays at 73% after this buy" / "$240.10 left of $330": (330 − 89.90) / 330 = 73.
 * Null when the pocket has no budget.
 */
export function remainingAfterPct(price: number, remaining: number, budget: number): number | null {
  if (!(budget > 0)) return null;
  return Math.max(0, Math.round(((remaining - price) / budget) * 100));
}

/** What is left in the pocket after buying. Negative when the price is more than what is left (Figma "Fashion left −$37.90"). */
export function remainingAfter(price: number, remaining: number): number {
  return round2(remaining - price);
}

/** How much a price goes over what is left in the pocket; 0 when it fits. */
export function overBy(price: number, remaining: number): number {
  return Math.max(0, round2(price - remaining));
}

const DAY_MS = 86_400_000;

/** First moment of next month, UTC. Pockets refill then. TODO: timezone (see store.ts). */
export function nextRefill(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** Whole days until the refill, rounded up ("Wait 14 days for the refill?" on Oct 18). */
export function daysUntilRefill(now: Date): number {
  return Math.ceil((nextRefill(now).getTime() - now.getTime()) / DAY_MS);
}

/**
 * Wishlist items in a pocket as a percentage of the pocket budget, rounded to a whole number.
 * Can exceed 100 (TODO(design): an over-100% pocket is not designed). Null when the budget is 0.
 */
export function pocketWishlistPct(wishlistTotal: number, budget: number): number | null {
  if (!(budget > 0)) return null;
  return Math.round((wishlistTotal / budget) * 100);
}

/** Overall wishlist as a percentage of all pocket budgets together (514.59 / 1,100 → 47). */
export function totalWishlistPct(wishlistTotals: number[], budgets: number[]): number | null {
  const budget = budgets.reduce((a, b) => a + b, 0);
  if (!(budget > 0)) return null;
  const wishlist = wishlistTotals.reduce((a, b) => a + b, 0);
  return Math.round((wishlist / budget) * 100);
}

/** One item's price as a percentage of its pocket budget (shown on each wishlist row). */
export function itemPocketPct(price: number, budget: number): number | null {
  return pocketWishlistPct(price, budget);
}

/** Sum of pocket allocation percentages. */
export function allocationTotal(pcts: number[]): number {
  return Math.round(pcts.reduce((a, b) => a + b, 0) * 100) / 100;
}

/** N2: the pockets must add up to exactly 100%. */
export function isAllocationValid(pcts: number[]): boolean {
  return pcts.length > 0 && pcts.every((p) => p >= 0) && allocationTotal(pcts) === 100;
}

/** How far over (positive) or under (negative) 100% the pockets are. 110% → 10. */
export function overAllocatedBy(pcts: number[]): number {
  return Math.round((allocationTotal(pcts) - 100) * 100) / 100;
}

/** Goal progress as a whole percentage (122.50 / 490 → 25). */
export function goalProgressPct(saved: number, target: number): number {
  if (!(target > 0)) return 0;
  return Math.max(0, Math.round((saved / target) * 100));
}

/** Home goal card: the percentage turns red below 50. */
export function goalTone(progressPct: number): "danger" | "neutral" {
  return progressPct < 50 ? "danger" : "neutral";
}

/** Decimals a currency uses in amounts: 0 for IDR and JPY, 2 for the rest of the supported ones. */
export function currencyDigits(currency: string): number {
  return currency === "IDR" || currency === "JPY" ? 0 : 2;
}

export interface PurchasePlan {
  /** First month the purchase hits a pocket, "YYYY-MM" (UTC). */
  startMonth: string;
  /** 1 for pay in full; the tenor for PayLater. */
  months: number;
  /** What leaves the pocket each month. */
  installment: number;
  /** One-time fee, charged in the first month on top of the installment. */
  adminFee: number;
}

const monthIndex = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return (y ?? 0) * 12 + ((m ?? 1) - 1);
};

/** "YYYY-MM" of a date, UTC. */
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * What a purchase takes from its pocket in a given month (`ym`, "YYYY-MM").
 * Pay in full: the whole price in its month. PayLater: one installment per month of the tenor, plus the one-time fee in the first.
 */
export function amountInMonth(plan: PurchasePlan, ym: string): number {
  const k = monthIndex(ym) - monthIndex(plan.startMonth);
  if (k < 0 || k >= plan.months) return 0;
  return round2(plan.installment + (k === 0 ? plan.adminFee : 0));
}
