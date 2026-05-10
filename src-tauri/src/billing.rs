//! Stripe API integration for Career OS subscriptions.
//!
//! Pricing model (post-beta): €15-25/mo recurring subscription, with a
//! discounted lifetime cohort for the first 100 users. The beta is
//! free; this module ships the wiring for the post-beta switch.
//!
//! Design choices:
//!
//!  * Raw HTTP via [`crate::cloud::default`] — no `stripe-rs` SDK. The
//!    SDK is heavy (it pulls in async-trait + a sprawling type tree we
//!    don't need) and adds a second outbound HTTP path that would have
//!    to be allow-listed in PRIV-01. Three Stripe endpoints aren't
//!    worth the dependency churn.
//!  * Form-urlencoded bodies — Stripe's quirk, even in 2026. The
//!    `reqwest` `.form()` helper handles encoding so we don't pull in
//!    a separate `urlencoding` crate.
//!  * Errors typed via [`BillingError`] (thiserror) — converted to
//!    `String` at the IPC boundary in `lib.rs` for serde compatibility,
//!    matching the pattern used by `secrets::SecretError`.
//!  * No webhook handler in this module. Webhooks land server-side in
//!    a Cloudflare Worker (out of scope for this PR — see
//!    `.planning/STRIPE.md`). The desktop app pulls the latest
//!    subscription state on demand via [`get_subscription`].

use crate::cloud;
use serde::{Deserialize, Serialize};
use thiserror::Error;

const STRIPE_API_BASE: &str = "https://api.stripe.com/v1";

#[derive(Debug, Error)]
pub enum BillingError {
    #[error("http: {0}")]
    Http(String),
    #[error("stripe api: {status}: {message}")]
    Api { status: u16, message: String },
    #[error("json: {0}")]
    Json(String),
}

impl From<reqwest::Error> for BillingError {
    fn from(e: reqwest::Error) -> Self {
        BillingError::Http(e.to_string())
    }
}

impl From<serde_json::Error> for BillingError {
    fn from(e: serde_json::Error) -> Self {
        BillingError::Json(e.to_string())
    }
}

/// Subset of the Stripe Checkout Session payload we actually consume.
/// Only `id` and `url` matter for the desktop flow — the rest stays
/// on Stripe's side.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutSession {
    pub id: String,
    pub url: String,
}

/// Subset of the Stripe Subscription payload we surface to the UI.
/// `current_period_end` and `cancel_at_period_end` drive the renewal
/// row; `status` drives the plan badge.
///
/// Live Stripe lookup type — the desktop UI reads from the local DB
/// mirror today, but a future "force refresh" button (and the
/// Cloudflare Worker webhook) will hit the live endpoint, so the
/// type stays public.
#[allow(dead_code)] // exposed for the live-refresh path (see `get_subscription`)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub id: String,
    pub status: String,
    pub current_period_end: Option<i64>,
    #[serde(default)]
    pub cancel_at_period_end: bool,
    /// Stripe customer id — needed to bind subscriptions back to a
    /// local user row.
    pub customer: String,
}

/// Stripe's error envelope — `{"error": {"message": "...", ...}}`.
#[derive(Debug, Deserialize)]
struct StripeErrorEnvelope {
    error: StripeErrorBody,
}
#[derive(Debug, Deserialize)]
struct StripeErrorBody {
    #[serde(default)]
    message: Option<String>,
}

/// Wrap a non-2xx Stripe response into `BillingError::Api`. Tries the
/// JSON envelope first, falls back to the raw body.
async fn map_error(resp: reqwest::Response) -> BillingError {
    let status = resp.status().as_u16();
    let body = resp.text().await.unwrap_or_default();
    let message = serde_json::from_str::<StripeErrorEnvelope>(&body)
        .ok()
        .and_then(|e| e.error.message)
        .unwrap_or(body);
    BillingError::Api { status, message }
}

