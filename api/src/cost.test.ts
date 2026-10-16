import { describe, expect, it } from "vitest";
import { calculateCost, hourlyRate, impliedMonthlyRatePct, paylaterCost, type CostProfile } from "./cost.js";

const now = new Date("2026-10-16T12:00:00+07:00");

const dinda: CostProfile = {
  monthlyIncome: 6_000_000,
  hoursPerWeek: 45,
  joyBudget: 600_000,
  goal: { name: "Concert in Singapore", targetAmount: 8_000_000, savedAmount: 2_000_000, targetDate: "2027-07-16" },
};

describe("hourlyRate", () => {
  it("divides income by monthly hours", () => {
    expect(hourlyRate(6_000_000, 45)).toBeCloseTo(30_792.9, 1);
  });
  it("is zero for missing inputs", () => {
    expect(hourlyRate(0, 45)).toBe(0);
    expect(hourlyRate(6_000_000, 0)).toBe(0);
  });
});

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

describe("calculateCost", () => {
  it("builds the reality card numbers", () => {
    const r = calculateCost({ total: 450_000, profile: dinda, spentThisMonth: 150_000, now });
    expect(r.hoursOfWork).toBe(14.6);
    expect(r.goal.monthlySaving).toBe(666_667);
    expect(r.goal.delayDays).toBe(20.3);
    expect(r.joy.leftBefore).toBe(450_000);
    expect(r.joy.leftAfter).toBe(0);
    expect(r.joy.usedPct).toBe(100);
    expect(r.paylater).toBeNull();
  });

  it("returns null goal delay when the goal is already reached", () => {
    const r = calculateCost({
      total: 100_000,
      profile: { ...dinda, goal: { ...dinda.goal, savedAmount: 8_000_000 } },
      spentThisMonth: 0,
      now,
    });
    expect(r.goal.delayDays).toBeNull();
  });

  it("returns null joy share when the budget is already used up", () => {
    const r = calculateCost({ total: 100_000, profile: dinda, spentThisMonth: 700_000, now });
    expect(r.joy.usedPct).toBeNull();
    expect(r.joy.leftAfter).toBe(-200_000);
  });

  it("includes paylater when terms are given", () => {
    const r = calculateCost({
      total: 450_000,
      profile: dinda,
      spentThisMonth: 0,
      paylater: { tenorMonths: 6, monthlyRatePct: 2.95, adminFee: 0, lateFee: 50_000 },
      now,
    });
    expect(r.paylater?.totalPaid).toBe(529_650);
    expect(r.paylater?.lateFee).toBe(50_000);
  });
});
