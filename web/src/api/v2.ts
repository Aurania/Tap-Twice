/**
 * v2 API: profile with pockets, wishlist per pocket, purchases, and the server-computed numbers
 * (summary for Home/Wishlist, check for the Reality card). Mirrors api/src/schemas.ts and summary.ts.
 * The frontend only displays these numbers (web/CLAUDE.md rule 1).
 */
import { request, send } from "./client";
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
  emoji: string | null;
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
  /** Pocket with the most left this month; null when all are used up. */
  roomiestPocketId: string | null;
  wishlist: { total: number; pct: number | null; items: WishlistItemV2[] };
};

export type Reality = {
  status: RealityStatus;
  hourlyRate: number;
  workHours: number;
  displayWorkHours: number;
  pctOfIncome: number;
  pocket: { id: string; name: string; budget: number; remaining: number };
  /** "Fashion left" stat: after buying; negative when over; 0 when the pocket was already empty. */
  remainingAfter: number;
  remainingAfterPct: number | null;
  /**
   * Fits, but leaves the pocket under 20% of its budget for the rest of the month (api calc.ts LOW_POCKET_PCT).
   * Optional until the API that sends it is deployed.
   */
  lowAfter?: boolean;
  overBy: number;
  /** First day of next month, "YYYY-MM-DD". */
  refillDate: string;
  daysUntilRefill: number;
  /** Id of the same product already in this pocket's wishlist (N10), and when it was added. */
  duplicateOf: string | null;
  duplicateAddedAt: string | null;
};

export type BudgetPreviewInput = { monthlyIncome: number; monthlyExpenses: number; pockets: { id: string; allocationPct: number }[] };

export type BudgetPreview = {
  leftover: number;
  hasRoom: boolean;
  expensesOverBy: number;
  allocationTotal: number;
  valid: boolean;
  overAllocatedBy: number;
  overAllocatedAmount: number;
  budgets: { id: string; budget: number }[];
};

export type CheckInput = { name: string; price: number; pocketId: string };
export type NewWishlistItemV2 = { name: string; price: number; pocketId: string; emoji?: string };
/** PayLater terms: give the monthly rate, or the monthly payment from the user's app (the server works the rate out). */
export type PaylaterTerms = { tenorMonths: number; monthlyRatePct?: number; monthlyPayment?: number; adminFee: number };

/** The server's numbers for one PayLater plan. */
export type PaylaterQuote = {
  tenorMonths: number;
  monthlyInstallment: number;
  totalPaid: number;
  extraCost: number;
  extraCostPct: number;
  lateFee: number | null;
  monthlyRatePct: number;
  adminFee: number;
};

/** "Log it": pay in full, or with PayLater. A wishlist item given by id is removed. */
export type NewPurchase = { name: string; price: number; pocketId: string; wishlistId?: string; paylater?: PaylaterTerms | null };

/** One function per v2 endpoint. 409 `no_profile` goes through the shared client handler. */
export const apiV2 = {
  getProfile: () => request<{ profile: ProfileV2 | null }>("GET", "/api/profile"),
  putProfile: (profile: ProfileV2) => request<{ profile: ProfileV2 }>("PUT", "/api/profile", profile),
  deleteMe: () => request<{ ok: true }>("DELETE", "/api/me"),

  /** Onboarding sliders: money amounts for a draft, before any profile exists. */
  previewBudget: (input: BudgetPreviewInput, signal?: AbortSignal) => send("POST", "/api/preview/budget", input, signal).then((r) => r.json() as Promise<{ preview: BudgetPreview }>),

  getSummary: () => request<{ summary: Summary }>("GET", "/api/summary"),
  check: (input: CheckInput) => request<{ reality: Reality }>("POST", "/api/check", input),

  addWishlist: (item: NewWishlistItemV2) => request<{ id: string }>("POST", "/api/wishlist", item),
  removeWishlist: (id: string) => request<{ ok: true }>("DELETE", `/api/wishlist/${encodeURIComponent(id)}`),
  addPurchase: (purchase: NewPurchase) => request<{ id: string }>("POST", "/api/purchases", purchase),
  paylaterCost: (price: number, paylater: PaylaterTerms) => request<{ plan: PaylaterQuote }>("POST", "/api/paylater/cost", { price, paylater }),
};
