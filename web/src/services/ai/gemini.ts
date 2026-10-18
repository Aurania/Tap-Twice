import type { AiService, ChatTurn, FutureMeContext, FutureMeEvent, IdentifiedProduct, PocketOption, PriceReading, ProductInput } from "./types";

/**
 * The real provider (Gemini on Vertex AI, through our API). Not wired yet.
 * TODO(phase 9): add the API routes (identify, price, future-me SSE) and call them here.
 * Until then selecting it fails loudly instead of silently falling back to the mock.
 */
export class GeminiAiService implements AiService {
  identifyProduct(_input: ProductInput, _pockets: PocketOption[], _signal?: AbortSignal): Promise<IdentifiedProduct> {
    return Promise.reject(notWired());
  }

  readPrice(_input: ProductInput, _signal?: AbortSignal): Promise<PriceReading | null> {
    return Promise.reject(notWired());
  }

  // eslint-disable-next-line require-yield
  async *futureMeChat(_context: FutureMeContext, _messages: ChatTurn[], _signal?: AbortSignal): AsyncGenerator<FutureMeEvent> {
    throw notWired();
  }
}

const notWired = () => new Error("GeminiAiService is not wired yet (phase 9). Use VITE_AI_PROVIDER=mock.");
