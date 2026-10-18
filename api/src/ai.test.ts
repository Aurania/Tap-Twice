import { describe, expect, it } from "vitest";
import { AiFailedError, analysisPrompt, extractJson, formatMoney, futureMeFacts, futureMeSystemPrompt, NotAProductError, reflectionFacts, reflectionSystemPrompt, toProductAnalysis, type ReflectContext } from "./ai.js";
import type { Profile } from "./schemas.js";
import { seedPockets, seedProfile, seedWishlist } from "./seed.js";
import { buildReality, buildSummary } from "./summary.js";

const ids = ["fashion", "gadgets", "entertainment", "travel"];
const raw = { is_product: true, name: "New Balance Fresh Foam 680", detail: "Running shoes · Men's", emoji: "👟", pocket_id: "fashion", match_confidence_pct: 92, price: 89.9, currency: "usd" };

describe("toProductAnalysis", () => {
  it("keeps a good reading", () => {
    expect(toProductAnalysis(raw, ids)).toEqual({
      product: { name: "New Balance Fresh Foam 680", detail: "Running shoes · Men's", emoji: "👟", pocketId: "fashion", matchConfidencePct: 92 },
      price: { price: 89.9, currency: "USD" },
    });
  });
  it("N4: not a product", () => {
    expect(() => toProductAnalysis({ ...raw, is_product: false }, ids)).toThrow(NotAProductError);
    expect(() => toProductAnalysis({ ...raw, name: "  " }, ids)).toThrow(NotAProductError);
  });
  it("is_product false wins even when the other fields are missing", () => {
    expect(() => toProductAnalysis({ is_product: false }, ids)).toThrow(NotAProductError);
    expect(() => toProductAnalysis({ is_product: false, name: null, pocket_id: null }, ids)).toThrow(NotAProductError);
  });
  it("N5: no usable price becomes null, never a guess", () => {
    for (const price of [null, 0, -3]) expect(toProductAnalysis({ ...raw, price }, ids).price).toBeNull();
  });
  it("an unknown pocket falls back to the first one and is shown as unsure", () => {
    const a = toProductAnalysis({ ...raw, pocket_id: "made-up", match_confidence_pct: 95 }, ids);
    expect(a.product).toMatchObject({ pocketId: "fashion", matchConfidencePct: 50 });
  });
  it("a reply that does not match the schema is a failure, not a guess", () => {
    expect(() => toProductAnalysis({ name: "x" }, ids)).toThrow(AiFailedError);
  });
  it("trims long text and gives an emoji when missing", () => {
    const a = toProductAnalysis({ ...raw, name: "x".repeat(300), emoji: " " }, ids);
    expect(a.product.name.length).toBe(120);
    expect(a.product.emoji).toBe("🛍️");
  });
});

describe("extractJson", () => {
  it("reads plain JSON, fenced JSON and JSON inside text", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"a":{"b":2}} done')).toEqual({ a: { b: 2 } });
  });
  it("fails when there is no JSON", () => {
    expect(() => extractJson("sorry, I cannot")).toThrow(AiFailedError);
  });
});

describe("analysisPrompt", () => {
  const p = analysisPrompt([{ id: "fashion", name: "Fashion" }], "en");
  it("lists the pockets, forbids guessing prices and other products", () => {
    expect(p).toContain("- fashion: Fashion");
    expect(p).toMatch(/Never estimate or guess a price/);
    expect(p).toMatch(/Do not recommend or compare other products/);
  });
});

describe("formatMoney", () => {
  it("drops cents on whole amounts only, per language", () => {
    expect(formatMoney(330, "USD", "en")).toBe("$330");
    expect(formatMoney(89.9, "USD", "en")).toBe("$89.90");
    expect(formatMoney(90000, "IDR", "id").replace(/ /g, " ")).toBe("Rp 90.000");
  });
});

