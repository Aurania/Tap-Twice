// Turns a "Log it" request into the plan that is stored, and reads the stored plans back into "this month".
// Pure: the route and the store only call these.

import { amountInMonth, currencyDigits, monthKey, type PurchasePlan } from "./calc.js";
import { impliedMonthlyRatePct, paylaterCost, type PaylaterResult } from "./cost.js";
import type { PaylaterInput } from "./schemas.js";

export interface PaylaterQuote extends PaylaterResult {
  /** The flat monthly rate the numbers use (given, or worked out from the monthly payment). */
  monthlyRatePct: number;
  adminFee: number;
}

/** PayLater numbers for a price. A monthly payment typed from the user's app becomes a rate (the one place that is derived). */
export function quotePaylater(price: number, input: PaylaterInput, currency: string): PaylaterQuote {
  const rate = input.monthlyRatePct ?? impliedMonthlyRatePct(price, input.monthlyPayment ?? 0, input.tenorMonths);
  const adminFee = input.adminFee ?? 0;
  const result = paylaterCost(price, { tenorMonths: input.tenorMonths, monthlyRatePct: rate, adminFee, lateFee: input.lateFee }, currencyDigits(currency));
  return { ...result, monthlyRatePct: rate, adminFee };
}

export interface PurchaseDoc extends PurchasePlan {
  name: string;
  pocketId: string;
  /** What was paid in total, for the record. */
  totalPaid: number;
}

/** The plan to store: one month for pay in full, the tenor for PayLater. */
export function planPurchase(req: { name: string; price: number; pocketId: string; paylater?: PaylaterInput | null }, currency: string, now = new Date()): PurchaseDoc {
  const base = { name: req.name, pocketId: req.pocketId, startMonth: monthKey(now) };
  if (!req.paylater) return { ...base, months: 1, installment: req.price, adminFee: 0, totalPaid: req.price };
  const q = quotePaylater(req.price, req.paylater, currency);
  return { ...base, months: q.tenorMonths, installment: q.monthlyInstallment, adminFee: q.adminFee, totalPaid: q.totalPaid };
}

/** The amounts this month takes from each pocket, from every stored purchase. */
export function purchasesThisMonth(docs: (PurchasePlan & { pocketId: string })[], now = new Date()): { amount: number; pocketId: string }[] {
  const ym = monthKey(now);
  return docs.map((d) => ({ amount: amountInMonth(d, ym), pocketId: d.pocketId })).filter((p) => p.amount > 0);
}
