import { createMiddleware } from "hono/factory";
import { config } from "./config.js";
import { auth } from "./firebase.js";

export type AuthEnv = { Variables: { uid: string } };

/** Verifies the Firebase ID token (anonymous auth) and exposes the user's uid. */
export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  const devUid = c.req.header("x-dev-uid");
  if (config.devAuthBypass && devUid) {
    c.set("uid", devUid);
    return next();
  }

  const token = c.req.header("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return c.json({ error: "unauthenticated" }, 401);
  try {
    const decoded = await auth.verifyIdToken(token);
    c.set("uid", decoded.uid);
  } catch {
    return c.json({ error: "unauthenticated" }, 401);
  }
  await next();
});
