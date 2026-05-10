# Stripe Checkout — setup guide

Career OS post-beta runs on a recurring €15/mo subscription with a
discounted lifetime cohort for the first 100 users. The desktop app
hits Stripe directly for Checkout + subscription reads; webhook
fan-out (subscription state → desktop) lives in a Cloudflare Worker
that is **out of scope for this PR**.

This doc is the operator runbook. Follow it once per Stripe
environment (test, then live).

## 1. Stripe account + test mode

1. Create or open the Stripe account at https://dashboard.stripe.com.
2. Toggle the dashboard into **Test mode** (top-right switch).
3. All steps below run in test mode first. Repeat in live mode when
   ready to publish.

## 2. Product and price

1. Stripe Dashboard → **Products** → **Add product**.
2. Name: `Career OS Pro`.
3. Description: `Accès complet à Career OS — recherche d'emploi tout-en-un.`
4. Pricing model: **Standard pricing**.
5. Price: **€15.00 EUR**, **Recurring**, **Monthly**.
6. Save. Copy the price id from the price's detail panel — it looks
   like `price_1Q...` in test mode.

## 3. Wire the price id into the build

The desktop app reads the price id from a Vite env var so a single
binary ships against either environment:

```bash
# .env.local (NOT committed)
VITE_STRIPE_PRICE_PRO=price_1Q_test_xxx
```

The default fallback is `price_test_PLACEHOLDER`. With the placeholder
in place, Stripe rejects the Checkout request and the user sees a
clear error — by design. Never hardcode the real price id in source.

For the landing site (`landing/`) — if the marketing copy needs to
display the price too, mirror the env var there. The desktop app and
the landing page intentionally stay decoupled.

## 4. API key

The app calls Stripe with a **secret key** (sk_test_... or sk_live_...).
The user installs it once via the existing Keychain flow:

1. Run the app.
2. **Settings → API Keys & Integrations**.
3. Add the Stripe key — the slot name is `stripe_key`. (The IPC
   wire-format string is allow-listed in `lib.rs::parse_slot`.)
4. The secret stays in macOS Keychain (`career-os` service,
   `secret.stripe_key` account). It never touches localStorage.

For the public release, this becomes a hosted call via the Cloudflare
Worker so end users never paste a secret key. Until that ships, this
flow is for internal testing only.

## 5. Success / cancel URLs

The Tauri commands hardcode the redirects to:

```
success_url = https://career-os.app/billing/success?session_id={CHECKOUT_SESSION_ID}
cancel_url  = https://career-os.app/billing/cancel
```

The landing page renders a confirmation, then either deep-links the
user back into the app (when the deep-link protocol ships) or just
asks them to switch back manually. The app calls
`billing_get_subscription` on every boot so the new state hydrates on
next launch even without a deep link.

## 6. Webhook (out of scope, documented for follow-up)

Server-side webhook for keeping the subscription mirror fresh:

- Endpoint: `https://career-os.app/api/stripe/webhook` (Cloudflare
  Worker, ships in a separate PR).
- Events to subscribe to:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- The worker upserts the same `subscription` SQLite row via a thin
  authenticated tunnel (TBD — could be a CRDT sync, could be a poll
  endpoint the desktop hits on app focus).

Without the webhook, the desktop only learns about state changes when
the user reopens the Settings → Billing tab, which calls
`billing_get_subscription` on demand. Good enough for the beta-end
launch; the worker is a follow-up.

## 7. Validation checklist

Before flipping to live mode:

- [ ] Test card 4242 4242 4242 4242 succeeds, opens success URL.
- [ ] Test card 4000 0000 0000 9995 (insufficient funds) shows the
      Stripe error in the hosted Checkout — Career OS Settings stays
      on `free`.
- [ ] After a successful subscription, refreshing the Settings tab
      flips the badge to "Pro · actif" with the renewal date.
- [ ] Clicking "Annuler l'abonnement" sets `cancel_at_period_end` on
      the Stripe side (verify in the Stripe Dashboard) and the local
      mirror updates immediately.
- [ ] Unconfigured Stripe key returns "Stripe non configuré" instead
      of crashing — beta users without billing don't see scary errors.

## 8. Files involved

Backend:
- `src-tauri/src/billing.rs` — Stripe API client (raw HTTP via
  `cloud::default()`).
- `src-tauri/src/secrets.rs` — `SecretSlot::StripeKey`.
- `src-tauri/src/lib.rs` — `billing_create_checkout`,
  `billing_get_subscription`, `billing_cancel`, plus
  `parse_slot("stripe_key")`.
- `src-tauri/src/db/subscription.rs` — local Stripe mirror CRUD.
- `src-tauri/migrations/0003_stripe.sql` — schema.

Frontend:
- `src/dashboard/lib/billing.ts` — IPC wrappers + `STRIPE_PRICE_PRO`
  env read.
- `src/dashboard/components/settings/BillingTab.tsx` — UI.
- `src/dashboard/store/slices/billing.ts` — `subscriptionStatus` /
  `currentPeriodEnd` / `cancelAtPeriodEnd` / `hydrate`.
- `src/dashboard/hooks/useBillingHydrate.ts` — boot hydration.
- `src/dashboard/DashboardApp.tsx` — `<BillingHydrate />` mount.
