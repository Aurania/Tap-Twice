import { describe, expect, it } from "vitest";
import { convertAmount, toProfileCurrency, type FxQuote, type RateLookup } from "./fx.js";

const quote = (from: string, to: string, rate: number): FxQuote => ({ from, to, rate, date: "2026-10-16", source: "ECB via Frankfurter" });
const lookup = (rate: number | null): RateLookup => async (from, to) => (rate === null ? null : quote(from, to, rate));

describe("convertAmount", () => {
  it("rounds to whole rupiah and yen", () => {
    expect(convertAmount(50.02, 24045.3, "IDR")).toBe(1_202_746);
    expect(convertAmount(89.9, 151.234, "JPY")).toBe(13_596);
  });
  it("rounds to cents otherwise", () => {
    expect(convertAmount(1_513_000, 0.0000616, "USD")).toBe(93.2);
    expect(convertAmount(10, 1.0845, "EUR")).toBe(10.85);
  });
});

describe("toProfileCurrency", () => {
  it("keeps a price with no currency read, or already in the profile currency", async () => {
    expect(await toProfileCurrency({ price: 89.9, currency: null }, "USD", lookup(2))).toEqual({ price: { price: 89.9, currency: "USD", original: null }, unconverted: null });
    expect(await toProfileCurrency({ price: 89.9, currency: "usd" }, "USD", lookup(2))).toEqual({ price: { price: 89.9, currency: "USD", original: null }, unconverted: null });
  });
  it("converts another currency and attaches the original and the rate", async () => {
    const r = await toProfileCurrency({ price: 50.02, currency: "GBP" }, "IDR", lookup(24045.3));
    expect(r.unconverted).toBeNull();
    expect(r.price).toEqual({
      price: 1_202_746,
      currency: "IDR",
      original: { price: 50.02, currency: "GBP", rate: 24045.3, date: "2026-10-16", source: "ECB via Frankfurter" },
    });
  });
  it("asks for the price when there is no rate (N5)", async () => {
    expect(await toProfileCurrency({ price: 1200, currency: "VND" }, "USD", lookup(null))).toEqual({ price: null, unconverted: { price: 1200, currency: "VND" } });
  });
  it("passes no price through", async () => {
    expect(await toProfileCurrency(null, "USD", lookup(2))).toEqual({ price: null, unconverted: null });
  });
});
