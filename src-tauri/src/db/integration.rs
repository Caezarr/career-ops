use crate::db::{models::Integration, now_ts, DbError, DbResult};
use serde::Deserialize;
use sqlx::SqlitePool;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertIntegrationInput {
    pub id: String, // 'anthropic' | 'openai' | 'assemblyai'
    pub status: String,
    pub model: Option<String>,
    pub config: Option<serde_json::Value>,
}

pub async fn list(pool: &SqlitePool) -> DbResult<Vec<Integration>> {
    let rows = sqlx::query_as::<_, Integration>("SELECT * FROM integration ORDER BY id")
        .fetch_all(pool)
        .await?;
    Ok(rows)
}

pub async fn get(pool: &SqlitePool, id: &str) -> DbResult<Option<Integration>> {
    let row = sqlx::query_as::<_, Integration>("SELECT * FROM integration WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await?;
    Ok(row)
}

pub async fn upsert(pool: &SqlitePool, input: UpsertIntegrationInput) -> DbResult<Integration> {
    if input.id.trim().is_empty() {
        return Err(DbError::InvalidInput("integration id is required".into()));
    }
    let now = now_ts();
    let config_json = match input.config {
        Some(v) => Some(serde_json::to_string(&v)?),
        None => None,
    };
    let connected_at = if input.status == "connected" {
        Some(now)
    } else {
        None
    };

    sqlx::query(
        "INSERT INTO integration (id, status, model, config, connected_at, last_validated_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?6)
         ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            model = COALESCE(excluded.model, integration.model),
            config = COALESCE(excluded.config, integration.config),
            connected_at = COALESCE(excluded.connected_at, integration.connected_at),
            last_validated_at = excluded.last_validated_at,
            updated_at = excluded.updated_at",
    )
    .bind(&input.id)
    .bind(&input.status)
    .bind(&input.model)
    .bind(&config_json)
    .bind(connected_at)
    .bind(now)
    .execute(pool)
    .await?;

    get(pool, &input.id)
        .await?
        .ok_or_else(|| DbError::NotFound(format!("integration {}", input.id)))
}
