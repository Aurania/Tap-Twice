import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import type { z } from "zod";
import { requireUser, type AuthEnv } from "./auth.js";
import { config } from "./config.js";
import { calculateCost } from "./cost.js";
import { extractCart, ExtractionError } from "./extract.js";
import { futureMe, MAX_USER_TURNS } from "./futureMe.js";
import { convertToIdr, rateToIdr } from "./fx.js";
import { writeReflection } from "./reflect.js";
import {
  CartCheckSchema,
  DecisionSchema,
  ExtractRequestSchema,
  FutureMeRequestSchema,
  ProfileSchema,
  WishlistItemSchema,
} from "./schemas.js";
import * as store from "./store.js";

const app = new Hono<AuthEnv>();

// Logs method, path, status and time only. Request bodies (images, chat) are never logged.
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
  const profile = await body(c.req.raw, ProfileSchema);
  if (!profile) return c.json({ error: "invalid_profile" }, 400);
  await store.saveProfile(c.get("uid"), profile);
  return c.json({ profile });
});

// Delete everything stored for this anonymous user.
app.delete("/api/me", async (c) => {
  await store.deleteAllUserData(c.get("uid"));
  return c.json({ ok: true });
});

// ---- Wishlist ----
app.get("/api/wishlist", async (c) => c.json({ items: await store.listWishlist(c.get("uid")) }));

app.post("/api/wishlist", async (c) => {
  const item = await body(c.req.raw, WishlistItemSchema);
  if (!item) return c.json({ error: "invalid_item" }, 400);
  return c.json({ id: await store.addWishlistItem(c.get("uid"), item) }, 201);
});

app.delete("/api/wishlist/:id", async (c) => {
  await store.deleteWishlistItem(c.get("uid"), c.req.param("id"));
  return c.json({ ok: true });
});

// ---- Decisions (Buy / Save for later) ----
app.get("/api/decisions", async (c) => {
  const uid = c.get("uid");
  const [decisions, profile] = await Promise.all([store.monthDecisions(uid), store.getProfile(uid)]);
  const spent = decisions.filter((d) => d.action === "buy").reduce((s, d) => s + d.total, 0);
  return c.json({ decisions, spentThisMonth: spent, joyBudgetLeft: profile ? profile.joyBudget - spent : null });
});

app.post("/api/decisions", async (c) => {
  const decision = await body(c.req.raw, DecisionSchema);
  if (!decision) return c.json({ error: "invalid_decision" }, 400);
  return c.json({ id: await store.addDecision(c.get("uid"), decision) }, 201);
});

// ---- Cart Check ----
app.post("/api/extract", bodyLimit({ maxSize: 8 * 1024 * 1024 }), async (c) => {
  const image = await body(c.req.raw, ExtractRequestSchema);
  if (!image) return c.json({ error: "invalid_image" }, 400);
  try {
    const extraction = await extractCart(image);
    // Profile and cost engine are in rupiah. For foreign carts, also return a rupiah
    // version so the confirm screen can show both. fx is null when no rate is available,
    // and the user types the rupiah total instead.
    if (extraction.currency.toUpperCase() === "IDR" || !extraction.is_cart) {
      return c.json({ extraction, idr: extraction, fx: null });
    }
    const fx = await rateToIdr(extraction.currency);
    return c.json({ extraction, idr: fx ? convertToIdr(extraction, fx.rateToIdr) : null, fx });
  } catch (err) {
    if (err instanceof ExtractionError) return c.json({ error: "extraction_failed" }, 502);
    throw err;
  }
});

/** Reality card numbers only (no AI). Used when the user edits paylater terms. */
app.post("/api/cost", async (c) => {
  const uid = c.get("uid");
  const input = await body(c.req.raw, CartCheckSchema);
  if (!input) return c.json({ error: "invalid_cart" }, 400);
  const profile = await store.getProfile(uid);
  if (!profile) return c.json({ error: "no_profile" }, 409);
  const cost = calculateCost({ total: input.cart.total, profile, spentThisMonth: await store.spentThisMonth(uid), paylater: input.paylater });
  return c.json({ cost });
});

/** Reality card numbers plus a two-sentence AI reflection. */
app.post("/api/reflect", async (c) => {
  const uid = c.get("uid");
  const input = await body(c.req.raw, CartCheckSchema);
  if (!input) return c.json({ error: "invalid_cart" }, 400);
  const profile = await store.getProfile(uid);
  if (!profile) return c.json({ error: "no_profile" }, 409);
  const cost = calculateCost({ total: input.cart.total, profile, spentThisMonth: await store.spentThisMonth(uid), paylater: input.paylater });
  const reflection = await writeReflection(profile, input.cart, cost).catch(() => null);
  return c.json({ cost, reflection });
});

// ---- Future Me (agent, streamed over server-sent events) ----
app.post("/api/future-me", async (c) => {
  const uid = c.get("uid");
  const input = await body(c.req.raw, FutureMeRequestSchema);
  if (!input) return c.json({ error: "invalid_request" }, 400);
  if (input.messages.filter((m) => m.role === "user").length > MAX_USER_TURNS) {
    return c.json({ error: "conversation_over" }, 400);
  }
  const profile = await store.getProfile(uid);
  if (!profile) return c.json({ error: "no_profile" }, 409);

  return streamSSE(c, async (stream) => {
    try {
      for await (const event of futureMe({ uid, profile, cart: input.cart, paylater: input.paylater ?? null, messages: input.messages })) {
        await stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
      }
    } catch (err) {
      console.error("future-me failed:", (err as Error).message);
      await stream.writeSSE({ event: "error", data: JSON.stringify({ type: "error" }) });
    }
  });
});

app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path} failed:`, err.message);
  return c.json({ error: "internal" }, 500);
});

serve({ fetch: app.fetch, port: config.port }, (info) => console.log(`Tap Twice API on :${info.port}`));
