// Builds the numbers the app displays (Home, Wishlist, Reality card) from stored data.
// Pure: composes calc.ts, no I/O. The frontend only renders these results.

import {
  displayWorkHours,
  goalProgressPct,
  goalTone,
  hourlyRate,
  itemPocketPct,
  leftover,
  pctOfIncome,
  pocketBudget,
  pocketRemaining,
  pocketWishlistPct,
  realityStatus,
  remainingAfter,
  remainingAfterPct,
  round2,
  totalWishlistPct,
  workHours,
  type RealityStatus,
} from "./calc.js";
import type { CheckRequest, Profile } from "./schemas.js";

export interface StoredWishlistItem {
  id: string;
  name: string;
  price: number;
  pocketId: string;
  createdAt: string | null;
}

export interface StoredPurchase {
  amount: number;
  pocketId: string;
}

export interface PocketSummary {
  id: string;
  name: string;
  allocationPct: number;
  budget: number;
  spent: number;
  remaining: number;
  wishlistTotal: number;
  /** Wishlist as a % of the pocket budget; null when the pocket has no budget. */
  wishlistPct: number | null;
  wishlistCount: number;
}

export interface WishlistItemSummary extends StoredWishlistItem {
  /** Price as a % of its pocket budget. */
  pocketPct: number | null;
  workHours: number;
}

export interface Summary {
  currency: Profile["currency"];
  hourlyRate: number;
  leftover: number;
  goal: Profile["goal"] & { progressPct: number; tone: "danger" | "neutral" };
  pockets: PocketSummary[];
  wishlist: { total: number; pct: number | null; items: WishlistItemSummary[] };
}

const sumFor = <T extends { pocketId: string }>(rows: T[], pocketId: string, pick: (r: T) => number) =>
  round2(rows.filter((r) => r.pocketId === pocketId).reduce((s, r) => s + pick(r), 0));

const rateFor = (profile: Profile) => hourlyRate(profile.monthlyIncome, profile.hoursPerDay, profile.workDays.length);

export function buildPockets(profile: Profile, wishlist: StoredWishlistItem[], purchases: StoredPurchase[]): PocketSummary[] {
  const left = leftover(profile.monthlyIncome, profile.monthlyExpenses);
  return profile.pockets.map((p) => {
    const budget = pocketBudget(left, p.allocationPct);
    const spent = sumFor(purchases, p.id, (r) => r.amount);
    const wishlistTotal = sumFor(wishlist, p.id, (r) => r.price);
    return {
      id: p.id,
      name: p.name,
      allocationPct: p.allocationPct,
      budget,
      spent,
      remaining: pocketRemaining(budget, spent),
      wishlistTotal,
      wishlistPct: pocketWishlistPct(wishlistTotal, budget),
      wishlistCount: wishlist.filter((w) => w.pocketId === p.id).length,
    };
  });
}

export function buildSummary(profile: Profile, wishlist: StoredWishlistItem[], purchases: StoredPurchase[]): Summary {
  const rate = rateFor(profile);
  const pockets = buildPockets(profile, wishlist, purchases);
  const budgetOf = new Map(pockets.map((p) => [p.id, p.budget]));
  const progressPct = goalProgressPct(profile.goal.savedAmount, profile.goal.targetAmount);
  return {
    currency: profile.currency,
    hourlyRate: rate,
    leftover: leftover(profile.monthlyIncome, profile.monthlyExpenses),
    goal: { ...profile.goal, progressPct, tone: goalTone(progressPct) },
    pockets,
    wishlist: {
      total: round2(wishlist.reduce((s, w) => s + w.price, 0)),
      pct: totalWishlistPct(
        pockets.map((p) => p.wishlistTotal),
        pockets.map((p) => p.budget),
      ),
      items: wishlist.map((w) => ({
        ...w,
        pocketPct: itemPocketPct(w.price, budgetOf.get(w.pocketId) ?? 0),
        workHours: displayWorkHours(workHours(w.price, rate)),
      })),
    },
  };
}

export interface Reality {
  status: RealityStatus;
  hourlyRate: number;
  /** Exact hours, two decimals (4.87). */
  workHours: number;
  /** Whole hours for the hero number (5). */
  displayWorkHours: number;
  pctOfIncome: number;
  pocket: { id: string; name: string; budget: number; remaining: number };
  remainingAfter: number;
  /** Left in the pocket after buying, as a % of its budget (the bar). */
  remainingAfterPct: number | null;
  /** The same product (by name) already sits on the wishlist: N10. */
  duplicateOf: string | null;
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Null when the pocket does not exist. */
export function buildReality(profile: Profile, wishlist: StoredWishlistItem[], purchases: StoredPurchase[], req: CheckRequest): Reality | null {
  const pocket = buildPockets(profile, wishlist, purchases).find((p) => p.id === req.pocketId);
  if (!pocket) return null;
  const rate = rateFor(profile);
  const hours = workHours(req.price, rate);
  const duplicate = wishlist.find((w) => w.pocketId === req.pocketId && normalize(w.name) === normalize(req.name));
  return {
    status: realityStatus(req.price, pocket.remaining),
    hourlyRate: rate,
    workHours: round2(hours),
    displayWorkHours: displayWorkHours(hours),
    pctOfIncome: pctOfIncome(req.price, profile.monthlyIncome),
    pocket: { id: pocket.id, name: pocket.name, budget: pocket.budget, remaining: pocket.remaining },
    remainingAfter: remainingAfter(req.price, pocket.remaining),
    remainingAfterPct: remainingAfterPct(req.price, pocket.remaining, pocket.budget),
    duplicateOf: duplicate?.id ?? null,
  };
}
