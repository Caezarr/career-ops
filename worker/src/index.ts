/**
 * Career OS — Cloudflare Worker entry point.
 *
 * Mounts the auth + me + health routers under their respective
 * prefixes, applies CORS for the desktop app's webview origin
 * (Tauri runs everything from `tauri://localhost`), and exposes
 * a friendly root for humans who hit the API URL by accident.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { healthRoutes } from "./routes/health";
import { aiRoutes } from "./routes/ai";
import { updateRoutes } from "./routes/updates";
import { billingRoutes } from "./routes/billing";
import { copilotRoutes } from "./routes/copilot";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// Tauri webview origin under macOS is `tauri://localhost`. We allow
// it explicitly + a few dev origins. CORS isn't strictly needed for
// the magic-link flow (browsers hit /auth/verify directly), but the
// desktop app POSTs /auth/request and GETs /me through fetch().
app.use(
  "*",
  cors({
    origin: [
      "tauri://localhost",
      "http://localhost:1420",
      "http://localhost:1421",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

app.route("/auth", authRoutes);
app.route("/me", meRoutes);
app.route("/health", healthRoutes);
// Server-managed AI (subscription includes the Anthropic credit —
// users never bring their own keys). All routes JWT-gated +
// per-user daily rate-limited.
app.route("/v1/ai", aiRoutes);
// Auto-updater manifest. Public (no JWT) — installed apps need to
// reach this on every startup. Cached at the edge by Cloudflare.
app.route("/v1/updates", updateRoutes);
// Stripe Checkout one-time (lifetime 99€ / lifetime_pro 149€) +
// webhook + status + refund-request. JWT-gated except for the
// webhook (which Stripe signs).
app.route("/v1/billing", billingRoutes);
// Copilot — server-side AssemblyAI streaming token broker. The
// desktop app exchanges its JWT for a 60-second AssemblyAI token,
// then connects directly to wss://streaming.assemblyai.com.
app.route("/v1/copilot", copilotRoutes);

app.get("/", (c) =>
  c.text(
    "Career OS API. See https://github.com/Caezarr/career-ops for docs.",
  ),
);

export default app;
