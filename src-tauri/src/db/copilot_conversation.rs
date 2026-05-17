//! Persistent Live Copilot conversations (Sprint Week 1, task 1.3).
//!
//! Mirrors the pattern used by `db::interview` and `db::application`:
//! pure async fns over `&SqlitePool`, no Tauri types here. The Tauri
//! commands that wrap these live in `lib.rs` so the desktop / dashboard
//! windows can invoke them.
//!
//! Schema: see `migrations/0004_copilot_conversations.sql`.

use crate::db::{new_id, now_ts, DbError, DbResult, DEFAULT_USER_ID};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};

// ── Models (camelCase on the wire) ───────────────────────────────────────────

#[derive(Debug, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CopilotConversation {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub company: Option<String>,
    pub role: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub archived: i64,
}

#[derive(Debug, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CopilotMessage {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
    pub attachments: Option<String>,
    pub metadata: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationSummary {
    #[serde(flatten)]
    pub conversation: CopilotConversation,
    /// First ~80 chars of the latest `copilot` message, or empty if
    /// there isn't one yet. Drives the list-view preview without
    /// hydrating the whole message array.
    pub last_answer_preview: String,
    pub message_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationWithMessages {
    #[serde(flatten)]
    pub conversation: CopilotConversation,
    pub messages: Vec<CopilotMessage>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConversationInput {
    pub title: String,
    pub company: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendMessageInput {
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub attachments: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
}

// ── Queries ──────────────────────────────────────────────────────────────────

pub async fn create(
    pool: &SqlitePool,
    input: CreateConversationInput,
) -> DbResult<CopilotConversation> {
    let id = new_id();
    let now = now_ts();
    sqlx::query(
        "INSERT INTO copilot_conversation
         (id, user_id, title, company, role, created_at, updated_at, archived)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, 0)",
    )
    .bind(&id)
    .bind(DEFAULT_USER_ID)
    .bind(&input.title)
    .bind(&input.company)
    .bind(&input.role)
    .bind(now)
    .execute(pool)
    .await?;
    get(pool, &id).await
}

pub async fn get(pool: &SqlitePool, id: &str) -> DbResult<CopilotConversation> {
    sqlx::query_as::<_, CopilotConversation>(
        "SELECT * FROM copilot_conversation WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| DbError::NotFound(format!("copilot conversation {id}")))
}

pub async fn append_message(
    pool: &SqlitePool,
    input: AppendMessageInput,
) -> DbResult<CopilotMessage> {
    // Validate role: cheap defence against frontend bugs sneaking
    // an unknown role string through.
    if !matches!(
        input.role.as_str(),
        "interviewer" | "candidate" | "copilot" | "system"
    ) {
        return Err(DbError::InvalidInput(format!(
            "invalid copilot message role '{}'",
            input.role
        )));
    }
    let id = new_id();
    let now = now_ts();
    let attachments_json = input
        .attachments
        .as_ref()
        .map(serde_json::to_string)
        .transpose()?;
    let metadata_json = input
        .metadata
        .as_ref()
        .map(serde_json::to_string)
        .transpose()?;

    let mut tx = pool.begin().await?;
    sqlx::query(
        "INSERT INTO copilot_message
         (id, conversation_id, role, content, timestamp, attachments, metadata)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(&id)
    .bind(&input.conversation_id)
    .bind(&input.role)
    .bind(&input.content)
    .bind(now)
    .bind(&attachments_json)
    .bind(&metadata_json)
    .execute(&mut *tx)
    .await?;
    // Bump conversation.updated_at so the list view re-orders. We do
    // this in the same tx so the index ordering and the message write
    // are atomic.
    sqlx::query("UPDATE copilot_conversation SET updated_at = ?1 WHERE id = ?2")
        .bind(now)
        .bind(&input.conversation_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;

    sqlx::query_as::<_, CopilotMessage>("SELECT * FROM copilot_message WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool)
        .await
        .map_err(Into::into)
}

pub async fn load(pool: &SqlitePool, id: &str) -> DbResult<ConversationWithMessages> {
    let conversation = get(pool, id).await?;
    let messages: Vec<CopilotMessage> = sqlx::query_as::<_, CopilotMessage>(
        "SELECT * FROM copilot_message WHERE conversation_id = ?1 ORDER BY timestamp ASC",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;
    Ok(ConversationWithMessages {
        conversation,
        messages,
    })
}

pub async fn list(
    pool: &SqlitePool,
    limit: Option<u32>,
    offset: Option<u32>,
) -> DbResult<Vec<ConversationSummary>> {
    // Pluely-style: list view shows latest copilot answer as preview.
    // SQLite's correlated-subquery form keeps this in one round-trip.
    let lim = limit.unwrap_or(50) as i64;
    let off = offset.unwrap_or(0) as i64;
    let rows = sqlx::query_as::<_, (String, String, String, Option<String>, Option<String>, i64, i64, i64, Option<String>, i64)>(
        "SELECT c.id, c.user_id, c.title, c.company, c.role,
                c.created_at, c.updated_at, c.archived,
                (SELECT SUBSTR(content, 1, 80) FROM copilot_message
                 WHERE conversation_id = c.id AND role = 'copilot'
                 ORDER BY timestamp DESC LIMIT 1) AS last_answer_preview,
                (SELECT COUNT(*) FROM copilot_message
                 WHERE conversation_id = c.id) AS message_count
         FROM copilot_conversation c
         WHERE c.archived = 0
         ORDER BY c.updated_at DESC
         LIMIT ?1 OFFSET ?2",
    )
    .bind(lim)
    .bind(off)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| ConversationSummary {
            conversation: CopilotConversation {
                id: r.0,
                user_id: r.1,
                title: r.2,
                company: r.3,
                role: r.4,
                created_at: r.5,
                updated_at: r.6,
                archived: r.7,
            },
            last_answer_preview: r.8.unwrap_or_default(),
            message_count: r.9,
        })
        .collect())
}

pub async fn search(
    pool: &SqlitePool,
    query: &str,
    limit: Option<u32>,
) -> DbResult<Vec<ConversationSummary>> {
    // LIKE-search across title/company/role + message content. Good
    // enough for a few hundred conversations; if we grow past that
    // we can swap to FTS5 (sqlx supports it via raw query).
    let lim = limit.unwrap_or(50) as i64;
    let pattern = format!("%{}%", query.trim());
    let rows = sqlx::query_as::<_, (String, String, String, Option<String>, Option<String>, i64, i64, i64, Option<String>, i64)>(
        "SELECT c.id, c.user_id, c.title, c.company, c.role,
                c.created_at, c.updated_at, c.archived,
                (SELECT SUBSTR(content, 1, 80) FROM copilot_message
                 WHERE conversation_id = c.id AND role = 'copilot'
                 ORDER BY timestamp DESC LIMIT 1) AS last_answer_preview,
                (SELECT COUNT(*) FROM copilot_message
                 WHERE conversation_id = c.id) AS message_count
         FROM copilot_conversation c
         WHERE c.archived = 0
           AND (c.title LIKE ?1
                OR c.company LIKE ?1
                OR c.role LIKE ?1
                OR EXISTS (SELECT 1 FROM copilot_message m
                           WHERE m.conversation_id = c.id
                             AND m.content LIKE ?1))
         ORDER BY c.updated_at DESC
         LIMIT ?2",
    )
    .bind(&pattern)
    .bind(lim)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| ConversationSummary {
            conversation: CopilotConversation {
                id: r.0,
                user_id: r.1,
                title: r.2,
                company: r.3,
                role: r.4,
                created_at: r.5,
                updated_at: r.6,
                archived: r.7,
            },
            last_answer_preview: r.8.unwrap_or_default(),
            message_count: r.9,
        })
        .collect())
}

pub async fn archive(pool: &SqlitePool, id: &str) -> DbResult<()> {
    sqlx::query("UPDATE copilot_conversation SET archived = 1, updated_at = ?1 WHERE id = ?2")
        .bind(now_ts())
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete(pool: &SqlitePool, id: &str) -> DbResult<()> {
    // Cascade via ON DELETE CASCADE on copilot_message.conversation_id.
    sqlx::query("DELETE FROM copilot_conversation WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn update_title(pool: &SqlitePool, id: &str, title: &str) -> DbResult<()> {
    sqlx::query("UPDATE copilot_conversation SET title = ?1, updated_at = ?2 WHERE id = ?3")
        .bind(title)
        .bind(now_ts())
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
