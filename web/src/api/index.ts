import { config } from "@/config";
import { readEventStream, request, send } from "./client";
import type {
  CartCheck,
  CostResponse,
  DecisionsResponse,
  ExtractRequest,
  ExtractResponse,
  FutureMeEvent,
  FutureMeRequest,
  NewDecision,
  NewWishlistItem,
  Profile,
  ReflectResponse,
  WishlistItem,
} from "./types";

export { ApiError, setNoProfileHandler } from "./client";
export type * from "./types";

/** One function per endpoint in REPO_CONTEXT.md §5. */
export const api = {
  /** No auth. Used by /dev/components to check the API is up. */
  async health(): Promise<{ ok: boolean; model: string }> {
    const res = await fetch(`${config.apiUrl}/api/health`);
    if (!res.ok) throw new Error(`health ${res.status}`);
    return res.json();
  },

  // Profile
  getProfile: () => request<{ profile: Profile | null }>("GET", "/api/profile"),
  putProfile: (profile: Profile) => request<{ profile: Profile }>("PUT", "/api/profile", profile),
  deleteMe: () => request<{ ok: true }>("DELETE", "/api/me"),

  // Cart Check
  extract: (image: ExtractRequest) => request<ExtractResponse>("POST", "/api/extract", image),
  /** Once, when the reality card opens. Numbers + AI reflection. */
  reflect: (input: CartCheck) => request<ReflectResponse>("POST", "/api/reflect", input),
  /** Numbers only, no AI. For paylater edits and plan rows. */
  cost: (input: CartCheck) => request<CostResponse>("POST", "/api/cost", input),

  /** Future Me over SSE. First call with `messages: []`; then send the whole history. */
  async *futureMe(input: FutureMeRequest, signal?: AbortSignal): AsyncGenerator<FutureMeEvent> {
    const res = await send("POST", "/api/future-me", input, signal);
    yield* readEventStream<FutureMeEvent>(res);
  },

  // Wishlist (Saved for later)
  listWishlist: () => request<{ items: WishlistItem[] }>("GET", "/api/wishlist"),
  addWishlist: (item: NewWishlistItem) => request<{ id: string }>("POST", "/api/wishlist", item),
  removeWishlist: (id: string) =>
    request<{ ok: true }>("DELETE", `/api/wishlist/${encodeURIComponent(id)}`),

  // Decisions (Buy / Save)
  listDecisions: () => request<DecisionsResponse>("GET", "/api/decisions"),
  addDecision: (decision: NewDecision) => request<{ id: string }>("POST", "/api/decisions", decision),
};
