use crate::db::{models::TimelineEvent, new_id, now_ts, DbError, DbResult};
use serde::Deserialize;
use sqlx::SqliteExecutor;
use sqlx::SqlitePool;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTimelineInput {
    pub application_id: String,
    pub event_type: String,
    pub title: String,
    pub description: Option<String>,
    /// Defaults to now if not provided.
    pub occurred_at: Option<i64>,
}

pub async fn list_for_application(
    pool: &SqlitePool,
    application_id: &str,
) -> DbResult<Vec<TimelineEvent>> {
    let rows = sqlx::query_as::<_, TimelineEvent>(
        "SELECT * FROM timeline_event WHERE application_id = ?1 ORDER BY occurred_at DESC",
    )
    .bind(application_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn create(pool: &SqlitePool, input: CreateTimelineInput) -> DbResult<TimelineEvent> {
    if input.title.trim().is_empty() || input.event_type.trim().is_empty() {
        return Err(DbError::InvalidInput("event_type and title are required".into()));
    }
    let id = new_id();
    let now = now_ts();
    let occurred = input.occurred_at.unwrap_or(now);

    sqlx::query(
        "INSERT INTO timeline_event (id, application_id, event_type, title, description, occurred_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )
    .bind(&id)
    .bind(&input.application_id)
    .bind(&input.event_type)
    .bind(&input.title)
    .bind(&input.description)
    .bind(occurred)
    .bind(now)
    .execute(pool)
    .await?;

    sqlx::query_as::<_, TimelineEvent>("SELECT * FROM timeline_event WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool)
        .await
        .map_err(Into::into)
}

/// Internal helper used by application::update_stage to atomically log a timeline event
/// inside an existing transaction.
pub(crate) async fn create_in_tx<'e, E>(
    executor: E,
    application_id: &str,
    event_type: &str,
    title: &str,
    description: Option<&str>,
) -> DbResult<()>
where
    E: SqliteExecutor<'e>,
{
    let id = new_id();
    let now = now_ts();
    sqlx::query(
        "INSERT INTO timeline_event (id, application_id, event_type, title, description, occurred_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)"
    )
    .bind(&id)
    .bind(application_id)
    .bind(event_type)
    .bind(title)
    .bind(description)
    .bind(now)
    .execute(executor)
    .await?;
    Ok(())
}

pub async fn recent_global(pool: &SqlitePool, limit: i64) -> DbResult<Vec<TimelineEvent>> {
    let rows = sqlx::query_as::<_, TimelineEvent>(
        "SELECT * FROM timeline_event ORDER BY occurred_at DESC LIMIT ?1",
    )
    .bind(limit.clamp(1, 100))
    .fetch_all(pool)
    .await?;
    Ok(rows)
}
