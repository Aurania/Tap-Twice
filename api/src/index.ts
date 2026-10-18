import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { z } from "zod";
import { requireUser, type AuthEnv } from "./auth.js";
import { config } from "./config.js";
import { CheckRequestSchema, ProfileSchema, PurchaseSchema, WishlistItemSchema } from "./schemas.js";
import * as store from "./store.js";
import { buildReality, buildSummary } from "./summary.js";

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

// ---- Purchases (what actually reduces a pocket) ----
app.post("/api/purchases", async (c) => {
  const uid = c.get("uid");
  const purchase = await body(c.req.raw, PurchaseSchema);
  if (!purchase) return c.json({ error: "invalid_purchase" }, 400);
  const profile = await store.getProfile(uid);
  if (!profile) return c.json({ error: "no_profile" }, 409);
  if (!profile.pockets.some((p) => p.id === purchase.pocketId)) return c.json({ error: "unknown_pocket" }, 400);
  return c.json({ id: await store.addPurchase(uid, purchase) }, 201);
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

// TODO(phase 9): AI routes (identify product, read price, Future Me chat) once the provider is wired in.
// TODO(phase 8): PayLater cost route on top of cost.ts.

app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path} failed:`, err.message);
  return c.json({ error: "internal" }, 500);
});

serve({ fetch: app.fetch, port: config.port }, (info) => console.log(`Tap Twice API on :${info.port}`));
