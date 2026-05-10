import { Hono } from "hono";
import type { Env } from "../types";

/**
 * GET /health — cheap readiness probe used by the desktop app on
 * boot to decide whether to attempt sign-in. Hits D1 with the
 * lightest possible query so a backend DB outage shows up as
 * 503, not as a confusing 200 followed by failed sign-in.
 */

export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get("/", async (c) => {
  try {
    await c.env.DB.prepare("SELECT 1").first();
  } catch {
    return c.json({ ok: false }, 503);
  }
  return c.json({ ok: true });
});
