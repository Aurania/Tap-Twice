import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import type { z } from "zod";
import { analyzeProduct, futureMe, MAX_USER_TURNS, NotAProductError, ReflectContextSchema, writeReflection } from "./ai.js";
import { toProfileCurrency } from "./fx.js";
import { requireUser, type AuthEnv } from "./auth.js";
import { config } from "./config.js";
import { planPurchase, quotePaylater } from "./purchase.js";
import { rateLimit } from "./rateLimit.js";
import { AnalyzeRequestSchema, BudgetPreviewRequestSchema, CheckRequestSchema, FutureMeRequestSchema, PaylaterCostRequestSchema, ProfileSchema, PurchaseSchema, WishlistItemSchema } from "./schemas.js";
import * as store from "./store.js";
import { buildBudgetPreview, buildReality, buildSummary } from "./summary.js";

const app = new Hono<AuthEnv>();

// Logs method, path, status and time only. Request bodies are never logged.
app.use(logger());
app.use("/api/*", cors({ origin: config.allowedOrigins, allowHeaders: ["authorization", "content-type", "x-dev-uid"] }));

app.get("/api/health", (c) => c.json({ ok: true, model: config.geminiModel }));

app.use("/api/*", requireUser);

async function body<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | null> {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

// ---- Profile ----
app.get("/api/profile", async (c) => c.json({ profile: await store.getProfile(c.get("uid")) }));

app.put("/api/profile", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ProfileSchema.safeParse(json);
  if (!parsed.success) {
    // Messages like "expenses_exceed_income" (N1) and "allocation_not_100:110" (N2) let the app show the right state.
    return c.json({ error: "invalid_profile", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, 400);
  }
  await store.saveProfile(c.get("uid"), parsed.data);
  return c.json({ profile: parsed.data });
});

// Delete everything stored for this anonymous user.
app.delete("/api/me", async (c) => {
  await store.deleteAllUserData(c.get("uid"));
  return c.json({ ok: true });
});

// ---- Onboarding sliders (no profile needed) ----
app.post("/api/preview/budget", async (c) => {
  const req = await body(c.req.raw, BudgetPreviewRequestSchema);
  if (!req) return c.json({ error: "invalid_preview" }, 400);
  return c.json({ preview: buildBudgetPreview(req.monthlyIncome, req.monthlyExpenses, req.pockets) });
});

// ---- Wishlist ----
app.post("/api/wishlist", async (c) => {
  const uid = c.get("uid");
  const item = await body(c.req.raw, WishlistItemSchema);
  if (!item) return c.json({ error: "invalid_item" }, 400);
  const profile = await store.getProfile(uid);
  if (!profile) return c.json({ error: "no_profile" }, 409);
  if (!profile.pockets.some((p) => p.id === item.pocketId)) return c.json({ error: "unknown_pocket" }, 400);
  return c.json({ id: await store.addWishlistItem(uid, item) }, 201);
});

app.delete("/api/wishlist/:id", async (c) => {
  await store.deleteWishlistItem(c.get("uid"), c.req.param("id"));
  return c.json({ ok: true });
});

// ---- Purchases ("Log it"): pay in full, or PayLater month by month ----
app.post("/api/purchases", async (c) => {
  const uid = c.get("uid");
  const req = await body(c.req.raw, PurchaseSchema);
  if (!req) return c.json({ error: "invalid_purchase" }, 400);
  const profile = await store.getProfile(uid);
  if (!profile) return c.json({ error: "no_profile" }, 409);
  if (!profile.pockets.some((p) => p.id === req.pocketId)) return c.json({ error: "unknown_pocket" }, 400);
  const doc = planPurchase(req, profile.currency);
  return c.json({ id: await store.addPurchase(uid, doc, req.wishlistId), plan: doc }, 201);
});

// ---- PayLater numbers for a price, no side effects ----
app.post("/api/paylater/cost", async (c) => {
  const uid = c.get("uid");
  const req = await body(c.req.raw, PaylaterCostRequestSchema);
  if (!req) return c.json({ error: "invalid_paylater" }, 400);
  const profile = await store.getProfile(uid);
  if (!profile) return c.json({ error: "no_profile" }, 409);
  return c.json({ plan: quotePaylater(req.price, req.paylater, profile.currency) });
});

// ---- Numbers the app displays: Home, Wishlist, Reality card ----
app.get("/api/summary", async (c) => {
  const uid = c.get("uid");
  const profile = await store.getProfile(uid);
  if (!profile) return c.json({ error: "no_profile" }, 409);
  const [wishlist, purchases] = await Promise.all([store.listWishlist(uid), store.monthPurchases(uid)]);
  return c.json({ summary: buildSummary(profile, wishlist, purchases) });
});

app.post("/api/check", async (c) => {
  const uid = c.get("uid");
  const req = await body(c.req.raw, CheckRequestSchema);
  if (!req) return c.json({ error: "invalid_check" }, 400);
  const profile = await store.getProfile(uid);
  if (!profile) return c.json({ error: "no_profile" }, 409);
  const [wishlist, purchases] = await Promise.all([store.listWishlist(uid), store.monthPurchases(uid)]);
  const reality = buildReality(profile, wishlist, purchases, req);
  if (!reality) return c.json({ error: "unknown_pocket" }, 400);
  return c.json({ reality });
});

// ---- AI (Gemini on Vertex). The browser never calls the model; the server builds every number it may mention. ----

// Per-user limits on the calls that cost model time. Generous for a person, tight for a loop.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
app.use("/api/ai/analyze", rateLimit("analyze", [{ limit: 10, windowMs: MINUTE }, { limit: 60, windowMs: HOUR }]));
app.use("/api/ai/reflect", rateLimit("reflect", [{ limit: 30, windowMs: MINUTE }, { limit: 200, windowMs: HOUR }]));
app.use("/api/ai/future-me", rateLimit("future-me", [{ limit: 20, windowMs: MINUTE }, { limit: 200, windowMs: HOUR }]));

/** Reads one product from a photo, screenshot or link: name, pocket match and price. */
app.post("/api/ai/analyze", bodyLimit({ maxSize: 8 * 1024 * 1024 }), async (c) => {
  const req = await body(c.req.raw, AnalyzeRequestSchema);
  if (!req) return c.json({ error: "invalid_input" }, 400);
  const profile = await store.getProfile(c.get("uid"));
  if (!profile) return c.json({ error: "no_profile" }, 409);
  try {
    const analysis = await analyzeProduct(req.input, profile.pockets.map((p) => ({ id: p.id, name: p.name })), profile.language);
    // A price in another currency is converted to the profile currency with the day's ECB rate (or left for the person to type).
    const { price, unconverted } = await toProfileCurrency(analysis.price, profile.currency);
    return c.json({ product: analysis.product, price, unconverted });
  } catch (err) {
    if (err instanceof NotAProductError) return c.json({ error: "not_a_product" }, 422);
    console.error("analyze failed:", err instanceof Error ? err.message : err);
    return c.json({ error: "ai_failed" }, 502);
  }
});

/** The Reality card paragraph, from numbers the server already computed. Null when the model cannot write it. */
app.post("/api/ai/reflect", async (c) => {
  const ctx = await body(c.req.raw, ReflectContextSchema);
  if (!ctx) return c.json({ error: "invalid_context" }, 400);
  const profile = await store.getProfile(c.get("uid"));
  if (!profile) return c.json({ error: "no_profile" }, 409);
  return c.json({ reflection: await writeReflection(ctx, profile.currency, profile.language) });
});

/** Future Me, streamed as server-sent events: `text`, then `done` (or `error`). */
app.post("/api/ai/future-me", async (c) => {
  const uid = c.get("uid");
  const req = await body(c.req.raw, FutureMeRequestSchema);
  if (!req) return c.json({ error: "invalid_request" }, 400);
  if (req.messages.filter((m) => m.role === "user").length > MAX_USER_TURNS) return c.json({ error: "conversation_over" }, 400);
  const profile = await store.getProfile(uid);
  if (!profile) return c.json({ error: "no_profile" }, 409);

  const [wishlist, purchases] = await Promise.all([store.listWishlist(uid), store.monthPurchases(uid)]);
  const summary = buildSummary(profile, wishlist, purchases);
  let checked = null;
  if (req.checked) {
    const reality = buildReality(profile, wishlist, purchases, req.checked);
    if (!reality) return c.json({ error: "unknown_pocket" }, 400);
    checked = { name: req.checked.name, price: req.checked.price, reality };
  }

  return streamSSE(c, async (stream) => {
    try {
      for await (const event of futureMe({ profile, summary, checked, messages: req.messages })) {
        await stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
      }
    } catch (err) {
      console.error("future-me failed:", err instanceof Error ? err.message : err);
      await stream.writeSSE({ event: "error", data: JSON.stringify({ type: "error" }) });
    }
  });
});


app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path} failed:`, err.message);
  return c.json({ error: "internal" }, 500);
});

serve({ fetch: app.fetch, port: config.port }, (info) => console.log(`Tap Twice API on :${info.port}`));
