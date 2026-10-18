import { z } from "zod";
import { allocationTotal, hasRoomForPockets, isAllocationValid } from "./calc.js";

const money = z.number().finite().min(0);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const LanguageSchema = z.enum(["en", "id"]);
export type Language = z.infer<typeof LanguageSchema>;

/** Currencies in the onboarding picker (Figma 01a-s). All amounts are in the profile currency. */
export const CURRENCIES = ["USD", "IDR", "INR", "SGD", "EUR", "GBP", "JPY", "AUD"] as const;
export const CurrencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof CurrencySchema>;

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const PocketSchema = z.object({
  /** Stable id: built-in ("fashion"…) or generated for a custom pocket. */
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(30),
  allocationPct: z.number().finite().min(0).max(100),
});
export type Pocket = z.infer<typeof PocketSchema>;

export const GoalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  targetAmount: z.number().finite().positive(),
  savedAmount: money,
  targetDate: isoDate,
});

export const ProfileSchema = z
  .object({
    nickname: z.string().trim().max(40).optional(),
    currency: CurrencySchema,
    monthlyIncome: z.number().finite().positive(),
    monthlyExpenses: money,
    workDays: z.array(z.enum(WEEKDAYS)).min(1).max(7),
    hoursPerDay: z.number().int().min(1).max(24),
    pockets: z.array(PocketSchema).min(1).max(12),
    goal: GoalSchema,
    language: LanguageSchema,
  })
  .superRefine((p, ctx) => {
    // N1: nothing left to split into pockets.
    if (!hasRoomForPockets(p.monthlyIncome, p.monthlyExpenses)) {
      ctx.addIssue({ code: "custom", path: ["monthlyExpenses"], message: "expenses_exceed_income" });
    }
    // N2: pockets must add up to exactly 100%.
    if (!isAllocationValid(p.pockets.map((x) => x.allocationPct))) {
      ctx.addIssue({ code: "custom", path: ["pockets"], message: `allocation_not_100:${allocationTotal(p.pockets.map((x) => x.allocationPct))}` });
    }
    if (new Set(p.workDays).size !== p.workDays.length) {
      ctx.addIssue({ code: "custom", path: ["workDays"], message: "duplicate_work_days" });
    }
    const ids = p.pockets.map((x) => x.id);
    const names = p.pockets.map((x) => x.name.toLowerCase());
    if (new Set(ids).size !== ids.length || new Set(names).size !== names.length) {
      ctx.addIssue({ code: "custom", path: ["pockets"], message: "duplicate_pockets" });
    }
  });
export type Profile = z.infer<typeof ProfileSchema>;

export const PaylaterSchema = z.object({
  tenorMonths: z.number().int().min(1).max(36),
  monthlyRatePct: z.number().finite().min(0).max(20),
  adminFee: money,
  lateFee: money.optional(),
});

export const WishlistItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  price: z.number().finite().positive(),
  pocketId: z.string().trim().min(1).max(40),
});
export type WishlistItemInput = z.infer<typeof WishlistItemSchema>;

/** A purchase that was actually made. Pocket remaining = budget − these (wishlist does not count). */
export const PurchaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.number().finite().positive(),
  pocketId: z.string().trim().min(1).max(40),
});
export type PurchaseInput = z.infer<typeof PurchaseSchema>;

/** Reality card request: a checked product against one pocket. */
export const CheckRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  price: z.number().finite().positive(),
  pocketId: z.string().trim().min(1).max(40),
});
export type CheckRequest = z.infer<typeof CheckRequestSchema>;
