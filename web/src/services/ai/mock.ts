import { formatMoney } from "@/lib/format";
import {
  AiError,
  MAX_USER_TURNS,
  type AiService,
  type ChatTurn,
  type FutureMeContext,
  type FutureMeEvent,
  type IdentifiedProduct,
  type PocketOption,
  type ReflectContext,
  type ForeignPrice,
  type PriceReading,
  type ProductInput,
} from "./types";

/**
 * What the mock should do. "ok" is the happy path; every other value triggers one negative case so
 * each state can be reached in the real app (set it from /dev/components or with setMockScenario).
 * "camera_denied" is not an AI failure: the Snap screen reads it to show N3 without changing browser permissions.
 */
export type MockScenario = "ok" | "not_a_product" | "no_price" | "converted" | "foreign_price" | "offline" | "unreachable" | "camera_denied";

export const MOCK_SCENARIOS: readonly MockScenario[] = ["ok", "not_a_product", "no_price", "converted", "foreign_price", "offline", "unreachable", "camera_denied"];

const STORAGE_KEY = "tt.ai.mock";
let scenario: MockScenario = readStored();

function readStored(): MockScenario {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return MOCK_SCENARIOS.includes(v as MockScenario) ? (v as MockScenario) : "ok";
  } catch {
    return "ok";
  }
}

export const getMockScenario = (): MockScenario => scenario;

export function setMockScenario(next: MockScenario): void {
  scenario = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be blocked; the scenario still applies for this session.
  }
}

/** Sample product used by the happy path (from the Figma handoff). Price is sample data. */
const SAMPLE = { name: "New Balance Fresh Foam 680", detail: "Running shoes · Men's", price: 89.9 };

/** Keyword → pocket, for links. Images always resolve to the sample shoes. */
const POCKET_KEYWORDS: [RegExp, string, string, string][] = [
  [/shoe|sneaker|jacket|denim|shirt|dress|bag/, "fashion", "Fashion item", "👕"],
  [/earbud|headphone|phone|laptop|camera|watch|speaker/, "gadgets", "Gadget", "🎧"],
  [/game|switch|ticket|movie|concert|netflix/, "entertainment", "Entertainment", "🎮"],
  [/flight|hotel|trip|resort|airbnb/, "travel", "Trip", "✈️"],
];

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

/** Deterministic, offline AiService. Same results for the same input; no network. */
export class MockAiService implements AiService {
  /** `delayMs` scales all waits; tests pass 0. */
  constructor(private readonly delayMs = 1) {}

  private wait(ms: number, signal?: AbortSignal) {
    return sleep(ms * this.delayMs, signal);
  }

  async identifyProduct(input: ProductInput, pockets: PocketOption[], signal?: AbortSignal): Promise<IdentifiedProduct> {
    await this.wait(700, signal);
    if (scenario === "offline") throw new AiError("offline");
    if (scenario === "not_a_product") throw new AiError("not_a_product");

    const fallback = pockets[0];
    if (!fallback) throw new AiError("not_a_product");

    if (input.kind === "link") {
      const url = input.url.toLowerCase();
      for (const [pattern, pocketId, label, emoji] of POCKET_KEYWORDS) {
        if (pattern.test(url) && pockets.some((p) => p.id === pocketId)) {
          return { name: label, detail: null, emoji, pocketId, matchConfidencePct: 78 };
        }
      }
      return { name: "Product from link", detail: null, emoji: "🛍️", pocketId: fallback.id, matchConfidencePct: 55 };
    }

    const fashion = pockets.find((p) => p.id === "fashion");
    return { name: SAMPLE.name, detail: SAMPLE.detail, emoji: "👟", pocketId: (fashion ?? fallback).id, matchConfidencePct: fashion ? 92 : 55 };
  }

  async readPrice(_input: ProductInput, signal?: AbortSignal): Promise<PriceReading | ForeignPrice | null> {
    await this.wait(500, signal);
    if (scenario === "offline") throw new AiError("offline");
    if (scenario === "no_price") return null;
    // As the server sends it: a price read in pounds, converted with the day's ECB rate.
    if (scenario === "converted") {
      return { price: SAMPLE.price, currency: "USD", original: { price: 71.2, currency: "GBP", rate: 1.2626, date: "2026-10-16", source: "ECB via Frankfurter" } };
    }
    if (scenario === "foreign_price") return { price: null, currency: "VND", amount: 2_290_000 };
    return { price: SAMPLE.price, currency: "USD" };
  }

