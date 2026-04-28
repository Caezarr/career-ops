use crate::db::{
    models::{InterviewSession, TranscriptEntry},
    new_id, now_ts, DbError, DbResult, DEFAULT_USER_ID,
};
use serde::Deserialize;
use sqlx::SqlitePool;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartInterviewInput {
    pub mode: String, // 'qa' | 'pitch'
    pub application_id: Option<String>,
}

pub async fn start(pool: &SqlitePool, input: StartInterviewInput) -> DbResult<InterviewSession> {
    if input.mode != "qa" && input.mode != "pitch" {
        return Err(DbError::InvalidInput(format!(
            "invalid mode '{}'; expected 'qa' or 'pitch'",
            input.mode
        )));
    }
    let id = new_id();
    let now = now_ts();

    sqlx::query(
        "INSERT INTO interview_session (id, user_id, application_id, mode, transcript, ai_responses, outcome, started_at, created_at)
         VALUES (?1, ?2, ?3, ?4, '[]', '[]', 'pending', ?5, ?5)",
    )
    .bind(&id)
    .bind(DEFAULT_USER_ID)
    .bind(&input.application_id)
    .bind(&input.mode)
    .bind(now)
    .execute(pool)
    .await?;

    get(pool, &id).await
}

pub async fn get(pool: &SqlitePool, id: &str) -> DbResult<InterviewSession> {
    sqlx::query_as::<_, InterviewSession>("SELECT * FROM interview_session WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| DbError::NotFound(format!("interview {id}")))
}

pub async fn append_transcript(
    pool: &SqlitePool,
    id: &str,
    entry: TranscriptEntry,
) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    let current: Option<String> =
        sqlx::query_scalar("SELECT transcript FROM interview_session WHERE id = ?1")
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(|| DbError::NotFound(format!("interview {id}")))?;

    let mut arr: Vec<TranscriptEntry> = match current {
        Some(s) if !s.is_empty() => serde_json::from_str(&s).unwrap_or_default(),
        _ => Vec::new(),
    };
    arr.push(entry);
    let updated = serde_json::to_string(&arr)?;

    sqlx::query("UPDATE interview_session SET transcript = ?1 WHERE id = ?2")
        .bind(&updated)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(())
}

pub async fn append_response(pool: &SqlitePool, id: &str, response: String) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    let current: Option<String> =
        sqlx::query_scalar("SELECT ai_responses FROM interview_session WHERE id = ?1")
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(|| DbError::NotFound(format!("interview {id}")))?;

    let mut arr: Vec<String> = match current {
        Some(s) if !s.is_empty() => serde_json::from_str(&s).unwrap_or_default(),
        _ => Vec::new(),
    };
    arr.push(response);
    let updated = serde_json::to_string(&arr)?;

    sqlx::query("UPDATE interview_session SET ai_responses = ?1 WHERE id = ?2")
        .bind(&updated)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(())
}

pub async fn end(
    pool: &SqlitePool,
    id: &str,
    summary: Option<String>,
) -> DbResult<InterviewSession> {
    let now = now_ts();
    sqlx::query(
        "UPDATE interview_session SET ended_at = ?1, summary = COALESCE(?2, summary) WHERE id = ?3",
    )
    .bind(now)
    .bind(summary)
    .bind(id)
    .execute(pool)
    .await?;
    get(pool, id).await
}

pub async fn list(
    pool: &SqlitePool,
    user_id: &str,
    limit: i64,
) -> DbResult<Vec<InterviewSession>> {
    let limit = limit.clamp(1, 500);
    let rows = sqlx::query_as::<_, InterviewSession>(
        "SELECT * FROM interview_session WHERE user_id = ?1 ORDER BY started_at DESC LIMIT ?2",
    )
    .bind(user_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}
