use crate::db::{
    models::{CategoryCount, PrepSession, PrepStats, WeekCount},
    new_id, now_ts, DbError, DbResult, DEFAULT_USER_ID,
};
use serde::Deserialize;
use sqlx::SqlitePool;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePrepInput {
    pub question: String,
    pub category: Option<String>,
    pub difficulty: Option<String>,
    pub framework: Option<String>,
    pub target_company: Option<String>,
    pub target_role: Option<String>,
    pub user_answer_text: Option<String>,
    pub user_answer_audio_path: Option<String>,
    pub score_structure: Option<f64>,
    pub score_conciseness: Option<f64>,
    pub score_evidence: Option<f64>,
    pub score_memorability: Option<f64>,
    pub ai_feedback: Option<serde_json::Value>,
    pub ai_improved_answer: Option<String>,
    pub recorded_at: Option<i64>,
}

pub async fn create(pool: &SqlitePool, input: CreatePrepInput) -> DbResult<PrepSession> {
    if input.question.trim().is_empty() {
        return Err(DbError::InvalidInput("question is required".into()));
    }
    let id = new_id();
    let now = now_ts();
    let recorded = input.recorded_at.unwrap_or(now);
    let feedback_json = match input.ai_feedback {
        Some(v) => Some(serde_json::to_string(&v)?),
        None => None,
    };

    sqlx::query(
        "INSERT INTO prep_session (
            id, user_id, question, category, difficulty, framework,
            target_company, target_role, user_answer_text, user_answer_audio_path,
            score_structure, score_conciseness, score_evidence, score_memorability,
            ai_feedback, ai_improved_answer, recorded_at, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
    )
    .bind(&id)
    .bind(DEFAULT_USER_ID)
    .bind(&input.question)
    .bind(&input.category)
    .bind(&input.difficulty)
    .bind(&input.framework)
    .bind(&input.target_company)
    .bind(&input.target_role)
    .bind(&input.user_answer_text)
    .bind(&input.user_answer_audio_path)
    .bind(input.score_structure)
    .bind(input.score_conciseness)
    .bind(input.score_evidence)
    .bind(input.score_memorability)
    .bind(feedback_json)
    .bind(&input.ai_improved_answer)
    .bind(recorded)
    .bind(now)
    .execute(pool)
    .await?;

    sqlx::query_as::<_, PrepSession>("SELECT * FROM prep_session WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool)
        .await
        .map_err(Into::into)
}

pub async fn list(
    pool: &SqlitePool,
    user_id: &str,
    limit: i64,
    offset: i64,
) -> DbResult<Vec<PrepSession>> {
    let limit = limit.clamp(1, 500);
    let offset = offset.max(0);
    let rows = sqlx::query_as::<_, PrepSession>(
        "SELECT * FROM prep_session WHERE user_id = ?1
         ORDER BY recorded_at DESC LIMIT ?2 OFFSET ?3",
    )
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn stats(pool: &SqlitePool, user_id: &str) -> DbResult<PrepStats> {
    let total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM prep_session WHERE user_id = ?1")
            .bind(user_id)
            .fetch_one(pool)
            .await?;

    // average across the four scores when present
    let avg_score: Option<f64> = sqlx::query_scalar(
        "SELECT AVG((COALESCE(score_structure,0) + COALESCE(score_conciseness,0)
                    + COALESCE(score_evidence,0) + COALESCE(score_memorability,0)) / 4.0)
         FROM prep_session
         WHERE user_id = ?1
           AND (score_structure IS NOT NULL OR score_conciseness IS NOT NULL
                OR score_evidence IS NOT NULL OR score_memorability IS NOT NULL)",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    let by_category = sqlx::query_as::<_, CategoryCount>(
        "SELECT category, COUNT(*) as count FROM prep_session
         WHERE user_id = ?1 GROUP BY category ORDER BY count DESC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    // SQLite doesn't have ISO-week directly; use strftime for YYYY-WW
    let by_week = sqlx::query_as::<_, WeekCount>(
        "SELECT strftime('%Y-%W', recorded_at, 'unixepoch') as week, COUNT(*) as count
         FROM prep_session WHERE user_id = ?1 GROUP BY week ORDER BY week DESC LIMIT 12",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(PrepStats {
        total,
        avg_score,
        by_category,
        by_week,
    })
}
