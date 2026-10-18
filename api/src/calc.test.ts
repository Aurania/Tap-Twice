import { describe, expect, it } from "vitest";
import {
  allocationTotal,
  displayWorkHours,
  goalProgressPct,
  goalTone,
  hasRoomForPockets,
  hourlyRate,
  isAllocationValid,
  itemPocketPct,
  leftover,
  overAllocatedBy,
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
} from "./calc.js";
import { seedPockets, seedProduct, seedProfile, seedScenarios, seedWishlist, type PocketId } from "./seed.js";

const { monthlyIncome, monthlyExpenses, hoursPerDay, workDays, goal } = seedProfile;

describe("leftover and room for pockets", () => {
  it("is income minus expenses", () => {
    expect(leftover(3200, 2100)).toBe(1100);
  });
  it("has no room when expenses match or exceed income (N1)", () => {
    expect(hasRoomForPockets(3200, 2100)).toBe(true);
    expect(hasRoomForPockets(3200, 3200)).toBe(false);
    expect(hasRoomForPockets(3200, 3500)).toBe(false);
    expect(leftover(3200, 3500)).toBe(-300);
  });
});

describe("hourlyRate", () => {
  it("matches the handoff example: 3200 / (8 × 5 × 52/12) ≈ 18.46", () => {
    expect(hourlyRate(3200, 8, 5)).toBe(18.46);
  });
  it("is 0 for inputs that cannot produce a rate", () => {
    expect(hourlyRate(0, 8, 5)).toBe(0);
    expect(hourlyRate(3200, 0, 5)).toBe(0);
    expect(hourlyRate(3200, 8, 0)).toBe(0);
  });
  it("goes down as the week gets longer", () => {
    expect(hourlyRate(3200, 8, 6)).toBeLessThan(hourlyRate(3200, 8, 5));
  });
});

describe("workHours", () => {
  const rate = hourlyRate(monthlyIncome, hoursPerDay, workDays.length);
  it("$89.90 is about 4.87 hours, shown as 5", () => {
    expect(workHours(89.9, rate)).toBeCloseTo(4.87, 2);
    expect(displayWorkHours(workHours(89.9, rate))).toBe(5);
  });
  it("is 0 without a rate", () => {
    expect(workHours(89.9, 0)).toBe(0);
  });
});

describe("pctOfIncome", () => {
  it("$89.90 of $3,200 is 2.8%", () => {
    expect(pctOfIncome(89.9, 3200)).toBe(2.8);
  });
  it("is 0 without income", () => {
    expect(pctOfIncome(89.9, 0)).toBe(0);
  });
});

describe("pocket budgets from the seed", () => {
  const left = leftover(monthlyIncome, monthlyExpenses);
  const budgets = Object.fromEntries(seedPockets.map((p) => [p.id, pocketBudget(left, p.allocationPct)])) as Record<PocketId, number>;

  it("splits the leftover 30/20/25/25", () => {
    expect(budgets).toEqual({ fashion: 330, gadgets: 220, entertainment: 275, travel: 275 });
  });
  it("budgets add back up to the leftover", () => {
    expect(Object.values(budgets).reduce((a, b) => a + b, 0)).toBe(left);
  });
  it("is 0 when there is no leftover", () => {
    expect(pocketBudget(-300, 30)).toBe(0);
    expect(pocketBudget(0, 30)).toBe(0);
  });
});

describe("pocketRemaining", () => {
  it("is the budget minus actual purchases", () => {
    expect(pocketRemaining(330, 0)).toBe(330);
    expect(pocketRemaining(330, 278)).toBe(52);
  });
  it("never goes below 0 when overspent", () => {
    expect(pocketRemaining(330, 400)).toBe(0);
  });
  it("is not reduced by the wishlist", () => {
    const wishlistInFashion = round2(seedWishlist.filter((w) => w.pocketId === "fashion").reduce((s, w) => s + w.price, 0));
    expect(wishlistInFashion).toBe(155.6);
    expect(pocketRemaining(330, 0)).toBe(330);
  });
});

describe("realityStatus", () => {
  it("is healthy when the price fits", () => {
    expect(realityStatus(89.9, 330)).toBe("healthy");
  });
  it("counts a price equal to what is left as fitting", () => {
    expect(realityStatus(52, 52)).toBe("healthy");
  });
  it("is not healthy when the price is more than what is left", () => {
    expect(realityStatus(89.9, 52)).toBe("not_healthy");
  });
  it("is pocket empty at 0 left, whatever the price", () => {
    expect(realityStatus(89.9, 0)).toBe("pocket_empty");
    expect(realityStatus(0, 0)).toBe("pocket_empty");
  });

  it("gives the three outcomes for the seed scenarios", () => {
    const budget = pocketBudget(leftover(monthlyIncome, monthlyExpenses), 30);
    const statusFor = (key: keyof typeof seedScenarios) => {
      const spent = seedScenarios[key].filter((p) => p.pocketId === seedProduct.pocketId).reduce((s, p) => s + p.amount, 0);
      return realityStatus(seedProduct.price, pocketRemaining(budget, spent));
    };
    expect(statusFor("fresh")).toBe("healthy");
    expect(statusFor("stretched")).toBe("not_healthy");
    expect(statusFor("empty")).toBe("pocket_empty");
  });
});

