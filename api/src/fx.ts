import type { Extraction } from "./schemas.js";

// Daily ECB reference rates via Frankfurter: free, no API key.
const FX_URL = "https://api.frankfurter.dev/v1/latest";
const CACHE_MS = 6 * 60 * 60 * 1000; // ECB publishes once a day

export interface FxRate {
  currency: string;
  rateToIdr: number;
  date: string; // date of the ECB rate
  source: "ECB via Frankfurter";
}

const cache = new Map<string, { rate: FxRate; fetchedAt: number }>();

/** Rupiah per 1 unit of `currency`, or null if the currency isn't covered or the service is down. */
export async function rateToIdr(currency: string): Promise<FxRate | null> {
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  const hit = cache.get(code);
  if (hit && Date.now() - hit.fetchedAt < CACHE_MS) return hit.rate;

  try {
    const res = await fetch(`${FX_URL}?base=${code}&symbols=IDR`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { date?: string; rates?: { IDR?: number } };
    if (!body.rates?.IDR || !body.date) return null;
    const rate: FxRate = { currency: code, rateToIdr: body.rates.IDR, date: body.date, source: "ECB via Frankfurter" };
    cache.set(code, { rate, fetchedAt: Date.now() });
    return rate;
  } catch {
    return null;
  }
}

/** The same extraction with every amount converted to whole rupiah. */
export function convertToIdr(e: Extraction, rate: number): Extraction {
  const idr = (n: number | null) => (n === null ? null : Math.round(n * rate));
  return {
    ...e,
    currency: "IDR",
    items: e.items.map((i) => ({ ...i, unit_price: Math.round(i.unit_price * rate) })),
    subtotal: idr(e.subtotal),
    discounts: idr(e.discounts),
    shipping: idr(e.shipping),
    total: idr(e.total),
    installment: e.installment && {
      ...e.installment,
      monthly_amount: idr(e.installment.monthly_amount),
      admin_fee: idr(e.installment.admin_fee),
    },
  };
}
