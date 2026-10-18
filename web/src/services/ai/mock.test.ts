import { afterEach, describe, expect, it } from "vitest";
import { MockAiService, setMockScenario } from "./mock";
import { AiError, MAX_USER_TURNS, type FutureMeContext, type FutureMeEvent, type PocketOption, type ReflectContext } from "./types";

const ai = new MockAiService(0);
const pockets: PocketOption[] = [
  { id: "fashion", name: "Fashion" },
  { id: "gadgets", name: "Gadgets" },
  { id: "entertainment", name: "Entertainment" },
  { id: "travel", name: "Travel" },
];
const photo = { kind: "image", mimeType: "image/jpeg", data: "AAAA" } as const;

const ctx: FutureMeContext = {
  nickname: "Sarah",
  currency: "USD",
  pockets: [
    { id: "fashion", name: "Fashion", budget: 330, remaining: 330, wishlistPct: 47 },
    { id: "travel", name: "Travel", budget: 275, remaining: 275, wishlistPct: 65 },
  ],
};

async function collect(gen: AsyncGenerator<FutureMeEvent>) {
  const events: FutureMeEvent[] = [];
  for await (const e of gen) events.push(e);
  return events;
}
const textOf = (events: FutureMeEvent[]) => events.flatMap((e) => (e.type === "text" ? [e.text] : [])).join("");

afterEach(() => setMockScenario("ok"));

describe("MockAiService.identifyProduct", () => {
  it("names the sample shoes and matches Fashion at 92%", async () => {
    expect(await ai.identifyProduct(photo, pockets)).toEqual({
      name: "New Balance Fresh Foam 680",
      detail: "Running shoes · Men's",
      emoji: "👟",
      pocketId: "fashion",
      matchConfidencePct: 92,
    });
  });
  it("matches a link by keyword, and falls back to the first pocket with low confidence", async () => {
    expect((await ai.identifyProduct({ kind: "link", url: "https://shop.example/sony-earbuds" }, pockets)).pocketId).toBe("gadgets");
    const unknown = await ai.identifyProduct({ kind: "link", url: "https://shop.example/xyz" }, pockets);
    expect(unknown).toMatchObject({ pocketId: "fashion", matchConfidencePct: 55 });
  });
  it("N4: not_a_product scenario throws", async () => {
    setMockScenario("not_a_product");
    await expect(ai.identifyProduct(photo, pockets)).rejects.toMatchObject({ code: "not_a_product" });
  });
  it("N6: offline scenario throws", async () => {
    setMockScenario("offline");
    await expect(ai.identifyProduct(photo, pockets)).rejects.toBeInstanceOf(AiError);
  });
  it("only ever returns a pocket the user has", async () => {
    const only = [{ id: "travel", name: "Travel" }];
    expect((await ai.identifyProduct(photo, only)).pocketId).toBe("travel");
  });
});

describe("MockAiService.readPrice", () => {
  it("reads the sample price", async () => {
    expect(await ai.readPrice(photo)).toEqual({ price: 89.9, currency: "USD" });
  });
  it("N5: no_price scenario resolves null", async () => {
    setMockScenario("no_price");
    expect(await ai.readPrice(photo)).toBeNull();
  });
  it("N6: offline scenario throws", async () => {
    setMockScenario("offline");
    await expect(ai.readPrice(photo)).rejects.toMatchObject({ code: "offline" });
  });
});