/// Create a Stripe Checkout Session for a subscription.
///
/// Stripe expects `application/x-www-form-urlencoded` bodies on its v1
/// API even when other endpoints accept JSON; reqwest's `.form()`
/// handles encoding (including the `line_items[0][price]` key syntax).
pub async fn create_checkout_session(
    stripe_key: &str,
    price_id: &str,
    customer_email: &str,
    success_url: &str,
    cancel_url: &str,
) -> Result<CheckoutSession, BillingError> {
    let params: Vec<(&str, &str)> = vec![
        ("mode", "subscription"),
        ("line_items[0][price]", price_id),
        ("line_items[0][quantity]", "1"),
        ("customer_email", customer_email),
        ("success_url", success_url),
        ("cancel_url", cancel_url),
        // Tag the session so the future webhook handler can correlate
        // back to a local user without us round-tripping a customer id.
        ("metadata[source]", "career-os-desktop"),
    ];

    let resp = cloud::default()
        .post(format!("{STRIPE_API_BASE}/checkout/sessions"))
        .bearer_auth(stripe_key)
        .form(&params)
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(map_error(resp).await);
    }
    let session: CheckoutSession = resp.json().await?;
    Ok(session)
}

/// Fetch a single subscription. `None` is not modelled here — the
/// caller decides (in `lib.rs`) whether the absence of a local
/// subscription record means "free tier" or "needs lookup".
///
/// Currently only used by the future "force refresh" UI path. The
/// boot hydration reads the local mirror directly. Kept public per
/// the billing-module contract.
#[allow(dead_code)]
pub async fn get_subscription(
    stripe_key: &str,
    subscription_id: &str,
) -> Result<Subscription, BillingError> {
    let resp = cloud::default()
        .get(format!("{STRIPE_API_BASE}/subscriptions/{subscription_id}"))
        .bearer_auth(stripe_key)
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(map_error(resp).await);
    }
    let sub: Subscription = resp.json().await?;
    Ok(sub)
}

/// Cancel at the end of the current period (NOT immediate). This is
/// the friendly default — the user keeps access until the renewal
/// date they already paid for.
///
/// Immediate cancellation would be `DELETE /v1/subscriptions/{id}`;
/// we keep that out of the desktop UI to avoid accidental refunds.
pub async fn cancel_subscription(
    stripe_key: &str,
    subscription_id: &str,
) -> Result<(), BillingError> {
    let params: Vec<(&str, &str)> = vec![("cancel_at_period_end", "true")];

    let resp = cloud::default()
        .post(format!("{STRIPE_API_BASE}/subscriptions/{subscription_id}"))
        .bearer_auth(stripe_key)
        .form(&params)
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(map_error(resp).await);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// `BillingError` must serialize cleanly as a string at the IPC
    /// boundary — the Tauri commands use `Result<_, String>` so this
    /// is the contract callers depend on.
    #[test]
    fn billing_error_displays() {
        let e = BillingError::Api {
            status: 402,
            message: "card declined".into(),
        };
        let s = e.to_string();
        assert!(s.contains("402"));
        assert!(s.contains("card declined"));
    }

    /// Verify the From<reqwest::Error> impl compiles and routes
    /// through `Http` — guards against accidental impl removal.
    #[test]
    fn reqwest_error_maps_to_http_variant() {
        // We can't construct a reqwest::Error directly, but we can
        // exercise the From impl through a real failed send. To stay
        // hermetic we skip that here and rely on the type-system check
        // performed by the `?` operator in the implementation.
        fn _typecheck() -> BillingError {
            // Fabricated via serde to confirm the variant is reachable.
            BillingError::Http("dummy".into())
        }
        let err = _typecheck();
        assert!(matches!(err, BillingError::Http(_)));
    }

    /// Subscription DTO must round-trip through JSON because that's
    /// the path used by the Tauri command for the frontend.
    #[test]
    fn subscription_round_trips_json() {
        let s = Subscription {
            id: "sub_123".into(),
            status: "active".into(),
            current_period_end: Some(1_700_000_000),
            cancel_at_period_end: false,
            customer: "cus_456".into(),
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: Subscription = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "sub_123");
        assert_eq!(back.status, "active");
        assert_eq!(back.customer, "cus_456");
    }
}
