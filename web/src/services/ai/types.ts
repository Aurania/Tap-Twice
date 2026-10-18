import type { Currency, RealityStatus } from "@/api/v2";

/** What the user gives the check flow: a photo or screenshot, or a pasted link. */
export type ProductInput =
  | { kind: "image"; mimeType: "image/jpeg" | "image/png" | "image/webp"; data: string } // base64, no "data:" prefix
  | { kind: "link"; url: string };

export type PocketOption = { id: string; name: string };

export type IdentifiedProduct = {
  name: string;
  /** "Running shoes · Men's" */
  detail: string | null;
  /** Icon for the wishlist tile, "👟". */
  emoji: string;
  /** The pocket the AI matched this product to. */
  pocketId: string;
  /** "AI matched · 92% sure" */
  matchConfidencePct: number;
};

export type PriceReading = { price: number; currency: string | null };

/** A product the user just checked, with the server's verdict. Future Me may talk about it. */
export type CheckedProduct = {
  name: string;
  emoji: string;
  price: number;
  pocketId: string;
  pocketName: string;
  status: RealityStatus;
  remainingAfter: number;
  overBy: number;
  displayWorkHours: number;
  daysUntilRefill: number;
};

/** Everything Future Me may mention. All numbers come from the server (summary + check), never computed here. */
export type FutureMeContext = {
  nickname?: string;
  currency: Currency;
  pockets: { id: string; name: string; budget: number; remaining: number; wishlistPct: number | null }[];
  /** Present when the chat opens from a Reality card or the nudge. */
  checked?: CheckedProduct;
};

/** What the Reality card paragraph may mention. All numbers come from the server (`/api/check`). */
export type ReflectContext = {
  currency: Currency;
  productName: string;
  pocketName: string;
  status: RealityStatus;
  price: number;
  /** What was left in the pocket before this purchase. */
  remaining: number;
  remainingAfter: number;
  overBy: number;
  displayWorkHours: number;
  daysUntilRefill: number;
  /** "YYYY-MM-DD" */
  refillDate: string;
};

export type ChatTurn = { role: "user" | "model"; text: string };

/** Same shape as the SSE events the real API will stream. */
export type FutureMeEvent =
  | { type: "tool"; name: string }
  | { type: "text"; text: string }
  | { type: "done"; turnsLeft: number }
  | { type: "error" };

/** Future Me allows this many user messages per conversation. */
export const MAX_USER_TURNS = 6;

/**
 * The failures the UI turns into negative-case states:
 * - not_a_product: N4, the AI does not see a product (or it is blurry)
 * - offline: N6, the request failed or timed out
 * - unreachable: Future Me can't be reached ("07e")
 */
export type AiErrorCode = "not_a_product" | "offline" | "unreachable";

export class AiError extends Error {
  readonly code: AiErrorCode;
  constructor(code: AiErrorCode) {
    super(`AI error: ${code}`);
    this.name = "AiError";
    this.code = code;
  }
}

/**
 * The one interface every AI feature goes through. Screens never talk to a provider directly.
 * Implementations: MockAiService (default) and GeminiAiService (phase 9).
 */
export interface AiService {
  /** Names the product and picks a pocket. Throws AiError("not_a_product" | "offline"). */
  identifyProduct(input: ProductInput, pockets: PocketOption[], signal?: AbortSignal): Promise<IdentifiedProduct>;

  /**
   * Reads the price off the photo or link. Resolves null when no price is visible (N5: the user types it).
   * Throws AiError("offline").
   */
  readPrice(input: ProductInput, signal?: AbortSignal): Promise<PriceReading | null>;

  /**
   * Two warm sentences for the Reality card ("Great shoes, wrong week…"). Resolves null when it cannot write one;
   * the card then shows without it. Throws nothing the UI needs to handle.
   */
  reflect(context: ReflectContext, signal?: AbortSignal): Promise<string | null>;

  /**
   * Pocket-aware reflection chat. First call: empty `messages`; the service opens the conversation.
   * Rejects with AiError("unreachable") if it cannot start; a failure mid-stream yields { type: "error" }.
   * It never suggests other products.
   */
  futureMeChat(context: FutureMeContext, messages: ChatTurn[], signal?: AbortSignal): AsyncGenerator<FutureMeEvent>;
}
