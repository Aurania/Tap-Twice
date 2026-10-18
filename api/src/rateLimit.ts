import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "./auth.js";

export interface Window {
  /** Requests allowed in the window. */
  limit: number;
  windowMs: number;
}

export type Decision = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * A sliding-window limiter, one list of request times per key. Pure: pass `now`.
 * In memory, so each Cloud Run instance counts on its own; that is enough to stop a runaway client or a loop
 * from burning model calls. TODO: a shared store (Firestore, Redis) if hard per-user caps are needed.
 */
export function createLimiter(windows: Window[]) {
  const hits = new Map<string, number[]>();
  const longest = Math.max(...windows.map((w) => w.windowMs));

  return function check(key: string, now = Date.now()): Decision {
    const times = (hits.get(key) ?? []).filter((t) => now - t < longest);
    let wait = 0;
    for (const w of windows) {
      const inWindow = times.filter((t) => now - t < w.windowMs);
      if (inWindow.length >= w.limit) {
        // The oldest request that counts leaves the window at oldest + windowMs.
        const oldest = inWindow[inWindow.length - w.limit]!;
        wait = Math.max(wait, oldest + w.windowMs - now);
      }
    }
    if (wait > 0) {
      hits.set(key, times);
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(wait / 1000)) };
    }
    times.push(now);
    hits.set(key, times);
    // Keep the map from growing with users who never come back.
    if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= longest)) hits.delete(k);
    return { ok: true };
  };
}

/** Per-user limit for a route. Answers 429 `rate_limited` with a Retry-After header. Needs `requireUser` before it. */
export function rateLimit(name: string, windows: Window[]) {
  const check = createLimiter(windows);
  return createMiddleware<AuthEnv>(async (c, next) => {
    const decision = check(`${name}:${c.get("uid")}`);
    if (!decision.ok) {
      c.header("Retry-After", String(decision.retryAfterSeconds));
      return c.json({ error: "rate_limited", retryAfterSeconds: decision.retryAfterSeconds }, 429);
    }
    await next();
  });
}
