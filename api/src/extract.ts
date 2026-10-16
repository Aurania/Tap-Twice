import { ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { config } from "./config.js";
import { genai } from "./gemini.js";
import { ExtractionSchema, type Extraction } from "./schemas.js";

const responseJsonSchema = z.toJSONSchema(ExtractionSchema, { target: "openapi-3.0" });

const PROMPT = `You read screenshots of Indonesian online shopping carts and checkout pages (Shopee, Tokopedia, TikTok Shop, Lazada, Blibli and others) and return the purchase as JSON.

Rules:
- Indonesian prices use dots as thousand separators: "Rp1.250.000" is 1250000. "rb" or "K" means thousands. Return plain numbers.
- Only include items that are selected/checked for checkout. Ignore recommendations, "you may also like", and unselected items.
- "total" is the final amount to pay ("Total Pembayaran", "Total", "Subtotal untuk Produk" only if no final total is shown). If you cannot see it, use null.
- If paylater or installment terms are visible (SPayLater, GoPayLater, Kredivo, Akulaku, "cicilan", "x 3 bulan"), fill "installment". Otherwise set it to null.
- Ignore and never output names, addresses, phone numbers, or order IDs.
- If the image is not a cart, checkout, receipt or a product with a price, set is_cart to false and items to [].
- confidence is "low" if the image is blurry, cropped, or the total is ambiguous.`;

export class ExtractionError extends Error {}

export async function extractCart(image: { mimeType: string; data: string }): Promise<Extraction> {
  const response = await genai.models.generateContent({
    model: config.extractModel,
    contents: [{ role: "user", parts: [{ inlineData: image }, { text: PROMPT }] }],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  let json: unknown;
  try {
    json = JSON.parse(response.text ?? "");
  } catch {
    throw new ExtractionError("Gemini returned invalid JSON");
  }
  const parsed = ExtractionSchema.safeParse(json);
  if (!parsed.success) throw new ExtractionError("Gemini output did not match the schema");
  return parsed.data;
}
