// Seed data for development, tests and the mock AI. Everything here is SAMPLE data from the Figma
// handoff, made consistent. The handoff showed Fashion with $330 left (Healthy) and $52 left
// (Not healthy); those are two scenarios of one user, not two different pockets.
//
//   income 3,200 − expenses 2,100 = leftover 1,100
//   Fashion 30% = 330 · Gadgets 20% = 220 · Entertainment 25% = 275 · Travel 25% = 275
//   wishlist total 514.59 = 47% of 1,100

export type PocketId = "fashion" | "gadgets" | "entertainment" | "travel";

export interface SeedPocket {
  id: PocketId;
  name: string;
  allocationPct: number;
  /** Design token name (`--tt-color-<colorToken>`), never a hex value. */
  colorToken: `pocket-${PocketId}`;
}

export interface SeedWishlistItem {
  id: string;
  name: string;
  price: number;
  pocketId: PocketId;
}

export interface SeedPurchase {
  title: string;
  amount: number;
  pocketId: PocketId;
}

export const seedProfile = {
  nickname: "Sarah",
  currency: "USD",
  monthlyIncome: 3200,
  monthlyExpenses: 2100,
  workDays: ["mon", "tue", "wed", "thu", "fri"] as const,
  hoursPerDay: 8,
  goal: { name: "Concert in Singapore", targetAmount: 490, savedAmount: 122.5, targetDate: "2027-06-30" },
  language: "en" as const,
};

export const seedPockets: SeedPocket[] = [
  { id: "fashion", name: "Fashion", allocationPct: 30, colorToken: "pocket-fashion" },
  { id: "gadgets", name: "Gadgets", allocationPct: 20, colorToken: "pocket-gadgets" },
  { id: "entertainment", name: "Entertainment", allocationPct: 25, colorToken: "pocket-entertainment" },
  { id: "travel", name: "Travel", allocationPct: 25, colorToken: "pocket-travel" },
];

export const seedWishlist: SeedWishlistItem[] = [
  { id: "w1", name: "New Balance Fresh Foam 680", price: 89.9, pocketId: "fashion" },
  { id: "w2", name: "Denim jacket", price: 65.7, pocketId: "fashion" },
  { id: "w3", name: "Sony earbuds", price: 119, pocketId: "gadgets" },
  { id: "w4", name: "Switch game", price: 59.99, pocketId: "entertainment" },
  { id: "w5", name: "Bali weekend flight", price: 180, pocketId: "travel" },
];

/** The product used across the check flow. */
export const seedProduct = { name: "New Balance Fresh Foam 680", detail: "Running shoes · Men's", price: 89.9, pocketId: "fashion" as PocketId, matchConfidencePct: 92 };

/** Purchases already made this month, per scenario. Pocket remaining = budget − these. */
export const seedScenarios: Record<"fresh" | "stretched" | "empty", SeedPurchase[]> = {
  /** Fashion has 330 left → the NB shoes are Healthy (240.10 left, 73%). */
  fresh: [],
  /** Fashion has 52 left → the NB shoes are Not healthy. */
  stretched: [{ title: "Winter coat", amount: 278, pocketId: "fashion" }],
  /** Fashion has 0 left → Pocket empty. */
  empty: [{ title: "Winter coat", amount: 330, pocketId: "fashion" }],
};
