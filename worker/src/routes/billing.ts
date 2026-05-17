/**
 * Billing routes — Stripe one-time Checkout for the lifetime pricing.
 *
 * Endpoints:
 *   POST /v1/billing/checkout   — auth required. Creates a Checkout
 *     Session for the requested tier and returns its URL. The
 *     desktop app opens that URL in the system browser via
 *     tauri-plugin-shell.
 *
 *   POST /v1/billing/webhook    — public, but signature-verified.
 *     Handles `checkout.session.completed`: marks the user as Pro
 *     in D1, stamps purchase + refund deadline, stores the Stripe
 *     IDs we'll need for a future refund.
 *
 *   GET  /v1/billing/status     — auth required. Returns the user's
 *     current plan + purchase timestamps so the Settings → Billing
 *     card paints without a Stripe round-trip.
 *
 *   POST /v1/billing/refund     — auth required. Triggers a refund
 *     request for a lifetime_pro user inside the 180-day window.
 *     Currently flags the request in D1; the actual Stripe refund
 *     is processed by a human reviewing the candidate's activity
 *     (≥30 applications tracked, 0 interviews landed) — fully
 *     automating the refund here would let anyone trigger it.
 *
 * Architecture note:
 *   The Stripe secret key NEVER leaves the Worker. The desktop app
 *   only sees the Checkout URL Stripe returned. That's the only
 *   correct B2C SaaS pattern — anything else (e.g. BYOK Stripe in
 *   the client) means random users could see the merchant key.
 */
import { Hono } from "hono";
import { findUserById } from "../lib/db";
import { sendLoopsEmail, LoopsError } from "../lib/email";
import { requireAuth, type AuthVars } from "../middleware/requireAuth";
import type { Env, Plan } from "../types";
import { REFUND_WINDOW_MS } from "../types";

export const billingRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

// ─── POST /v1/billing/checkout ────────────────────────────────────────────
billingRoutes.post("/checkout", requireAuth, async (c) => {
  const auth = c.get("auth");
  let body: { plan?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_body" }, 400);
  }

  const plan = body.plan;
  if (plan !== "lifetime" && plan !== "lifetime_pro") {
    return c.json({ error: "invalid_plan" }, 400);
  }

  const user = await findUserById(c.env.DB, auth.sub);
  if (!user) return c.json({ error: "user_not_found" }, 404);

  // Already paid? Don't let them double-charge — surface a friendly
  // error so the UI can swap to "Pro · Lifetime" instead of opening
  // Checkout. Edge cases (cancelled refund, etc.) handled manually.
  if (user.plan === "lifetime" || user.plan === "lifetime_pro") {
    return c.json({ error: "already_paid", currentPlan: user.plan }, 409);
  }

  const priceId =
    plan === "lifetime_pro"
      ? c.env.STRIPE_PRICE_LIFETIME_PRO
      : c.env.STRIPE_PRICE_LIFETIME;
  if (!priceId) {
    return c.json({ error: "price_not_configured", plan }, 500);
  }

  // Stripe v1 expects form-encoded bodies (yes, in 2026; their REST
  // surface predates JSON). Bracket syntax on keys = nested params.
  const params = new URLSearchParams();
  params.set("mode", "payment"); // one-time, NOT subscription
  params.set("payment_method_types[]", "card");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("customer_email", user.email);
  params.set("success_url", c.env.STRIPE_SUCCESS_URL);
  params.set("cancel_url", c.env.STRIPE_CANCEL_URL);
  // Metadata travels back on the webhook event so we can route the
  // payment to the correct user without storing extra state here.
  params.set("metadata[user_id]", user.id);
  params.set("metadata[plan]", plan);
  // Idempotency: if the user clicks twice in rapid succession we
  // don't want two Checkout Sessions. Stripe accepts a per-session
  // idempotency key — we use (user, plan, hour-bucket) so retries
  // within the same hour resolve to the same session.
  const idempotencyKey = `co-${user.id}-${plan}-${Math.floor(Date.now() / 3_600_000)}`;

  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("stripe checkout create failed", resp.status, text);
    return c.json({ error: "stripe_create_failed", status: resp.status }, 502);
  }
  const session = (await resp.json()) as { id: string; url: string };
  return c.json({ url: session.url, sessionId: session.id });
});

