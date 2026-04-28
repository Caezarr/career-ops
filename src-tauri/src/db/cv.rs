use crate::db::{
    models::{Cv, CvSummary},
    new_id, now_ts, DbError, DbResult, DEFAULT_USER_ID,
};
use serde::Deserialize;
use sqlx::SqlitePool;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCvInput {
    pub name: String,
    pub role_focus: Option<String>,
    /// Base64-encoded PDF (optional — can be added later).
    pub b64_pdf: Option<String>,
    pub parsed_text: Option<String>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCvInput {
    pub name: Option<String>,
    pub role_focus: Option<String>,
    pub parsed_text: Option<String>,
}

pub async fn list(pool: &SqlitePool, user_id: &str) -> DbResult<Vec<CvSummary>> {
    let rows = sqlx::query_as::<_, CvSummary>(
        "SELECT id, user_id, name, role_focus, parsed_text, ats_score, is_default, created_at, updated_at
         FROM cv WHERE user_id = ?1 ORDER BY is_default DESC, updated_at DESC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn get_summary(pool: &SqlitePool, id: &str) -> DbResult<CvSummary> {
    sqlx::query_as::<_, CvSummary>(
        "SELECT id, user_id, name, role_focus, parsed_text, ats_score, is_default, created_at, updated_at
         FROM cv WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| DbError::NotFound(format!("cv {id}")))
}

#[allow(dead_code)] // used when serving the PDF blob for download/preview
pub async fn get_with_blob(pool: &SqlitePool, id: &str) -> DbResult<Cv> {
    sqlx::query_as::<_, Cv>("SELECT * FROM cv WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| DbError::NotFound(format!("cv {id}")))
}

pub async fn create(pool: &SqlitePool, input: CreateCvInput) -> DbResult<CvSummary> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    if input.name.trim().is_empty() {
        return Err(DbError::InvalidInput("name is required".into()));
    }

    let id = new_id();
    let now = now_ts();
    let pdf_blob: Option<Vec<u8>> = match input.b64_pdf {
        Some(b64) if !b64.is_empty() => {
            // Strip a data: prefix if present
            let b = b64.split(',').next_back().unwrap_or(&b64);
            Some(
                STANDARD
                    .decode(b.trim())
                    .map_err(|e| DbError::InvalidInput(format!("bad base64: {e}")))?,
            )
        }
        _ => None,
    };
    let is_default = input.is_default.unwrap_or(false);

    let mut tx = pool.begin().await?;

    // If new CV is default, unset others
    if is_default {
        sqlx::query("UPDATE cv SET is_default = 0, updated_at = ?1 WHERE user_id = ?2")
            .bind(now)
            .bind(DEFAULT_USER_ID)
            .execute(&mut *tx)
            .await?;
    }

    sqlx::query(
        "INSERT INTO cv (id, user_id, name, role_focus, pdf_blob, parsed_text, is_default, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)"
    )
    .bind(&id)
    .bind(DEFAULT_USER_ID)
    .bind(&input.name)
    .bind(&input.role_focus)
    .bind(pdf_blob.as_deref())
    .bind(&input.parsed_text)
    .bind(if is_default { 1_i64 } else { 0_i64 })
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    get_summary(pool, &id).await
}

pub async fn update(pool: &SqlitePool, id: &str, patch: UpdateCvInput) -> DbResult<CvSummary> {
    let now = now_ts();
    sqlx::query(
        "UPDATE cv SET
           name = COALESCE(?1, name),
           role_focus = COALESCE(?2, role_focus),
           parsed_text = COALESCE(?3, parsed_text),
           updated_at = ?4
         WHERE id = ?5",
    )
    .bind(patch.name)
    .bind(patch.role_focus)
    .bind(patch.parsed_text)
    .bind(now)
    .bind(id)
    .execute(pool)
    .await?;
    get_summary(pool, id).await
}

pub async fn set_default(pool: &SqlitePool, id: &str) -> DbResult<()> {
    let now = now_ts();
    let mut tx = pool.begin().await?;

    // Confirm cv exists and read its user_id
    let user_id: Option<String> = sqlx::query_scalar("SELECT user_id FROM cv WHERE id = ?1")
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?;
    let user_id = user_id.ok_or_else(|| DbError::NotFound(format!("cv {id}")))?;

    sqlx::query("UPDATE cv SET is_default = 0, updated_at = ?1 WHERE user_id = ?2")
        .bind(now)
        .bind(&user_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("UPDATE cv SET is_default = 1, updated_at = ?1 WHERE id = ?2")
        .bind(now)
        .bind(id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
    Ok(())
}

#[allow(dead_code)] // wired in the ATS-analysis sprint; kept here for completeness
pub async fn update_ats_score(pool: &SqlitePool, id: &str, score: f64) -> DbResult<()> {
    let now = now_ts();
    sqlx::query("UPDATE cv SET ats_score = ?1, updated_at = ?2 WHERE id = ?3")
        .bind(score)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete(pool: &SqlitePool, id: &str) -> DbResult<()> {
    let res = sqlx::query("DELETE FROM cv WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(DbError::NotFound(format!("cv {id}")));
    }
    Ok(())
}