  async reflect(c: ReflectContext, signal?: AbortSignal): Promise<string | null> {
    await this.wait(400, signal);
    if (scenario === "offline" || scenario === "unreachable") return null;
    const m = (n: number) => formatMoney(n, c.currency, "en");
    const refill = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${c.refillDate}T00:00:00Z`));
    if (c.status === "healthy") return `Solid pick. ${c.pocketName} still has ${m(c.remainingAfter)} after this, so it fits your month. Still feeling it?`;
    if (c.status === "not_healthy") return `${c.pocketName} only has ${m(c.remaining)} left, so this goes ${m(c.overBy)} over. Wait ${c.daysUntilRefill} days for the refill?`;
    return `Your ${c.pocketName} pocket is at ${m(0)} until ${refill}. This would have to come out of another pocket. Wait, or add it to your wishlist?`;
  }

  async *futureMeChat(context: FutureMeContext, messages: ChatTurn[], signal?: AbortSignal): AsyncGenerator<FutureMeEvent> {
    if (scenario === "unreachable") throw new AiError("unreachable");

    const userTurns = messages.filter((m) => m.role === "user").length;
    if (userTurns > MAX_USER_TURNS) {
      yield { type: "error" };
      return;
    }

    yield { type: "tool", name: "check_pockets" };
    await this.wait(400, signal);

    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";
    const reply = userTurns === 0 ? opening(context) : followUp(context, userTurns, lastUser);
    for (const word of reply.split(/(?<=\s)/)) {
      await this.wait(25, signal);
      yield { type: "text", text: word };
    }
    yield { type: "done", turnsLeft: MAX_USER_TURNS - userTurns };
  }
}

const money = (amount: number, ctx: FutureMeContext) => formatMoney(amount, ctx.currency, "en");

/** The pocket the chat is about: the checked product's pocket, else the most wishlisted one. */
function focusPocket(ctx: FutureMeContext) {
  const ranked = ctx.pockets.filter((p) => p.wishlistPct !== null).sort((a, b) => (b.wishlistPct ?? 0) - (a.wishlistPct ?? 0));
  return ranked[0];
}

function opening(ctx: FutureMeContext): string {
  const c = ctx.checked;
  if (c) {
    if (c.status === "healthy") {
      return `${c.name} fits your ${c.pocketName} pocket: ${money(c.remainingAfter, ctx)} would still be left, and it's about ${c.displayWorkHours} hours of your work. Still feeling it?`;
    }
    if (c.status === "not_healthy") {
      return `${c.name} is more than what's left in ${c.pocketName} right now, and it's about ${c.displayWorkHours} hours of your work. It's your call, I'm not here to block you. What's pulling you toward it?`;
    }
    return `Your ${c.pocketName} pocket has nothing left this month. It's your call. Can this wait until next month, or does it matter more than what you planned?`;
  }
  const focus = focusPocket(ctx);
  const hello = ctx.nickname ? `Hey ${ctx.nickname}!` : "Hey!";
  if (focus && focus.wishlistPct) {
    return `${hello} Your ${focus.name} pocket is ${focus.wishlistPct}% wishlisted. Want to talk through what's in there before you add more?`;
  }
  return `${hello} Tell me what you're thinking of buying and we'll think it through together with your pockets.`;
}

function followUp(ctx: FutureMeContext, userTurns: number, lastUser = ""): string {
  const c = ctx.checked;
  const said = lastUser.toLowerCase();
  if (said.includes("numbers")) {
    return "They come from your income, your work hours and your pocket budgets. I only read them back to you, so double-check them against what you know.";
  }
  if (said.includes("wait") && c) {
    return `Waiting is a real option. ${c.pocketName} refills in ${c.daysUntilRefill} days, and ${c.name} can sit on your wishlist until then. No rush either way.`;
  }
  const focus = c ? ctx.pockets.find((p) => p.name === c.pocketName) : focusPocket(ctx);
  const left = focus ? `${money(focus.remaining, ctx)} left in ${focus.name}` : "your pockets";
  const options = [
    `That makes sense. For reference, you have ${left} this month. How would you feel about it in a week?`,
    `Fair. If you'd still want it after a few days, that tells you something. Nothing wrong with waiting, or with buying it.`,
    `Thanks for being honest about that. Whatever you decide, the numbers are on your side: you know exactly where ${focus?.name ?? "your money"} stands.`,
  ];
  return options[(userTurns - 1) % options.length] ?? options[0]!;
}