describe("MockAiService.futureMeChat", () => {
  it("opens from a checked product with the server's numbers", async () => {
    const events = await collect(
      ai.futureMeChat(
        { ...ctx, checked: { name: "New Balance Fresh Foam 680", emoji: "👟", price: 89.9, pocketName: "Fashion", status: "healthy", remainingAfter: 240.1, overBy: 0, displayWorkHours: 5, daysUntilRefill: 14 } },
        [],
      ),
    );
    expect(events[0]).toEqual({ type: "tool", name: "check_pockets" });
    expect(events.at(-1)).toEqual({ type: "done", turnsLeft: MAX_USER_TURNS });
    const text = textOf(events);
    expect(text).toContain("$240.10");
    expect(text).toContain("5 hours");
  });
  it("is never pushy on Not healthy and never suggests other products", async () => {
    const text = textOf(
      await collect(
        ai.futureMeChat(
          { ...ctx, checked: { name: "Sneakers", emoji: "👟", price: 89.9, pocketName: "Fashion", status: "not_healthy", remainingAfter: -37.9, overBy: 37.9, displayWorkHours: 5, daysUntilRefill: 14 } },
          [],
        ),
      ),
    );
    expect(text).toContain("your call");
    expect(text).not.toMatch(/cheaper|alternative|instead|try these/i);
  });
  it("opens from Home about the most wishlisted pocket", async () => {
    expect(textOf(await collect(ai.futureMeChat(ctx, [])))).toContain("Travel pocket is 65% wishlisted");
  });
  it("counts down the user turns", async () => {
    const history = [
      { role: "model", text: "Hi" },
      { role: "user", text: "Maybe" },
    ] as const;
    const events = await collect(ai.futureMeChat(ctx, [...history]));
    expect(events.at(-1)).toEqual({ type: "done", turnsLeft: MAX_USER_TURNS - 1 });
  });
  it("answers the quick replies from the numbers it was given", async () => {
    const checked = { name: "Sneakers", emoji: "👟", price: 89.9, pocketName: "Fashion", status: "not_healthy" as const, remainingAfter: -37.9, overBy: 37.9, displayWorkHours: 5, daysUntilRefill: 14 };
    const turn = (text: string) => [{ role: "model" as const, text: "Hi" }, { role: "user" as const, text }];
    expect(textOf(await collect(ai.futureMeChat({ ...ctx, checked }, turn("Can it wait?"))))).toContain("refills in 14 days");
    expect(textOf(await collect(ai.futureMeChat({ ...ctx, checked }, turn("How did you get these numbers?"))))).toContain("income");
  });
  it("yields an error event past the turn limit", async () => {
    const many = Array.from({ length: MAX_USER_TURNS + 1 }, () => ({ role: "user" as const, text: "x" }));
    expect(await collect(ai.futureMeChat(ctx, many))).toEqual([{ type: "error" }]);
  });
  it("07e: unreachable scenario rejects before streaming", async () => {
    setMockScenario("unreachable");
    await expect(collect(ai.futureMeChat(ctx, []))).rejects.toMatchObject({ code: "unreachable" });
  });
  it("stops when aborted", async () => {
    const ctrl = new AbortController();
    const slow = new MockAiService(1);
    const run = collect(slow.futureMeChat(ctx, [], ctrl.signal));
    ctrl.abort();
    await expect(run).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("MockAiService.reflect", () => {
  const base: ReflectContext = {
    currency: "USD",
    productName: "New Balance Fresh Foam 680",
    pocketName: "Fashion",
    status: "healthy",
    price: 89.9,
    remaining: 330,
    remainingAfter: 240.1,
    overBy: 0,
    displayWorkHours: 5,
    daysUntilRefill: 14,
    refillDate: "2026-11-01",
  };
  it("healthy: mentions what is left after", async () => {
    expect(await ai.reflect(base)).toContain("$240.10");
  });
  it("not healthy: says how far over and the days to the refill", async () => {
    const text = await ai.reflect({ ...base, status: "not_healthy", remaining: 52, remainingAfter: -37.9, overBy: 37.9 });
    expect(text).toContain("$52");
    expect(text).toContain("$37.90 over");
    expect(text).toContain("14 days");
  });
  it("pocket empty: says until when", async () => {
    const text = await ai.reflect({ ...base, status: "pocket_empty", remaining: 0, remainingAfter: 0, overBy: 89.9 });
    expect(text).toContain("$0 until Nov 1");
  });
  it("is null when the AI cannot be reached", async () => {
    setMockScenario("offline");
    expect(await ai.reflect(base)).toBeNull();
  });
});
