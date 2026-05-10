//! Stripe subscription mirror — local cache of the user's billing state.
//!
//! Source of truth is Stripe. This row is hydrated from
//! `billing::get_subscription` and (eventually) a Cloudflare Worker
//! webhook. The desktop app reads it on boot to render the Settings →
//! Billing card without an outbound HTTP call on every paint.
//!
//! Schema lives in `migrations/0003_stripe.sql`.

use crate::db::{models::SubscriptionRow, now_ts, DbError, DbResult};
use serde::Deserialize;
use sqlx::SqlitePool;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertSubscriptionInput {
    pub user_id: String,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
    pub status: String,
    pub plan: String,
    pub current_period_end: Option<i64>,
    /// 0 / 1 boolean; SQLite stores it as INTEGER. The frontend sends
    /// `true`/`false` and serde decodes as bool — we coerce here.
    #[serde(default)]
    pub cancel_at_period_end: bool,
}

/// Read the subscription row for a user. None means "no Stripe record
/// yet" — the UI treats that as the free tier.
pub async fn get_subscription(
    pool: &SqlitePool,
    user_id: &str,
) -> DbResult<Option<SubscriptionRow>> {
    let row = sqlx::query_as::<_, SubscriptionRow>(
        "SELECT * FROM subscription WHERE user_id = ?1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// Upsert the subscription row. On every Stripe state change the
/// caller rebuilds the full row and shoves it through here.
pub async fn upsert_subscription(
    pool: &SqlitePool,
    input: UpsertSubscriptionInput,
) -> DbResult<SubscriptionRow> {
    if input.user_id.trim().is_empty() {
        return Err(DbError::InvalidInput("user_id is required".into()));
    }
    if input.status.trim().is_empty() {
        return Err(DbError::InvalidInput("status is required".into()));
    }
    if input.plan.trim().is_empty() {
        return Err(DbError::InvalidInput("plan is required".into()));
    }

    let now = now_ts();
    let cancel_flag: i64 = if input.cancel_at_period_end { 1 } else { 0 };

    sqlx::query(
        "INSERT INTO subscription (
            user_id, stripe_customer_id, stripe_subscription_id,
            status, plan, current_period_end, cancel_at_period_end, updated_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(user_id) DO UPDATE SET
            stripe_customer_id = excluded.stripe_customer_id,
            stripe_subscription_id = excluded.stripe_subscription_id,
            status = excluded.status,
            plan = excluded.plan,
            current_period_end = excluded.current_period_end,
            cancel_at_period_end = excluded.cancel_at_period_end,
            updated_at = excluded.updated_at",
    )
    .bind(&input.user_id)
    .bind(&input.stripe_customer_id)
    .bind(&input.stripe_subscription_id)
    .bind(&input.status)
    .bind(&input.plan)
    .bind(input.current_period_end)
    .bind(cancel_flag)
    .bind(now)
    .execute(pool)
    .await?;

    get_subscription(pool, &input.user_id)
        .await?
        .ok_or_else(|| DbError::NotFound(format!("subscription for user {}", input.user_id)))
}
