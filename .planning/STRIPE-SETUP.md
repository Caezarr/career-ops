# Stripe setup — Career OS lifetime pricing

End-to-end walkthrough for connecting Stripe to the Worker backend.
Follow in order. **15 minutes total** if your Stripe account is ready.

## Pricing model

| Tier | Price | Mode | Guarantee | What it unlocks |
|---|---|---|---|---|
| **Free** | 0€ | — | — | Beta / limited usage |
| **Lifetime** | 99€ | one-time | No | Full Career OS, lifetime access |
| **Lifetime + Garantie** | 149€ | one-time | 180 days | Full Career OS + refund if 0 interview after 180d / ≥30 candidatures |

Both paid tiers are **one-time payments** (Stripe `mode=payment`), not subscriptions. The Worker never creates a subscription.

---

## 1. Stripe account

If you don't have one yet:

1. Go to https://dashboard.stripe.com/register
2. Sign up with `gabranpro@gmail.com`
3. **Stay in Test Mode** during setup (top-right toggle). We'll switch to Live once everything is wired and tested.

You don't need to fill in business details (SIRET, bank account) for Test Mode. That part comes when you flip to Live.

---

## 2. Create the two Products + Prices

In Stripe Dashboard → **Products** → **+ Add product**.

### Product 1: Career OS Lifetime

| Field | Value |
|---|---|
| Name | `Career OS — Lifetime` |
| Description | `Accès complet à Career OS pour toujours. Paiement unique, sans abonnement.` |
| Image | (optional) upload `brand/app-icon-mac.png` |

Then under **Pricing**:

| Field | Value |
|---|---|
| Pricing model | **Standard pricing** |
| Price | `99.00` EUR |
| Type | **One-time** ← critical, NOT recurring |
| Tax behavior | Inclusive (or whatever fits your accounting) |

Click **Save product**. Copy the **Price ID** (format `price_xxxxxxxxxxxxxxx`). You'll need it in step 4.

### Product 2: Career OS Lifetime + Garantie

| Field | Value |
|---|---|
| Name | `Career OS — Lifetime + Garantie` |
| Description | `Career OS à vie + garantie résultat 180 jours : aucun entretien décroché = remboursement intégral.` |

Pricing:

| Field | Value |
|---|---|
| Price | `149.00` EUR |
| Type | **One-time** |

Save. Copy the second Price ID.

---

## 3. Get the API keys

Stripe Dashboard → **Developers** → **API keys**.

You need **two** strings:

1. **Secret key** — starts with `sk_test_…` (or `sk_live_…` in Live mode). Click "Reveal test key". This goes into the Worker as `STRIPE_SECRET_KEY`.
2. (Webhook secret comes in step 5 — skip for now.)

---

## 4. Configure the Worker

```bash
cd /Users/gabriel/Desktop/Wonka/code/interview-copilot/worker

# Secret key — paste the sk_test_… string when prompted.
wrangler secret put STRIPE_SECRET_KEY

# Price IDs go in wrangler.toml [vars] (non-secret, fine to commit).
# Open wrangler.toml and replace:
#   STRIPE_PRICE_LIFETIME     = "price_PLACEHOLDER_LIFETIME"
#   STRIPE_PRICE_LIFETIME_PRO = "price_PLACEHOLDER_LIFETIME_PRO"
# with the real `price_…` strings from step 2.

# Deploy (price IDs need to land before webhook setup can test).
pnpm run deploy
```

---

## 5. Register the webhook endpoint

Stripe Dashboard → **Developers** → **Webhooks** → **+ Add endpoint**.

| Field | Value |
|---|---|
| Endpoint URL | `https://api.careeros.fr/v1/billing/webhook` |
| Description | `Career OS — Checkout completion` |
| Events to send | **Select events** → check `checkout.session.completed` (only this one for now) |
| API version | latest (the default) |

Click **Add endpoint**. On the resulting page, click **Reveal** under "Signing secret" — copy the `whsec_…` string.

Then back in the terminal:

```bash
cd /Users/gabriel/Desktop/Wonka/code/interview-copilot/worker
wrangler secret put STRIPE_WEBHOOK_SECRET
# paste the whsec_… string
```

Re-deploy so the new secret loads:

```bash
pnpm run deploy
```

---

## 6. Test end-to-end (Test Mode)

In the desktop app (`pnpm tauri dev` or installed v0.0.4+):

1. Settings → Billing → click **"Débloquer Career OS — 99€"** (or 149€)
2. Stripe Checkout opens in your browser
3. Use the test card: `4242 4242 4242 4242`, any future expiry, any 3-digit CVC, any postal code
4. Submit. Stripe redirects to `careeros://billing/success` → the Mac app opens with a confirmation.
5. Hit `GET https://api.careeros.fr/v1/billing/status` with your JWT (use `curl` or the app's own polling):
   ```bash
   curl -H "Authorization: Bearer <your-jwt>" \
        https://api.careeros.fr/v1/billing/status
   ```
   You should see `"plan": "lifetime"` (or `lifetime_pro`) + `"purchasedAt": <unix-ms>`.
6. Verify in Stripe Dashboard → Events: the `checkout.session.completed` event has status **Succeeded** (200 from your webhook).

If the webhook returns 400 "bad_signature" → you copied the wrong secret in step 5. Replace `STRIPE_WEBHOOK_SECRET` and redeploy.

---

## 7. Switch to Live mode

Only when steps 1-6 are validated:

1. Stripe Dashboard → toggle **Live mode** (top-right)
2. Stripe will ask to complete your business profile (SIRET, bank account for payouts, identity verification). 5-10 min.
3. **Recreate the 2 Products** (Stripe Live and Test are separate accounts). Same names, same prices.
4. Get the **Live API keys** (sk_live_…) and the **Live webhook secret** (different from Test).
5. Update the Worker secrets:
   ```bash
   wrangler secret put STRIPE_SECRET_KEY      # paste sk_live_…
   wrangler secret put STRIPE_WEBHOOK_SECRET  # paste new whsec_…
   ```
6. Update `wrangler.toml` with the Live Price IDs and `pnpm run deploy`.

---

## Refunds (manual process)

When a user requests a refund (`POST /v1/billing/refund` fires from the app):

1. Their request is flagged in D1 (`users.refund_requested_at` set).
2. **Review their activity manually** before approving:
   ```bash
   # Read their applications + interviews count
   wrangler d1 execute career_os --remote --command \
     "SELECT email, plan, refund_requested_at FROM users WHERE refund_requested_at IS NOT NULL ORDER BY refund_requested_at DESC LIMIT 10;"
   ```
3. If they meet the conditions (≥30 candidatures in Career OS, 0 interview decroche, within 180-day window):
   - Stripe Dashboard → **Payments** → find their payment by email or session ID
   - Click **Refund payment** → Full refund
4. Update D1 to record the refund:
   ```bash
   wrangler d1 execute career_os --remote --command \
     "UPDATE users SET refunded_at = $(date +%s)000 WHERE id = '<user-uuid>';"
   ```
5. Loops template "Refund processed" → email the user.

---

## Files modified by this setup

- `worker/migrations/0003_billing.sql` — D1 schema (already shipped)
- `worker/src/routes/billing.ts` — checkout / webhook / status / refund routes
- `worker/src/types.ts` — `Env`, `UserRow`, `Plan`, `REFUND_WINDOW_MS`
- `worker/wrangler.toml` — `STRIPE_PRICE_*` + `STRIPE_*_URL` vars
- `worker/src/index.ts` — mounted `/v1/billing`
