// The one cost engine. The reality card and every Future Me tool call use these
// functions, so the numbers on screen and in chat always match. Gemini never
// does money math.

export const WEEKS_PER_MONTH = 4.33;
export const DAYS_PER_MONTH = 30;

export interface Goal {
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string; // YYYY-MM-DD
}

export interface CostProfile {
  monthlyIncome: number;
  hoursPerWeek: number;
  joyBudget: number;
  goal: Goal;
}

export interface PaylaterTerms {
  tenorMonths: number;
  monthlyRatePct: number; // flat monthly interest/fee, % of the price
  adminFee: number; // one-time, rupiah
  lateFee?: number; // per late payment, rupiah (shown, not added to total)
}

export interface PaylaterResult {
  tenorMonths: number;
  monthlyInstallment: number;
  totalPaid: number;
  extraCost: number;
  extraCostPct: number;
  lateFee: number | null;
}

export interface CostResult {
  total: number;
  hourlyRate: number;
  hoursOfWork: number;
  goal: {
    name: string;
    monthlySaving: number | null; // null when the goal is reached or its date has passed
    delayDays: number | null;
  };
  joy: {
    budget: number;
    spentThisMonth: number;
    leftBefore: number;
    leftAfter: number;
    usedPct: number | null; // share of the remaining joy budget this purchase uses
  };
  paylater: PaylaterResult | null;
}

const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

export function hourlyRate(monthlyIncome: number, hoursPerWeek: number): number {
  if (monthlyIncome <= 0 || hoursPerWeek <= 0) return 0;
  return monthlyIncome / (hoursPerWeek * WEEKS_PER_MONTH);
}

/** Today's date in Jakarta as [year, month (1-12), day]. */
export function jakartaDate(now: Date): [number, number, number] {
  const d = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
}

/** Calendar months from today (Jakarta) to the target date; partial months count days / 30. */
export function monthsUntil(targetDate: string, now: Date): number {
  const [ty, tm, td] = targetDate.split("-").map(Number);
  const [y, m, d] = jakartaDate(now);
  return (ty - y) * 12 + (tm - m) + (td - d) / DAYS_PER_MONTH;
}

export function monthlySavingForGoal(goal: Goal, now: Date): number | null {
  const remaining = goal.targetAmount - goal.savedAmount;
  const months = monthsUntil(goal.targetDate, now);
  if (remaining <= 0 || months <= 0) return null;
  return remaining / months;
}

export function paylaterCost(price: number, terms: PaylaterTerms): PaylaterResult {
  const tenor = Math.max(1, Math.round(terms.tenorMonths));
  const monthlyFee = price * (terms.monthlyRatePct / 100);
  const monthlyInstallment = price / tenor + monthlyFee;
  const totalPaid = monthlyInstallment * tenor + terms.adminFee;
  const extraCost = totalPaid - price;
  return {
    tenorMonths: tenor,
    monthlyInstallment: round(monthlyInstallment),
    totalPaid: round(totalPaid),
    extraCost: round(extraCost),
    extraCostPct: price > 0 ? round((extraCost / price) * 100, 1) : 0,
    lateFee: terms.lateFee ?? null,
  };
}

/** Flat monthly rate implied by a known installment, e.g. "Rp183.000 x 6" read from a screenshot. */
export function impliedMonthlyRatePct(price: number, monthlyInstallment: number, tenorMonths: number): number {
  if (price <= 0 || tenorMonths <= 0) return 0;
  const extra = monthlyInstallment * tenorMonths - price;
  return round(Math.max(0, (extra / price / tenorMonths) * 100), 2);
}

export function calculateCost(input: {
  total: number;
  profile: CostProfile;
  spentThisMonth: number;
  paylater?: PaylaterTerms | null;
  now?: Date;
}): CostResult {
  const now = input.now ?? new Date();
  const { total, profile } = input;
  const rate = hourlyRate(profile.monthlyIncome, profile.hoursPerWeek);
  const monthlySaving = monthlySavingForGoal(profile.goal, now);
  const leftBefore = profile.joyBudget - input.spentThisMonth;

  return {
    total: round(total),
    hourlyRate: round(rate),
    hoursOfWork: rate > 0 ? round(total / rate, 1) : 0,
    goal: {
      name: profile.goal.name,
      monthlySaving: monthlySaving === null ? null : round(monthlySaving),
      delayDays: monthlySaving === null ? null : round(total / (monthlySaving / DAYS_PER_MONTH), 1),
    },
    joy: {
      budget: profile.joyBudget,
      spentThisMonth: round(input.spentThisMonth),
      leftBefore: round(leftBefore),
      leftAfter: round(leftBefore - total),
      usedPct: leftBefore > 0 ? round((total / leftBefore) * 100) : null,
    },
    paylater: input.paylater ? paylaterCost(total, input.paylater) : null,
  };
}
