import { describe, expect, it } from "vitest";
import { amountInMonth, currencyDigits, monthKey } from "./calc.js";
import { planPurchase, purchasesThisMonth, quotePaylater } from "./purchase.js";
import { ProfileSchema, PurchaseSchema, PaylaterCostRequestSchema, type Profile } from "./schemas.js";
import { seedPockets, seedProfile } from "./seed.js";
import { buildReality } from "./summary.js";

const oct = new Date("2026-10-18T12:00:00Z");
const profile: Profile = { ...seedProfile, workDays: [...seedProfile.workDays], pockets: seedPockets.map(({ id, name, allocationPct }) => ({ id, name, allocationPct })) };

describe("currencyDigits and monthKey", () => {
  it("IDR and JPY have no cents", () => {
    expect(currencyDigits("IDR")).toBe(0);
    expect(currencyDigits("JPY")).toBe(0);
    expect(currencyDigits("USD")).toBe(2);
  });
  it("is the UTC month", () => {
    expect(monthKey(oct)).toBe("2026-10");
    expect(monthKey(new Date("2026-12-31T23:59:00Z"))).toBe("2026-12");
  });
});

describe("amountInMonth", () => {
  const plan = { startMonth: "2026-10", months: 3, installment: 30, adminFee: 5 };
  it("is 0 before it starts and after the tenor", () => {
    expect(amountInMonth(plan, "2026-09")).toBe(0);
    expect(amountInMonth(plan, "2027-01")).toBe(0);
  });
  it("takes the installment each month, and the one-time fee in the first", () => {
    expect([amountInMonth(plan, "2026-10"), amountInMonth(plan, "2026-11"), amountInMonth(plan, "2026-12")]).toEqual([35, 30, 30]);
  });
  it("crosses the year end", () => {
    expect(amountInMonth({ ...plan, startMonth: "2026-12" }, "2027-01")).toBe(30);
  });
});

describe("quotePaylater", () => {
  it("$89.90 over 3 months at 2%/mo with $1.50 fee, in cents", () => {
    const q = quotePaylater(89.9, { tenorMonths: 3, monthlyRatePct: 2, adminFee: 1.5 }, "USD");
    expect(q).toMatchObject({ monthlyInstallment: 31.76, totalPaid: 96.79, extraCost: 6.89, monthlyRatePct: 2, adminFee: 1.5 });
  });
  it("works the rate out from a typed monthly payment", () => {
    // price 450,000, 6 months, 88,275 a month → 2.95%/mo
    const q = quotePaylater(450_000, { tenorMonths: 6, monthlyPayment: 88_275, adminFee: 0 }, "IDR");
    expect(q.monthlyRatePct).toBe(2.95);
    expect(q.monthlyInstallment).toBe(88_275);
  });
  it("rounds to whole units in IDR", () => {
    expect(quotePaylater(450_000, { tenorMonths: 6, monthlyRatePct: 2.95, adminFee: 0 }, "IDR").totalPaid).toBe(529_650);
  });
});

describe("planPurchase", () => {
  it("pay in full is one month at the full price", () => {
    expect(planPurchase({ name: "Shoes", price: 89.9, pocketId: "fashion" }, "USD", oct)).toMatchObject({ startMonth: "2026-10", months: 1, installment: 89.9, adminFee: 0, totalPaid: 89.9 });
  });
  it("PayLater is the tenor, the installment and the fee", () => {
    const doc = planPurchase({ name: "Shoes", price: 89.9, pocketId: "fashion", paylater: { tenorMonths: 3, monthlyRatePct: 2, adminFee: 1.5 } }, "USD", oct);
    expect(doc).toMatchObject({ months: 3, installment: 31.76, adminFee: 1.5, totalPaid: 96.79 });
  });
});

describe("purchases reduce the pocket month by month (option A)", () => {
  const doc = planPurchase({ name: "Coat", price: 300, pocketId: "fashion", paylater: { tenorMonths: 3, monthlyRatePct: 0, adminFee: 0 } }, "USD", oct);
  const check = { name: "NB", price: 89.9, pocketId: "fashion" };
  it("this month, a $100 installment leaves $230 in Fashion", () => {
    const r = buildReality(profile, [], purchasesThisMonth([doc], oct), check, oct)!;
    expect(r.pocket.remaining).toBe(230);
  });
  it("it takes $100 in each of the three months, then it is gone", () => {
    const left = (d: string) => buildReality(profile, [], purchasesThisMonth([doc], new Date(d)), check)!.pocket.remaining;
    expect([left("2026-10-20T00:00:00Z"), left("2026-11-20T00:00:00Z"), left("2026-12-20T00:00:00Z")]).toEqual([230, 230, 230]);
    expect(left("2027-01-20T00:00:00Z")).toBe(330);
  });
  it("pay in full takes all of it this month only", () => {
    const full = planPurchase({ name: "Coat", price: 278, pocketId: "fashion" }, "USD", oct);
    expect(buildReality(profile, [], purchasesThisMonth([full], oct), check, oct)!.status).toBe("not_healthy"); // 52 left
    expect(buildReality(profile, [], purchasesThisMonth([full], new Date("2026-11-02T00:00:00Z")), check)!.status).toBe("healthy");
  });
});

describe("request schemas", () => {
  it("a PayLater needs a rate or a monthly payment", () => {
    expect(PaylaterCostRequestSchema.safeParse({ price: 100, paylater: { tenorMonths: 6 } }).success).toBe(false);
    expect(PaylaterCostRequestSchema.safeParse({ price: 100, paylater: { tenorMonths: 6, monthlyRatePct: 2 } }).success).toBe(true);
    expect(PaylaterCostRequestSchema.safeParse({ price: 100, paylater: { tenorMonths: 6, monthlyPayment: 20 } }).success).toBe(true);
  });
  it("a purchase is a price in a pocket, optionally from a wishlist item and a plan", () => {
    expect(PurchaseSchema.safeParse({ name: "x", price: 5, pocketId: "fashion" }).success).toBe(true);
    expect(PurchaseSchema.safeParse({ name: "x", price: -5, pocketId: "fashion" }).success).toBe(false);
    expect(PurchaseSchema.safeParse({ name: "x", price: 5, pocketId: "fashion", wishlistId: "w1", paylater: { tenorMonths: 3, monthlyRatePct: 2 } }).success).toBe(true);
  });
  it("the seed profile is still valid", () => {
    expect(ProfileSchema.safeParse(profile).success).toBe(true);
  });
});
