import { describe, expect, it } from "vitest";
import { ProfileSchema, type Profile } from "./schemas.js";
import { seedPockets, seedProduct, seedProfile, seedScenarios, seedWishlist } from "./seed.js";
import { buildReality, buildSummary, type StoredWishlistItem } from "./summary.js";

const profile: Profile = {
  ...seedProfile,
  workDays: [...seedProfile.workDays],
  pockets: seedPockets.map(({ id, name, allocationPct }) => ({ id, name, allocationPct })),
};
const wishlist: StoredWishlistItem[] = seedWishlist.map((w) => ({ ...w, createdAt: null }));
const purchasesFor = (key: keyof typeof seedScenarios) => seedScenarios[key].map((p) => ({ amount: p.amount, pocketId: p.pocketId }));
const check = { name: seedProduct.name, price: seedProduct.price, pocketId: seedProduct.pocketId };

describe("ProfileSchema", () => {
  it("accepts the seed profile", () => {
    expect(ProfileSchema.safeParse(profile).success).toBe(true);
  });

  const issueMessages = (p: unknown) => {
    const r = ProfileSchema.safeParse(p);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  it("N1: rejects expenses at or above income", () => {
    expect(issueMessages({ ...profile, monthlyExpenses: 3200 })).toContain("expenses_exceed_income");
    expect(issueMessages({ ...profile, monthlyExpenses: 3500 })).toContain("expenses_exceed_income");
  });
  it("N2: rejects pockets that do not add up to 100", () => {
    const pockets = profile.pockets.map((p, i) => (i === 0 ? { ...p, allocationPct: 40 } : p));
    expect(issueMessages({ ...profile, pockets })).toContain("allocation_not_100:110");
  });
  it("rejects duplicate pocket names and work days", () => {
    const pockets = [...profile.pockets.slice(0, 3), { id: "x", name: "FASHION", allocationPct: 25 }];
    expect(issueMessages({ ...profile, pockets })).toContain("duplicate_pockets");
    expect(issueMessages({ ...profile, workDays: ["mon", "mon"] })).toContain("duplicate_work_days");
  });
  it("rejects no work days and unknown currencies", () => {
    expect(ProfileSchema.safeParse({ ...profile, workDays: [] }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...profile, currency: "XYZ" }).success).toBe(false);
  });
});

describe("buildSummary (seed, fresh month)", () => {
  const s = buildSummary(profile, wishlist, []);

  it("has the hourly rate and leftover from the handoff", () => {
    expect(s.hourlyRate).toBe(18.46);
    expect(s.leftover).toBe(1100);
  });
  it("gives each pocket its budget and wishlist share", () => {
    expect(s.pockets.map((p) => [p.id, p.budget, p.remaining, p.wishlistPct])).toEqual([
      ["fashion", 330, 330, 47],
      ["gadgets", 220, 220, 54],
      ["entertainment", 275, 275, 22],
      ["travel", 275, 275, 65],
    ]);
  });
  it("totals the wishlist: $514.59 = 47%", () => {
    expect(s.wishlist.total).toBe(514.59);
    expect(s.wishlist.pct).toBe(47);
  });
  it("gives each wishlist item its share of the pocket and its work hours", () => {
    const nb = s.wishlist.items.find((i) => i.id === "w1")!;
    expect(nb.pocketPct).toBe(27);
    expect(nb.workHours).toBe(5);
  });
  it("shows the goal at 25% in the danger tone", () => {
    expect(s.goal.progressPct).toBe(25);
    expect(s.goal.tone).toBe("danger");
  });
  it("N9/N11: an empty wishlist is 0% everywhere", () => {
    const empty = buildSummary(profile, [], []);
    expect(empty.wishlist.total).toBe(0);
    expect(empty.wishlist.pct).toBe(0);
    expect(empty.pockets.every((p) => p.wishlistPct === 0 && p.wishlistCount === 0)).toBe(true);
  });
  it("purchases reduce remaining, the wishlist does not", () => {
    const stretched = buildSummary(profile, wishlist, purchasesFor("stretched"));
    expect(stretched.pockets[0]).toMatchObject({ spent: 278, remaining: 52, wishlistTotal: 155.6 });
  });
});

describe("buildReality (the New Balance shoes, $89.90 in Fashion)", () => {
  it("healthy: 5 hours, 2.8% of income, $240.10 left = 73%", () => {
    const r = buildReality(profile, wishlist, purchasesFor("fresh"), check)!;
    expect(r).toMatchObject({
      status: "healthy",
      displayWorkHours: 5,
      pctOfIncome: 2.8,
      remainingAfter: 240.1,
      remainingAfterPct: 73,
      pocket: { id: "fashion", budget: 330, remaining: 330 },
    });
    expect(r.workHours).toBeCloseTo(4.87, 2);
  });
  it("not healthy with $52 left", () => {
    const r = buildReality(profile, wishlist, purchasesFor("stretched"), check)!;
    expect(r).toMatchObject({ status: "not_healthy", remainingAfter: 0, remainingAfterPct: 0, pocket: { remaining: 52 } });
  });
  it("N7: pocket empty with $0 left", () => {
    const r = buildReality(profile, wishlist, purchasesFor("empty"), check)!;
    expect(r.status).toBe("pocket_empty");
  });
  it("N10: finds the same product already on the wishlist, ignoring case and spacing", () => {
    const r = buildReality(profile, wishlist, [], { ...check, name: "  new balance  FRESH foam 680 " })!;
    expect(r.duplicateOf).toBe("w1");
  });
  it("is not a duplicate in another pocket or with another name", () => {
    expect(buildReality(profile, wishlist, [], { ...check, pocketId: "gadgets" })!.duplicateOf).toBeNull();
    expect(buildReality(profile, wishlist, [], { ...check, name: "Other shoes" })!.duplicateOf).toBeNull();
  });
  it("is null for an unknown pocket", () => {
    expect(buildReality(profile, wishlist, [], { ...check, pocketId: "nope" })).toBeNull();
  });
});
