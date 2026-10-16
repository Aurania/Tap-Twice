import { describe, expect, it } from "vitest";
import { convertToIdr } from "./fx.js";
import type { Extraction } from "./schemas.js";

describe("convertToIdr", () => {
  it("converts every amount to whole rupiah and keeps nulls", () => {
    const gbp: Extraction = {
      is_cart: true,
      merchant: "Amazon",
      items: [
        { name: "Garmin vivofit Jr.3", quantity: 1, unit_price: 50.02 },
        { name: "Anker 140W charger", quantity: 1, unit_price: 59.99 },
      ],
      subtotal: null,
      discounts: null,
      shipping: 0,
      total: 110.01,
      currency: "GBP",
      payment_method: null,
      installment: { provider: "Amazon", tenor_months: 3, monthly_amount: 16.68, monthly_rate_pct: null, admin_fee: null },
      confidence: "high",
    };
    const idr = convertToIdr(gbp, 23_770);
    expect(idr.currency).toBe("IDR");
    expect(idr.items.map((i) => i.unit_price)).toEqual([1_188_975, 1_425_962]);
    expect(idr.total).toBe(2_614_938);
    expect(idr.subtotal).toBeNull();
    expect(idr.shipping).toBe(0);
    expect(idr.installment?.monthly_amount).toBe(396_484);
    expect(idr.installment?.tenor_months).toBe(3);
  });
});