describe("reflection", () => {
  const ctx: ReflectContext = { productName: "NB", pocketName: "Fashion", status: "not_healthy", price: 89.9, remaining: 52, remainingAfter: -37.9, overBy: 37.9, displayWorkHours: 5, daysUntilRefill: 14, refillDate: "2026-11-01" };
  it("hands the model ready-made amounts", () => {
    expect(reflectionFacts(ctx, "USD", "en")).toMatchObject({ price: "$89.90", pocket_left_before: "$52", over_by: "$37.90", hours_of_work: 5, days_until_refill: 14, refill_date: "November 1" });
  });
  it("gives 'left after' only when it fits, never a negative balance", () => {
    expect(reflectionFacts(ctx, "USD", "en").pocket_left_after).toBeNull();
    expect(reflectionFacts({ ...ctx, status: "pocket_empty", remaining: 0, remainingAfter: 0, overBy: 89.9 }, "USD", "en").pocket_left_after).toBeNull();
    expect(reflectionFacts({ ...ctx, status: "healthy", remaining: 330, remainingAfter: 240.1, overBy: 0 }, "USD", "en").pocket_left_after).toBe("$240.10");
  });
  it("the prompt copies numbers, never shames, never suggests other products", () => {
    const p = reflectionSystemPrompt("en");
    expect(p).toMatch(/copy those strings exactly/);
    expect(p).toMatch(/Never calculate, round, convert or invent/);
    expect(p).toMatch(/Never shame/);
    expect(p).toMatch(/Never suggest other products/);
    expect(p).toMatch(/at most 2 sentences/i);
    expect(p).not.toMatch(/Indonesian|kantong/); // an English prompt must not mention the other language
    expect(reflectionSystemPrompt("id")).toMatch(/leave no English phrases/);
  });
  it("asks for Bahasa Indonesia in ID", () => {
    expect(reflectionSystemPrompt("id")).toContain("Bahasa Indonesia");
  });
});

describe("Future Me", () => {
  const profile: Profile = { ...seedProfile, workDays: [...seedProfile.workDays], pockets: seedPockets.map(({ id, name, allocationPct }) => ({ id, name, allocationPct })) };
  const wishlist = seedWishlist.map((w) => ({ ...w, createdAt: null }));
  const summary = buildSummary(profile, wishlist, []);
  const check = { name: "New Balance Fresh Foam 680", price: 89.9, pocketId: "fashion" };
  const reality = buildReality(profile, wishlist, [], check)!;

  it("builds the facts from stored data, with formatted amounts", () => {
    const f = futureMeFacts(profile, summary, { ...check, reality });
    expect(f.pockets[0]).toMatchObject({ name: "Fashion", monthly_budget: "$330", left_this_month: "$330", wishlisted_percent: 47 });
    expect(f.wishlist).toMatchObject({ total: "$514.59", percent_of_pockets: 47 });
    expect(f.checked).toMatchObject({ price: "$89.90", verdict: "fits", pocket_left_after: "$240.10", hours_of_work: 5, percent_of_income: 2.8 });
  });
  it("has no checked product when none is being discussed", () => {
    expect(futureMeFacts(profile, summary, null).checked).toBeNull();
  });
  it("the prompt carries the guardrails", () => {
    const p = futureMeSystemPrompt(profile, futureMeFacts(profile, summary, null), false);
    expect(p).toMatch(/copied from CONTEXT exactly/);
    expect(p).toMatch(/Never calculate, estimate, convert or invent a number/);
    expect(p).toMatch(/NEVER recommend or compare other products/);
    expect(p).toMatch(/cheaper or local alternatives/);
    expect(p).toMatch(/No financial advice/);
    expect(p).toMatch(/Never tell them to buy or not to buy/);
    expect(p).toMatch(/Never shame/);
    expect(p).toContain('"left_this_month":"$330"');
    expect(p).not.toMatch(/last message of the conversation/);
  });
  it("the English prompt does not mention Indonesian", () => {
    expect(futureMeSystemPrompt(profile, futureMeFacts(profile, summary, null), false)).not.toMatch(/Indonesian|kantong/);
  });
  it("the last turn wraps up, and the language follows the profile", () => {
    expect(futureMeSystemPrompt(profile, futureMeFacts(profile, summary, null), true)).toMatch(/last message of the conversation/);
    expect(futureMeSystemPrompt({ ...profile, language: "id" }, futureMeFacts(profile, summary, null), false)).toContain("Bahasa Indonesia");
  });
});
