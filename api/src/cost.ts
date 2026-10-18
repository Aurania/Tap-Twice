// PayLater cost math (flat monthly rate), kept from v1. The v1 cart "reality card" (joy budget, goal delay)
// is gone; the v2 reality card lives in calc.ts + summary.ts. Gemini never does money math.

export interface PaylaterTerms {
  tenorMonths: number;
  monthlyRatePct: number; // flat monthly interest/fee, % of the price
  adminFee: number; // one-time, in the profile currency
  lateFee?: number; // per late payment (shown, not added to total)
}

export interface PaylaterResult {
  tenorMonths: number;
  monthlyInstallment: number;
  totalPaid: number;
  extraCost: number;
  extraCostPct: number;
  lateFee: number | null;
}

const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/**
 * installment = price / tenor + price × rate; total = installment × tenor + admin.
 * `digits` is the decimals of the currency: 0 for IDR/JPY (the v1 default), 2 for USD and most others.
 * TODO(phase 8): pass the profile currency's decimals from the route.
 */
export function paylaterCost(price: number, terms: PaylaterTerms, digits = 0): PaylaterResult {
  const tenor = Math.max(1, Math.round(terms.tenorMonths));
  const monthlyFee = price * (terms.monthlyRatePct / 100);
  const monthlyInstallment = price / tenor + monthlyFee;
  const totalPaid = monthlyInstallment * tenor + terms.adminFee;
  const extraCost = totalPaid - price;
  return {
    tenorMonths: tenor,
    monthlyInstallment: round(monthlyInstallment, digits),
    totalPaid: round(totalPaid, digits),
    extraCost: round(extraCost, digits),
    extraCostPct: price > 0 ? round((extraCost / price) * 100, 1) : 0,
    lateFee: terms.lateFee ?? null,
  };
}

/** Flat monthly rate implied by a known installment, e.g. "183,000 × 6" read from a screenshot. */
export function impliedMonthlyRatePct(price: number, monthlyInstallment: number, tenorMonths: number): number {
  if (price <= 0 || tenorMonths <= 0) return 0;
  const extra = monthlyInstallment * tenorMonths - price;
  return round(Math.max(0, (extra / price / tenorMonths) * 100), 2);
}
