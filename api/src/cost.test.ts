import { describe, expect, it } from "vitest";
import { impliedMonthlyRatePct, paylaterCost } from "./cost.js";

// Five reference scenarios. Expected values are worked by hand with the PRD formula:
// installment = price / tenor + price * rate; total = installment * tenor + admin.
describe("paylaterCost reference cases", () => {
  const cases = [
    { price: 450_000, tenor: 6, rate: 2.95, admin: 0, installment: 88_275, total: 529_650, extra: 79_650, pct: 17.7 },
    { price: 1_200_000, tenor: 3, rate: 0, admin: 12_000, installment: 400_000, total: 1_212_000, extra: 12_000, pct: 1 },
    { price: 1_000_000, tenor: 12, rate: 2.5, admin: 10_000, installment: 108_333, total: 1_310_000, extra: 310_000, pct: 31 },
    { price: 299_000, tenor: 1, rate: 0, admin: 0, installment: 299_000, total: 299_000, extra: 0, pct: 0 },
    { price: 2_500_000, tenor: 6, rate: 3.5, admin: 25_000, installment: 504_167, total: 3_050_000, extra: 550_000, pct: 22 },
  ];
  for (const c of cases) {
    it(`Rp${c.price} over ${c.tenor} months at ${c.rate}%`, () => {
      const r = paylaterCost(c.price, { tenorMonths: c.tenor, monthlyRatePct: c.rate, adminFee: c.admin });
      expect(r.monthlyInstallment).toBe(c.installment);
      expect(r.totalPaid).toBe(c.total);
      expect(r.extraCost).toBe(c.extra);
      expect(r.extraCostPct).toBe(c.pct);
    });
  }
});

describe("impliedMonthlyRatePct", () => {
  it("recovers the flat rate from an installment", () => {
    expect(impliedMonthlyRatePct(450_000, 88_275, 6)).toBe(2.95);
  });
});

describe("paylaterCost with cents", () => {
  it("keeps 2 decimals when asked", () => {
    const r = paylaterCost(89.9, { tenorMonths: 3, monthlyRatePct: 2, adminFee: 1.5 }, 2);
    expect(r.monthlyInstallment).toBe(31.76);
    expect(r.totalPaid).toBe(96.79);
    expect(r.extraCost).toBe(6.89);
  });
});
