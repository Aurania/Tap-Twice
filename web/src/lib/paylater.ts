import type { Extraction, Paylater } from "@/api";

export const DEFAULT_MONTHLY_RATE_PCT = 2.95;

/**
 * Flat monthly rate from a known monthly payment. The one calculation the frontend may do
 * (REPO_CONTEXT.md "Paylater inputs"): ((monthly × tenor − total) / total / tenor) × 100.
 */
export function deriveMonthlyRatePct(monthlyAmount: number, tenorMonths: number, total: number): number {
  const pct = ((monthlyAmount * tenorMonths - total) / total / tenorMonths) * 100;
  return clampRate(Math.round(pct * 100) / 100);
}

const clampRate = (pct: number) => Math.min(20, Math.max(0, pct));

/**
 * Prefill paylater terms from the screenshot when it shows a tenor (BACKEND_GAPS.md #6):
 * monthly amount → derived rate, else the rate on screen, else 2.95 %.
 */
export function paylaterFromExtraction(idr: Extraction, total: number): Paylater | null {
  const inst = idr.installment;
  const tenor = inst?.tenor_months;
  if (!inst || !tenor || tenor < 1 || tenor > 36) return null;
  let monthlyRatePct = DEFAULT_MONTHLY_RATE_PCT;
  if (inst.monthly_amount && total > 0) monthlyRatePct = deriveMonthlyRatePct(inst.monthly_amount, tenor, total);
  else if (inst.monthly_rate_pct !== null) monthlyRatePct = clampRate(inst.monthly_rate_pct);
  return { tenorMonths: tenor, monthlyRatePct, adminFee: Math.max(0, inst.admin_fee ?? 0) };
}
