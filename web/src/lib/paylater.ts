import type { Extraction, Paylater } from "@/api";
import providersData from "@/data/paylater-providers.ID.json";

export const DEFAULT_MONTHLY_RATE_PCT = 2.95;
export const DEFAULT_TENORS = [3, 6, 12];

export type Provider = {
  id: string;
  name: string;
  tenorsMonths: number[] | null;
  typicalMonthlyRateFrom: number | null; // fraction, e.g. 0.0295
  serviceFeeRate: number | null; // fraction; shown as text only (BACKEND_GAPS.md #18)
  note: string;
  sourceUrl: string | null;
};

/** Static picker config (sheet 06a). */
export const PROVIDERS = providersData.providers as Provider[];
export const PROVIDERS_CHECKED_AT = providersData.checkedAt;
export const OTHER_PROVIDER_ID = "other";

/** Where the monthly rate came from, best first (BACKEND_GAPS.md #6). */
export type RateSource = "screenshot" | "typed" | "typical" | "default";

export type PaylaterInfo = {
  providerId: string | null;
  providerName: string | null;
  source: RateSource;
};

/**
 * Flat monthly rate from a known monthly payment. The one calculation the frontend may do
 * (REPO_CONTEXT.md "Paylater inputs"): ((monthly × tenor − total) / total / tenor) × 100.
 */
export function deriveMonthlyRatePct(monthlyAmount: number, tenorMonths: number, total: number): number {
  const pct = ((monthlyAmount * tenorMonths - total) / total / tenorMonths) * 100;
  return clampRate(Math.round(pct * 100) / 100);
}

const clampRate = (pct: number) => Math.min(20, Math.max(0, pct));
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const ALIASES: Record<string, string[]> = {
  spaylater: ["spaylater", "shopeepaylater", "shopee"],
  gopaylater: ["gopaylater", "gopay"],
  kredivo: ["kredivo"],
  akulaku: ["akulaku"],
};

/** Fuzzy match of the provider read from the screenshot ("SPayLater", "Shopee PayLater", "GoPayLater"…). */
export function matchProvider(name: string | null | undefined): Provider | null {
  if (!name) return null;
  const n = normalize(name);
  if (!n) return null;
  const hit = Object.entries(ALIASES).find(([, aliases]) => aliases.some((a) => n.includes(a) || a.includes(n)));
  return hit ? (PROVIDERS.find((p) => p.id === hit[0]) ?? null) : null;
}

/** Installment terms on the screenshot, when they apply to the chosen provider. */
export type ScreenshotTerms = {
  tenor: number | null;
  monthly: number | null;
  ratePct: number | null;
  adminFee: number | null;
};

export function screenshotTerms(idr: Extraction | null, providerId: string | null): ScreenshotTerms | null {
  const inst = idr?.installment;
  if (!inst) return null;
  const detected = matchProvider(inst.provider ?? idr?.payment_method);
  // Screenshot numbers belong to the detected provider; when none is named, they apply to any pick.
  if (detected && detected.id !== providerId) return null;
  return { tenor: inst.tenor_months, monthly: inst.monthly_amount, ratePct: inst.monthly_rate_pct, adminFee: inst.admin_fee };
}

export type TypedPlan = { tenor: number; monthly: number | null; fee: number | null };

export type Terms = { monthlyRatePct: number; adminFee: number; source: RateSource };

/**
 * Monthly rate and one-time fee for /api/cost (BACKEND_GAPS.md #6). A plan the user typed on 06c
 * wins, because it is an explicit correction (06c is prefilled from the screenshot). Otherwise:
 * screenshot monthly amount → screenshot rate → provider typical rate → 2.95 %.
 */
export function resolveTerms(total: number, provider: Provider | null, shot: ScreenshotTerms | null, typed: TypedPlan | null): Terms {
  const adminFee = Math.max(0, typed?.fee ?? shot?.adminFee ?? 0);
  if (typed?.monthly && typed.tenor > 0) {
    return { monthlyRatePct: deriveMonthlyRatePct(typed.monthly, typed.tenor, total), adminFee, source: "typed" };
  }
  if (shot?.monthly && shot.tenor && shot.tenor > 0) {
    return { monthlyRatePct: deriveMonthlyRatePct(shot.monthly, shot.tenor, total), adminFee, source: "screenshot" };
  }
  if (shot?.ratePct !== null && shot?.ratePct !== undefined) {
    return { monthlyRatePct: clampRate(shot.ratePct), adminFee, source: "screenshot" };
  }
  if (provider?.typicalMonthlyRateFrom) {
    return { monthlyRatePct: clampRate(Math.round(provider.typicalMonthlyRateFrom * 10000) / 100), adminFee, source: "typical" };
  }
  return { monthlyRatePct: DEFAULT_MONTHLY_RATE_PCT, adminFee, source: "default" };
}

/** Tenors to offer on the plan sheet: the provider's list (or 3/6/12) plus the screenshot's tenor. */
export function tenorsFor(provider: Provider | null, shot: ScreenshotTerms | null): number[] {
  const base = provider?.tenorsMonths?.filter((n) => n >= 3) ?? DEFAULT_TENORS;
  const list = base.length ? base : DEFAULT_TENORS;
  const withShot = shot?.tenor && !list.includes(shot.tenor) ? [...list, shot.tenor] : list;
  return [...withShot].filter((n) => n >= 1 && n <= 36).sort((a, b) => a - b).slice(0, 4);
}

/**
 * Prefill paylater terms when the screenshot shows a tenor (used when the reality card opens).
 */
export function paylaterFromExtraction(idr: Extraction, total: number): { paylater: Paylater; info: PaylaterInfo } | null {
  const tenor = idr.installment?.tenor_months;
  if (!idr.installment || !tenor || tenor < 1 || tenor > 36) return null;
  const provider = matchProvider(idr.installment.provider ?? idr.payment_method);
  const terms = resolveTerms(total, provider, screenshotTerms(idr, provider?.id ?? null), null);
  return {
    paylater: { tenorMonths: tenor, monthlyRatePct: terms.monthlyRatePct, adminFee: terms.adminFee },
    info: { providerId: provider?.id ?? null, providerName: provider?.name ?? idr.installment.provider, source: terms.source },
  };
}