describe("remainingAfterPct and remainingAfter", () => {
  it("$330 → $240.10 leaves 73% of the $330 budget (Figma Healthy card)", () => {
    expect(remainingAfter(89.9, 330)).toBe(240.1);
    expect(remainingAfterPct(89.9, 330, 330)).toBe(73);
  });
  it("is measured against the budget, not what was left", () => {
    // 200 left of a 330 budget; after a 50 buy 150 is left = 45% of the budget.
    expect(remainingAfterPct(50, 200, 330)).toBe(45);
  });
  it("is 0 when the price is more than what is left", () => {
    expect(remainingAfterPct(89.9, 52, 330)).toBe(0);
    expect(remainingAfter(89.9, 52)).toBe(0);
  });
  it("is 0 when nothing was left and null without a budget", () => {
    expect(remainingAfterPct(89.9, 0, 330)).toBe(0);
    expect(remainingAfterPct(89.9, 0, 0)).toBeNull();
  });
});

describe("wishlist percentages from the seed", () => {
  const left = leftover(monthlyIncome, monthlyExpenses);
  const ids: PocketId[] = ["fashion", "gadgets", "entertainment", "travel"];
  const budget = (id: PocketId) => pocketBudget(left, seedPockets.find((p) => p.id === id)!.allocationPct);
  const wishlistTotal = (id: PocketId) => round2(seedWishlist.filter((w) => w.pocketId === id).reduce((s, w) => s + w.price, 0));

  it("per pocket matches the handoff: 47 / 54 / 22 / 65", () => {
    expect(ids.map((id) => pocketWishlistPct(wishlistTotal(id), budget(id)))).toEqual([47, 54, 22, 65]);
  });
  it("total is $514.59 = 47%", () => {
    expect(round2(ids.reduce((s, id) => s + wishlistTotal(id), 0))).toBe(514.59);
    expect(totalWishlistPct(ids.map(wishlistTotal), ids.map(budget))).toBe(47);
  });
  it("an item shows its price over the pocket budget", () => {
    expect(itemPocketPct(89.9, 330)).toBe(27);
  });
  it("can go over 100 and is null with no budget", () => {
    expect(pocketWishlistPct(400, 330)).toBe(121);
    expect(pocketWishlistPct(10, 0)).toBeNull();
    expect(totalWishlistPct([10], [0])).toBeNull();
  });
  it("is 0 for an empty wishlist (N9, N11)", () => {
    expect(pocketWishlistPct(0, 330)).toBe(0);
    expect(totalWishlistPct([0, 0, 0, 0], [330, 220, 275, 275])).toBe(0);
  });
});

describe("allocation total (N2)", () => {
  it("the default pockets add up to 100", () => {
    const pcts = seedPockets.map((p) => p.allocationPct);
    expect(allocationTotal(pcts)).toBe(100);
    expect(isAllocationValid(pcts)).toBe(true);
    expect(overAllocatedBy(pcts)).toBe(0);
  });
  it("110% is invalid and over by 10", () => {
    const pcts = [40, 20, 25, 25];
    expect(allocationTotal(pcts)).toBe(110);
    expect(isAllocationValid(pcts)).toBe(false);
    expect(overAllocatedBy(pcts)).toBe(10);
  });
  it("under 100% is invalid and negative", () => {
    expect(isAllocationValid([30, 20, 25])).toBe(false);
    expect(overAllocatedBy([30, 20, 25])).toBe(-25);
  });
  it("rejects no pockets and negative shares", () => {
    expect(isAllocationValid([])).toBe(false);
    expect(isAllocationValid([120, -20])).toBe(false);
  });
  it("copes with decimals", () => {
    expect(isAllocationValid([33.3, 33.3, 33.4])).toBe(true);
  });
});

describe("goal", () => {
  it("$122.50 of $490 is 25%, shown red below 50", () => {
    expect(goalProgressPct(goal.savedAmount, goal.targetAmount)).toBe(25);
    expect(goalTone(25)).toBe("danger");
    expect(goalTone(50)).toBe("neutral");
  });
  it("handles a missing target", () => {
    expect(goalProgressPct(10, 0)).toBe(0);
  });
});