// ─── POST /v1/billing/webhook ─────────────────────────────────────────────
//
// Public route. Stripe POSTs every event we subscribe to here. We
// verify the signature before mutating anything — anyone POSTing a
// fake `checkout.session.completed` with no signature gets a 400.
billingRoutes.post("/webhook", async (c) => {
  const sigHeader = c.req.header("stripe-signature");
  if (!sigHeader) return c.json({ error: "missing_signature" }, 400);

  // Stripe signs the RAW request body, not the parsed JSON, so we
  // grab the text first and only parse after the signature checks
  // out. (Parsing JSON would normalise whitespace and break HMAC.)
  const raw = await c.req.text();
  const ok = await verifyStripeSignature(
    raw,
    sigHeader,
    c.env.STRIPE_WEBHOOK_SECRET,
  );
  if (!ok) return c.json({ error: "bad_signature" }, 400);

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  // Only one event type matters for now — Checkout completed.
  // Subscriptions / failed payments etc. are not relevant since we
  // sell one-time licences. Unhandled events get a 200 (Stripe will
  // not retry) so its delivery dashboard stays clean.
  if (event.type !== "checkout.session.completed") {
    return c.json({ received: true, ignored: event.type });
  }

  const session = event.data.object;
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan as Plan | undefined;
  if (!userId || (plan !== "lifetime" && plan !== "lifetime_pro")) {
    return c.json({ error: "missing_metadata" }, 400);
  }

  const now = Date.now();
  const hasGuarantee = plan === "lifetime_pro" ? 1 : 0;
  const refundDeadline =
    plan === "lifetime_pro" ? now + REFUND_WINDOW_MS : null;

  await c.env.DB.prepare(
    `UPDATE users
        SET plan = ?,
            purchased_at = ?,
            refund_deadline_at = ?,
            has_guarantee = ?,
            stripe_customer_id = COALESCE(stripe_customer_id, ?),
            stripe_session_id = ?,
            stripe_payment_intent_id = ?
      WHERE id = ?`,
  )
    .bind(
      plan,
      now,
      refundDeadline,
      hasGuarantee,
      session.customer ?? null,
      session.id,
      session.payment_intent ?? null,
      userId,
    )
    .run();

  // Welcome email — fire after the D1 write so the user only
  // gets the email if the plan flip actually persisted. Loops failure
  // is non-fatal: we log it but still return 200 to Stripe so the
  // webhook doesn't get retried (the user is already paid, Stripe
  // re-firing won't fix a broken email).
  //
  // Two distinct Loops templates rather than one template with a
  // Handlebars `{{#if}}` block — Loops' MJML upload path doesn't
  // support conditionals, so we let the plan pick which template
  // to fire. The Pro template references {DATA_VARIABLE:refundDeadline};
  // the Lifetime template only needs {DATA_VARIABLE:userEmail}.
  const welcomeTemplateId =
    plan === "lifetime_pro"
      ? c.env.LOOPS_TEMPLATE_WELCOME_PRO
      : c.env.LOOPS_TEMPLATE_WELCOME_LIFETIME;

  if (c.env.LOOPS_API_KEY && welcomeTemplateId) {
    try {
      const user = await findUserById(c.env.DB, userId);
      if (user) {
        const dataVariables: Record<string, string | number | boolean> = {
          userEmail: user.email,
        };
        if (plan === "lifetime_pro" && refundDeadline) {
          dataVariables.refundDeadline = new Date(refundDeadline).toLocaleDateString(
            "fr-FR",
            { year: "numeric", month: "long", day: "numeric" },
          );
        }
        await sendLoopsEmail({
          apiKey: c.env.LOOPS_API_KEY,
          templateId: welcomeTemplateId,
          email: user.email,
          dataVariables,
        });
      }
    } catch (e) {
      const detail =
        e instanceof LoopsError ? `${e.status}: ${e.message}` : String(e);
      console.error(`welcome email failed for user=${userId} plan=${plan}: ${detail}`);
    }
  }

  return c.json({ received: true });
});

