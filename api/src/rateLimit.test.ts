import { describe, expect, it } from "vitest";
import { createLimiter } from "./rateLimit.js";

const MIN = 60_000;

describe("createLimiter", () => {
  it("allows up to the limit, then says how long to wait", () => {
    const check = createLimiter([{ limit: 3, windowMs: MIN }]);
    expect([check("u", 0), check("u", 1000), check("u", 2000)].every((d) => d.ok)).toBe(true);
    expect(check("u", 3000)).toEqual({ ok: false, retryAfterSeconds: 57 }); // the first request leaves the window at 60,000
  });
  it("lets requests through again as the window slides", () => {
    const check = createLimiter([{ limit: 2, windowMs: MIN }]);
    check("u", 0);
    check("u", 10_000);
    expect(check("u", 20_000).ok).toBe(false);
    expect(check("u", 60_001).ok).toBe(true);
  });
  it("counts each user on their own", () => {
    const check = createLimiter([{ limit: 1, windowMs: MIN }]);
    expect(check("a", 0).ok).toBe(true);
    expect(check("b", 0).ok).toBe(true);
    expect(check("a", 1).ok).toBe(false);
  });
  it("applies every window; the slower one can block while the fast one is clear", () => {
    const check = createLimiter([
      { limit: 100, windowMs: MIN },
      { limit: 3, windowMs: 60 * MIN },
    ]);
    check("u", 0);
    check("u", 5 * MIN);
    check("u", 10 * MIN);
    const d = check("u", 20 * MIN);
    expect(d.ok).toBe(false);
    expect(d).toMatchObject({ retryAfterSeconds: 40 * 60 });
  });
  it("a blocked request does not count against the user", () => {
    const check = createLimiter([{ limit: 1, windowMs: MIN }]);
    check("u", 0);
    check("u", 1000);
    check("u", 2000);
    expect(check("u", 60_001).ok).toBe(true);
  });
});
