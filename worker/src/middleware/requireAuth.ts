import type { Context, Next } from "hono";
import { verifyJwt } from "../lib/jwt";
import type { Env, JwtPayload } from "../types";

/**
 * Bearer-token middleware. Pulls `Authorization: Bearer <jwt>` from
 * the request, verifies it with the Worker's secret, and stashes the
 * decoded payload at `c.var.auth`.
 *
 * Phase 2's sync endpoints will sit behind this. Phase 1's only
 * authenticated route is `/me`.
 */
export type AuthVars = {
  auth: JwtPayload;
};

export async function requireAuth(
  c: Context<{ Bindings: Env; Variables: AuthVars }>,
  next: Next,
) {
  const header = c.req.header("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    return c.json({ error: "missing_bearer" }, 401);
  }
  const token = header.slice(7).trim();
  if (!token) return c.json({ error: "empty_bearer" }, 401);

  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "invalid_token" }, 401);

  c.set("auth", payload);
  return next();
}