// ─── GET /v1/billing/status ───────────────────────────────────────────────
billingRoutes.get("/status", requireAuth, async (c) => {
  const auth = c.get("auth");
  const user = await findUserById(c.env.DB, auth.sub);
  if (!user) return c.json({ error: "user_not_found" }, 404);

  return c.json({
    plan: user.plan,
    purchasedAt: user.purchased_at,
    refundDeadlineAt: user.refund_deadline_at,
    hasGuarantee: user.has_guarantee === 1,
    refundRequestedAt: user.refund_requested_at,
    refundedAt: user.refunded_at,
    // Convenience derived field — `true` only when there's a
    // guarantee AND we're still inside the 180-day window AND no
    // refund request has been logged yet.
    canRequestRefund:
      user.has_guarantee === 1 &&
      user.refund_deadline_at !== null &&
      user.refund_deadline_at > Date.now() &&
      user.refund_requested_at === null,
  });
});

// ─── POST /v1/billing/refund ──────────────────────────────────────────────
//
// Flags a refund request in D1. We DON'T trigger the Stripe refund
// automatically — the conditions (≥30 applications tracked, 0
// interviews landed) need a human review of the user's activity.
// Once approved, the operator manually issues the refund in Stripe
// and stamps `refunded_at` via an admin tool.
billingRoutes.post("/refund", requireAuth, async (c) => {
  const auth = c.get("auth");
  const user = await findUserById(c.env.DB, auth.sub);
  if (!user) return c.json({ error: "user_not_found" }, 404);

  if (user.has_guarantee !== 1) {
    return c.json({ error: "no_guarantee" }, 403);
  }
  if (user.refund_requested_at !== null) {
    return c.json({ error: "already_requested" }, 409);
  }
  if (user.refund_deadline_at === null || user.refund_deadline_at < Date.now()) {
    return c.json({ error: "window_expired" }, 410);
  }

  const requestedAt = Date.now();
  await c.env.DB.prepare(
    `UPDATE users SET refund_requested_at = ? WHERE id = ?`,
  )
    .bind(requestedAt, user.id)
    .run();

  // Notify the user that their request was received. Loops failure
  // is non-fatal — the D1 flag is already set, support will see it
  // even if the email never lands.
  if (c.env.LOOPS_API_KEY && c.env.LOOPS_TEMPLATE_REFUND_REQUESTED) {
    try {
      const daysSincePurchase = user.purchased_at
        ? Math.floor((requestedAt - user.purchased_at) / (24 * 60 * 60 * 1000))
        : 0;
      await sendLoopsEmail({
        apiKey: c.env.LOOPS_API_KEY,
        templateId: c.env.LOOPS_TEMPLATE_REFUND_REQUESTED,
        email: user.email,
        dataVariables: {
          userEmail: user.email,
          daysSincePurchase,
          deadlineAt: user.refund_deadline_at
            ? new Date(user.refund_deadline_at).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "",
        },
      });
    } catch (e) {
      const detail =
        e instanceof LoopsError ? `${e.status}: ${e.message}` : String(e);
      console.error(`refund-requested email failed for user=${user.id}: ${detail}`);
    }
  }

  return c.json({ requested: true, deadlineAt: user.refund_deadline_at });
});

// ─── Helpers ──────────────────────────────────────────────────────────────

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      customer?: string | null;
      payment_intent?: string | null;
      metadata?: Record<string, string>;
    };
  };
}

/**
 * Verify a Stripe webhook signature.
 *
 * Stripe's header is `t=<timestamp>,v1=<hmac>` (one or more v1 entries
 * when secrets are being rotated). We HMAC-SHA256 `${t}.${rawBody}`
 * with the webhook secret and compare in constant time.
 *
 * Tolerance: 5 minutes. Anything older is assumed to be a replay and
 * rejected — Stripe retries failed webhooks for up to 3 days, but
 * each retry re-signs with a fresh timestamp.
 */
async function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string,
): Promise<boolean> {
  if (!secret) return false;
  const parts = header.split(",").reduce<Record<string, string[]>>((acc, p) => {
    const eq = p.indexOf("=");
    if (eq === -1) return acc;
    const k = p.slice(0, eq);
    const v = p.slice(eq + 1);
    acc[k] = acc[k] ?? [];
    acc[k].push(v);
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestamp || signatures.length === 0) return false;

  // 5-minute tolerance window.
  const tsMs = Number(timestamp) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
    return false;
  }

  const payload = `${timestamp}.${rawBody}`;
  const expected = await hmacSha256Hex(secret, payload);
  // Any of the provided v1 signatures matching is enough (Stripe
  // sends multiple while secrets are being rotated).
  return signatures.some((sig) => constantTimeEqual(sig, expected));
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
