/**
 * Request and response types for the Tap Twice API.
 * Mirrors api/src/schemas.ts (the authority) and the response shapes in REPO_CONTEXT.md §5.
 * Copied rather than imported so the web build doesn't depend on api/node_modules (zod).
 */

export type Language = "en" | "id";

export type Goal = {
  name: string; // 1–80 chars
  targetAmount: number; // IDR, > 0
  savedAmount: number; // IDR, ≥ 0
  targetDate: string; // YYYY-MM-DD
};

export type Profile = {
  nickname?: string; // API allows ≤ 40; the UI enforces ≤ 20
  age?: number; // never sent (BACKEND_GAPS.md #4)
  monthlyIncome: number; // IDR, > 0
  hoursPerWeek: number; // 1–120
  joyBudget: number; // IDR per month, ≥ 0
  goal: Goal;
  language: Language;
};

export type Paylater = {
  tenorMonths: number; // integer 1–36
  monthlyRatePct: number; // 0–20, flat
  adminFee: number; // IDR, ≥ 0
  lateFee?: number; // IDR, ≥ 0
};

export type CartItem = { name: string; quantity: number; unitPrice: number };

/** A cart after the user has checked and confirmed the extracted values (IDR, camelCase). */
export type Cart = {
  merchant?: string | null;
  items: CartItem[]; // ≤ 50
  total: number; // IDR, > 0
  paymentMethod?: string | null;
};

export type CartCheck = { cart: Cart; paylater?: Paylater | null };

/** What Gemini read from the screenshot. Note: snake_case (Gemini's schema). */
export type Extraction = {
  is_cart: boolean;
  merchant: string | null;
  items: { name: string; quantity: number; unit_price: number }[];
  subtotal: number | null;
  discounts: number | null;
  shipping: number | null;
  total: number | null;
  currency: string;
  payment_method: string | null;
  installment: {
    provider: string | null;
    tenor_months: number | null;
    monthly_amount: number | null;
    monthly_rate_pct: number | null;
    admin_fee: number | null;
  } | null;
  confidence: "high" | "medium" | "low";
};

export type ExtractRequest = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  data: string; // base64, no "data:" prefix
};

export type FxInfo = {
  currency: string;
  rateToIdr: number;
  date: string;
  source: "ECB via Frankfurter";
};

export type ExtractResponse = {
  extraction: Extraction; // as read, original currency
  idr: Extraction | null; // same, in whole rupiah; null when no rate exists
  fx: FxInfo | null;
};

export type Cost = {
  total: number;
  hourlyRate: number;
  hoursOfWork: number; // 1 decimal
  goal: { name: string; monthlySaving: number | null; delayDays: number | null };
  joy: {
    budget: number;
    spentThisMonth: number;
    leftBefore: number;
    leftAfter: number;
    usedPct: number | null;
  };
  paylater: {
    tenorMonths: number;
    monthlyInstallment: number;
    totalPaid: number;
    extraCost: number;
    extraCostPct: number;
    lateFee: number | null;
  } | null;
};

export type ReflectResponse = { cost: Cost; reflection: string | null };
export type CostResponse = { cost: Cost };

export type ChatMessage = { role: "user" | "model"; text: string }; // text ≤ 2000
export type FutureMeRequest = CartCheck & { messages: ChatMessage[] }; // ≤ 20 messages

export type FutureMeEvent =
  | { type: "tool"; name: string }
  | { type: "text"; text: string }
  | { type: "done"; turnsLeft: number }
  | { type: "error" };

export type WishlistItem = {
  id: string;
  name: string;
  price: number;
  merchant: string | null;
  createdAt: string;
};

export type NewWishlistItem = { name: string; price: number; merchant?: string | null };

export type Decision = {
  id: string;
  action: "buy" | "save";
  title: string;
  total: number;
  createdAt: string;
};

export type NewDecision = {
  action: "buy" | "save";
  title: string;
  total: number;
  paylater?: Paylater | null;
};

export type DecisionsResponse = {
  decisions: Decision[]; // this calendar month, Jakarta time
  spentThisMonth: number;
  joyBudgetLeft: number | null; // null when there is no profile yet
};

/** Every error body is `{ error: string }`. */
export type ApiErrorCode =
  | "unauthenticated"
  | "no_profile"
  | "extraction_failed"
  | "conversation_over"
  | "internal"
  | `invalid_${string}`
  | (string & {});
