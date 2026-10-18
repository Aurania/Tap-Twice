/** Shared API basics. The v2 request/response types live in ./v2. */

export type Language = "en" | "id";

/** Every error body is `{ error: string }`. */
export type ApiErrorCode =
  | "unauthenticated"
  | "no_profile"
  | "internal"
  | `invalid_${string}`
  | (string & {});
