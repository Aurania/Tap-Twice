import providersData from "@/data/paylater-providers.ID.json";

/** Used when a provider has no typical rate (Others, Akulaku): a common flat monthly rate. */
export const DEFAULT_MONTHLY_RATE_PCT = 2.95;
export const DEFAULT_TENORS = [3, 6, 12];

export type Provider = {
  id: string;
  name: string;
  tenorsMonths: number[] | null;
  typicalMonthlyRateFrom: number | null; // fraction, e.g. 0.0295
  serviceFeeRate: number | null; // fraction; shown as text only
  note: string;
  sourceUrl: string | null;
};

/**
 * Static picker data (sheet 06a). The list is Indonesian (checked 2026-10-16) and is shown to everyone for now.
 * TODO(design): per-country providers are not specified in the handoff.
 */
export const PROVIDERS = providersData.providers as Provider[];
export const PROVIDERS_CHECKED_AT = providersData.checkedAt;
export const OTHER_PROVIDER_ID = "other";

/** Where the monthly rate in the numbers came from. */
export type RateSource = "typed" | "typical" | "default";

/** A provider's typical flat monthly rate as a percentage ("2.95"), or the common default. This is data, not a calculation. */
export function typicalRate(provider: Provider | null): { ratePct: number; source: RateSource } {
  if (provider?.typicalMonthlyRateFrom) return { ratePct: Math.round(provider.typicalMonthlyRateFrom * 10000) / 100, source: "typical" };
  return { ratePct: DEFAULT_MONTHLY_RATE_PCT, source: "default" };
}

/** Tenors to offer on the plan sheet: the provider's own list (3 months and up), or 3 / 6 / 12. */
export function tenorsFor(provider: Provider | null): number[] {
  const own = provider?.tenorsMonths?.filter((n) => n >= 3 && n <= 36) ?? [];
  return (own.length ? own : DEFAULT_TENORS).slice(0, 4);
}
