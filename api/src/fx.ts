import { currencyDigits } from "./calc.js";

/**
 * Converting a price read in another currency into the profile currency.
 * Daily ECB reference rates via Frankfurter: free, no API key. All money math stays on the server.
 */
const FX_URL = "https://api.frankfurter.dev/v1/latest";
const CACHE_MS = 6 * 60 * 60 * 1000; // ECB publishes once a day

export interface FxQuote {
  from: string;
  to: string;
  /** Units of `to` per 1 unit of `from`. */
  rate: number;
  /** Date of the ECB rate, "YYYY-MM-DD". */
  date: string;
  source: "ECB via Frankfurter";
}

export type RateLookup = (from: string, to: string) => Promise<FxQuote | null>;

const cache = new Map<string, { quote: FxQuote; fetchedAt: number }>();

/** The ECB rate from one currency to another, or null when either is not covered or the service is down. */
export const fxRate: RateLookup = async (from, to) => {
  const a = from.trim().toUpperCase();
  const b = to.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(a) || !/^[A-Z]{3}$/.test(b) || a === b) return null;
  const key = `${a}>${b}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_MS) return hit.quote;
  try {
    const res = await fetch(`${FX_URL}?base=${a}&symbols=${b}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { date?: string; rates?: Record<string, number> };
    const rate = body.rates?.[b];
    if (!rate || !body.date) return null;
    const quote: FxQuote = { from: a, to: b, rate, date: body.date, source: "ECB via Frankfurter" };
    cache.set(key, { quote, fetchedAt: Date.now() });
    return quote;
  } catch {
    return null;
  }
};

/** amount × rate, rounded to the target currency's digits (whole rupiah and yen, cents otherwise). */
export function convertAmount(amount: number, rate: number, to: string): number {
  const f = 10 ** currencyDigits(to);
  return Math.round((amount * rate + Number.EPSILON) * f) / f;
}

export interface PriceInProfileCurrency {
  /** In the profile currency. */
  price: number;
  currency: string;
  /** Set when the price was converted: what was read, and the rate used. */
  original: { price: number; currency: string; rate: number; date: string; source: "ECB via Frankfurter" } | null;
}

/**
 * A price read from a photo or page, in the profile currency.
 * - No currency read, or the same currency: kept as is.
 * - Another currency with an ECB rate: converted, with the original and the rate attached.
 * - Another currency without a rate: `price` is null and `unconverted` says what was read, so the person types it (N5).
 */
export async function toProfileCurrency(
  reading: { price: number; currency: string | null } | null,
  profileCurrency: string,
  lookup: RateLookup = fxRate,
): Promise<{ price: PriceInProfileCurrency | null; unconverted: { price: number; currency: string } | null }> {
  if (!reading) return { price: null, unconverted: null };
  const from = reading.currency?.trim().toUpperCase() || null;
  if (!from || from === profileCurrency) return { price: { price: reading.price, currency: profileCurrency, original: null }, unconverted: null };
  const quote = await lookup(from, profileCurrency);
  if (!quote) return { price: null, unconverted: { price: reading.price, currency: from } };
  return {
    price: {
      price: convertAmount(reading.price, quote.rate, profileCurrency),
      currency: profileCurrency,
      original: { price: reading.price, currency: from, rate: quote.rate, date: quote.date, source: quote.source },
    },
    unconverted: null,
  };
}
