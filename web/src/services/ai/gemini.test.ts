import { afterEach, describe, expect, it, vi } from "vitest";
import type { FutureMeContext } from "./types";

// The client reads Vite env and Firebase at import time; stand them in.
vi.mock("@/config", () => ({ config: { apiUrl: "http://api.test", firebase: {} } }));
vi.mock("@/auth/firebase", () => ({ getIdToken: async () => "token", reauthenticate: async () => undefined }));

const { GeminiAiService } = await import("./gemini");
const { AiError } = await import("./types");

const photo = { kind: "image", mimeType: "image/jpeg", data: "AAAA" } as const;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const sse = (...events: object[]) => new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""), { status: 200, headers: { "content-type": "text/event-stream" } });

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
afterEach(() => fetchMock.mockReset());

const analysis = {
  product: { name: "New Balance Fresh Foam 680", detail: null, emoji: "👟", pocketId: "fashion", matchConfidencePct: 92 },
  price: { price: 89.9, currency: "USD" },
};
const lastBody = () => JSON.parse(fetchMock.mock.calls.at(-1)![1].body as string);
const lastUrl = () => fetchMock.mock.calls.at(-1)![0] as string;

describe("GeminiAiService.identifyProduct / readPrice", () => {
  it("reads the product through the API and keeps the price for readPrice (one call)", async () => {
    fetchMock.mockResolvedValueOnce(json(analysis));
    const ai = new GeminiAiService();
    expect(await ai.identifyProduct(photo, [])).toEqual(analysis.product);
    expect(lastUrl()).toBe("http://api.test/api/ai/analyze");
    expect(lastBody()).toEqual({ input: photo });
    expect(await ai.readPrice(photo)).toEqual({ price: 89.9, currency: "USD" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("N5: a null price comes through as null", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...analysis, price: null }));
    const ai = new GeminiAiService();
    await ai.identifyProduct(photo, []);
    expect(await ai.readPrice(photo)).toBeNull();
  });
  it("N4: a 422 not_a_product becomes AiError(not_a_product)", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "not_a_product" }, 422));
    await expect(new GeminiAiService().identifyProduct(photo, [])).rejects.toMatchObject({ code: "not_a_product" });
  });
  it("N6: a server or network failure becomes AiError(offline)", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "ai_failed" }, 502));
    await expect(new GeminiAiService().identifyProduct(photo, [])).rejects.toMatchObject({ code: "offline" });
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(new GeminiAiService().readPrice(photo)).rejects.toBeInstanceOf(AiError);
  });
});

describe("GeminiAiService.reflect", () => {
  const ctx = { currency: "USD", productName: "NB", pocketName: "Fashion", status: "healthy", price: 89.9, remaining: 330, remainingAfter: 240.1, overBy: 0, displayWorkHours: 5, daysUntilRefill: 14, refillDate: "2026-11-01" } as const;
  it("sends the numbers (not the currency) and returns the text", async () => {
    fetchMock.mockResolvedValueOnce(json({ reflection: "Solid pick." }));
    expect(await new GeminiAiService().reflect(ctx)).toBe("Solid pick.");
    expect(lastBody()).not.toHaveProperty("currency");
    expect(lastBody()).toMatchObject({ productName: "NB", remainingAfter: 240.1 });
  });
  it("is null when it fails", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "internal" }, 500));
    expect(await new GeminiAiService().reflect(ctx)).toBeNull();
  });
});

describe("GeminiAiService.futureMeChat", () => {
  const context: FutureMeContext = {
    currency: "USD",
    pockets: [],
    checked: { name: "NB", emoji: "👟", price: 89.9, pocketId: "fashion", pocketName: "Fashion", status: "healthy", remainingAfter: 240.1, overBy: 0, displayWorkHours: 5, daysUntilRefill: 14 },
  };
  const collect = async (gen: AsyncGenerator<unknown>) => {
    const out: unknown[] = [];
    for await (const e of gen) out.push(e);
    return out;
  };

  it("streams the events and only sends what the server needs to rebuild the context", async () => {
    fetchMock.mockResolvedValueOnce(sse({ type: "text", text: "Hi " }, { type: "text", text: "there" }, { type: "done", turnsLeft: 6 }));
    const events = await collect(new GeminiAiService().futureMeChat(context, [{ role: "user", text: "hello" }]));
    expect(events).toEqual([{ type: "text", text: "Hi " }, { type: "text", text: "there" }, { type: "done", turnsLeft: 6 }]);
    expect(lastUrl()).toBe("http://api.test/api/ai/future-me");
    expect(lastBody()).toEqual({ messages: [{ role: "user", text: "hello" }], checked: { name: "NB", price: 89.9, pocketId: "fashion" } });
  });
  it("sends no checked product from Home", async () => {
    fetchMock.mockResolvedValueOnce(sse({ type: "done", turnsLeft: 6 }));
    await collect(new GeminiAiService().futureMeChat({ currency: "USD", pockets: [] }, []));
    expect(lastBody()).toEqual({ messages: [] });
  });
  it("07e: rejects with AiError(unreachable) when it cannot start", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "internal" }, 500));
    await expect(collect(new GeminiAiService().futureMeChat(context, []))).rejects.toMatchObject({ code: "unreachable" });
  });
  it("an error event from the server reaches the sheet", async () => {
    fetchMock.mockResolvedValueOnce(sse({ type: "text", text: "Hi" }, { type: "error" }));
    expect(await collect(new GeminiAiService().futureMeChat(context, []))).toEqual([{ type: "text", text: "Hi" }, { type: "error" }]);
  });
});
