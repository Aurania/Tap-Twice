import { z } from "zod";

const money = z.number().finite().min(0);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const LanguageSchema = z.enum(["en", "id"]);
export type Language = z.infer<typeof LanguageSchema>;

export const ProfileSchema = z.object({
  nickname: z.string().trim().max(40).optional(),
  age: z.number().int().min(15).max(80).optional(),
  monthlyIncome: z.number().finite().positive(),
  hoursPerWeek: z.number().finite().min(1).max(120),
  joyBudget: money,
  goal: z.object({
    name: z.string().trim().min(1).max(80),
    targetAmount: z.number().finite().positive(),
    savedAmount: money,
    targetDate: isoDate,
  }),
  language: LanguageSchema,
});
export type Profile = z.infer<typeof ProfileSchema>;

export const PaylaterSchema = z.object({
  tenorMonths: z.number().int().min(1).max(36),
  monthlyRatePct: z.number().finite().min(0).max(20),
  adminFee: money,
  lateFee: money.optional(),
});

/** A cart after the user has checked and confirmed the extracted values. */
export const CartSchema = z.object({
  merchant: z.string().max(80).nullish(),
  items: z
    .array(z.object({ name: z.string().max(200), quantity: z.number().int().min(1), unitPrice: money }))
    .max(50),
  total: z.number().finite().positive(),
  paymentMethod: z.string().max(80).nullish(),
});
export type Cart = z.infer<typeof CartSchema>;

export const CartCheckSchema = z.object({
  cart: CartSchema,
  paylater: PaylaterSchema.nullish(),
});

/** What Gemini returns when reading a screenshot. Sent to Gemini as the response schema. */
export const ExtractionSchema = z.object({
  is_cart: z.boolean().describe("True if the image is a shopping cart, checkout page, order summary, receipt or product promo with a price."),
  merchant: z.string().nullable().describe("Marketplace or shop, e.g. Shopee, Tokopedia, TikTok Shop. Null if unknown."),
  items: z
    .array(
      z.object({
        name: z.string().describe("Short product name, without variant noise."),
        quantity: z.number().int(),
        unit_price: z.number().describe("Price per unit in the cart currency, as a plain number (no dots or symbols)."),
      }),
    )
    .describe("Only items that are selected for checkout."),
  subtotal: z.number().nullable(),
  discounts: z.number().nullable().describe("Total of all discounts and vouchers, as a positive number."),
  shipping: z.number().nullable().describe("Shipping cost after shipping discounts."),
  total: z.number().nullable().describe("Final amount the user will pay now (or the total financed for paylater)."),
  currency: z.string().describe("ISO currency code, usually IDR."),
  payment_method: z.string().nullable().describe("e.g. ShopeePay, GoPay, SPayLater, Kredivo, COD, bank transfer."),
  installment: z
    .object({
      provider: z.string().nullable(),
      tenor_months: z.number().int().nullable(),
      monthly_amount: z.number().nullable(),
      monthly_rate_pct: z.number().nullable().describe("Monthly interest or fee rate in percent, only if shown."),
      admin_fee: z.number().nullable(),
    })
    .nullable()
    .describe("Only when installment or paylater terms are visible."),
  confidence: z.enum(["high", "medium", "low"]),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

export const ExtractRequestSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().min(100).max(8_000_000), // base64
});

export const WishlistItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  price: z.number().finite().positive(),
  merchant: z.string().max(80).nullish(),
});

export const DecisionSchema = z.object({
  action: z.enum(["buy", "save"]),
  title: z.string().trim().min(1).max(200),
  total: z.number().finite().positive(),
  paylater: PaylaterSchema.nullish(),
});

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().max(2000),
});

export const FutureMeRequestSchema = CartCheckSchema.extend({
  messages: z.array(ChatMessageSchema).max(20),
});
