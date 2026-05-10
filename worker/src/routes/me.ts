import { Hono } from "hono";
import { findUserById } from "../lib/db";
import { requireAuth, type AuthVars } from "../middleware/requireAuth";
import type { Env } from "../types";

/**
 * GET /me — minimal profile view for the signed-in user.
 *
 * Returns the same fields the client cares about: id, email, plan
 * (license_status), and current_period_end so the desktop's
 * `BillingTab` can render renewal dates without a separate Stripe
 * round-trip. Don't add fields here that the client doesn't need —
 * each one is a versioning headache.
 */

export const meRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

meRoutes.use("*", requireAuth);

meRoutes.get("/", async (c) => {
  const auth = c.get("auth");
  const user = await findUserById(c.env.DB, auth.sub);
  if (!user) {
    // Token signed by us but row gone — user was deleted.
    return c.json({ error: "user_not_found" }, 404);
  }

  return c.json({
    id: user.id,
    email: user.email,
    license: {
      status: user.license_status,
      currentPeriodEnd: user.current_period_end,
    },
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
  });
});
