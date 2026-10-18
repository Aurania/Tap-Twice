import { ApiError, readEventStream, send } from "@/api/client";
import {
  AiError,
  type AiService,
  type ChatTurn,
  type FutureMeContext,
  type FutureMeEvent,
  type IdentifiedProduct,
  type PocketOption,
  type PriceReading,
  type ProductInput,
  type ReflectContext,
} from "./types";

type Analysis = { product: IdentifiedProduct; price: PriceReading | null };

/**
 * The real provider: Gemini on Vertex AI, always through our API (the browser never calls the model).
 * - identifyProduct and readPrice share one server call (`/api/ai/analyze`); the price is kept for readPrice.
 * - The server picks the pocket from the user's own pockets and builds every number the model may mention.
 * Select it with VITE_AI_PROVIDER=gemini; the mock stays the default.
 */
export class GeminiAiService implements AiService {
  private last: { input: ProductInput; price: PriceReading | null } | null = null;

  private async analyze(input: ProductInput, signal?: AbortSignal): Promise<Analysis> {
    try {
      const res = await send("POST", "/api/ai/analyze", { input }, signal);
      return (await res.json()) as Analysis;
    } catch (err) {
      if (signal?.aborted) throw err;
      if (err instanceof ApiError && err.code === "not_a_product") throw new AiError("not_a_product");
      throw new AiError("offline");
    }
  }

  async identifyProduct(input: ProductInput, _pockets: PocketOption[], signal?: AbortSignal): Promise<IdentifiedProduct> {
    const analysis = await this.analyze(input, signal);
    this.last = { input, price: analysis.price };
    return analysis.product;
  }

  async readPrice(input: ProductInput, signal?: AbortSignal): Promise<PriceReading | null> {
    if (this.last?.input === input) return this.last.price;
    const analysis = await this.analyze(input, signal);
    this.last = { input, price: analysis.price };
    return analysis.price;
  }

  async reflect(context: ReflectContext, signal?: AbortSignal): Promise<string | null> {
    try {
      const { currency: _currency, ...numbers } = context; // the server knows the currency
      const res = await send("POST", "/api/ai/reflect", numbers, signal);
      return ((await res.json()) as { reflection: string | null }).reflection;
    } catch (err) {
      if (signal?.aborted) throw err;
      return null; // the card shows without the paragraph
    }
  }

  async *futureMeChat(context: FutureMeContext, messages: ChatTurn[], signal?: AbortSignal): AsyncGenerator<FutureMeEvent> {
    let res: Response;
    try {
      const checked = context.checked && { name: context.checked.name, price: context.checked.price, pocketId: context.checked.pocketId };
      res = await send("POST", "/api/ai/future-me", { messages, checked }, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new AiError("unreachable");
    }
    try {
      yield* readEventStream<FutureMeEvent>(res);
    } catch (err) {
      if (signal?.aborted) throw err;
      yield { type: "error" };
    }
  }
}
