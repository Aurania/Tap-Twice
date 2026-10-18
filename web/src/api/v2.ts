/**
 * v2 API: profile with pockets, wishlist per pocket, purchases, and the server-computed numbers
 * (summary for Home/Wishlist, check for the Reality card). Mirrors api/src/schemas.ts and summary.ts.
 * The frontend only displays these numbers (web/CLAUDE.md rule 1).
 *
 * This sits beside the v1 `api/` module until the v1 screens are replaced (phases 4–7); then it takes over `index.ts`.
 */
import { request } from "./client";
import type { Language } from "./types";

export const CURRENCIES = ["USD", "IDR", "INR", "SGD", "EUR", "GBP", "JPY", "AUD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type PocketInput = { id: string; name: string; allocationPct: number };

export type GoalV2 = { name: string; targetAmount: number; savedAmount: number; targetDate: string };

export type ProfileV2 = {
  nickname?: string;
  currency: Currency;
  monthlyIncome: number;
  monthlyExpenses: number;
  workDays: Weekday[];
  hoursPerDay: number;
  pockets: PocketInput[];
  goal: GoalV2;
  language: Language;
};

export type RealityStatus = "healthy" | "not_healthy" | "pocket_empty";

export type PocketSummary = {
  id: string;
  name: string;
  allocationPct: number;
  budget: number;
  spent: number;
  remaining: number;
  wishlistTotal: number;
  wishlistPct: number | null;
  wishlistCount: number;
};

export type WishlistItemV2 = {
  id: string;
  name: string;
  price: number;
  pocketId: string;
  createdAt: string | null;
  pocketPct: number | null;
  workHours: number;
};

export type Summary = {
  currency: Currency;
  hourlyRate: number;
  leftover: number;
  goal: GoalV2 & { progressPct: number; tone: "danger" | "neutral" };
  pockets: PocketSummary[];
  wishlist: { total: number; pct: number | null; items: WishlistItemV2[] };
};

export type Reality = {
  status: RealityStatus;
  hourlyRate: number;
  workHours: number;
  displayWorkHours: number;
  pctOfIncome: number;
  pocket: { id: string; name: string; budget: number; remaining: number };
  remainingAfter: number;
  remainingAfterPct: number | null;
  /** Id of the same product already on the wishlist (N10). */
  duplicateOf: string | null;
};

export type CheckInput = { name: string; price: number; pocketId: string };
export type NewWishlistItemV2 = { name: string; price: number; pocketId: string };
export type NewPurchase = { name: string; amount: number; pocketId: string };

/** One function per v2 endpoint. 409 `no_profile` goes through the shared client handler. */
export const apiV2 = {
  getProfile: () => request<{ profile: ProfileV2 | null }>("GET", "/api/profile"),
  putProfile: (profile: ProfileV2) => request<{ profile: ProfileV2 }>("PUT", "/api/profile", profile),
  deleteMe: () => request<{ ok: true }>("DELETE", "/api/me"),

  getSummary: () => request<{ summary: Summary }>("GET", "/api/summary"),
  check: (input: CheckInput) => request<{ reality: Reality }>("POST", "/api/check", input),

  addWishlist: (item: NewWishlistItemV2) => request<{ id: string }>("POST", "/api/wishlist", item),
  removeWishlist: (id: string) => request<{ ok: true }>("DELETE", `/api/wishlist/${encodeURIComponent(id)}`),
  addPurchase: (purchase: NewPurchase) => request<{ id: string }>("POST", "/api/purchases", purchase),
};
