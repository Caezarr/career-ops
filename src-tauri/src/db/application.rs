use crate::db::{
    models::{Application, ApplicationDetail, ApplicationWithJob, Job, TimelineEvent},
    new_id, now_ts, timeline, DbError, DbResult,
};
use serde::Deserialize;
use sqlx::SqlitePool;

const VALID_STAGES: &[&str] = &[
    "sourced",
    "applied",
    "phone_screen",
    "interview",
    "offer",
    "rejected",
];

fn validate_stage(stage: &str) -> DbResult<()> {
    if VALID_STAGES.contains(&stage) {
        Ok(())
    } else {
        Err(DbError::InvalidInput(format!(
            "invalid stage '{stage}'; expected one of {VALID_STAGES:?}"
        )))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateApplicationInput {
    pub job_id: String,
    pub cv_id: Option<String>,
    pub cover_letter: Option<String>,
    pub stage: Option<String>,
    pub notes: Option<String>,
    pub applied_at: Option<i64>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateApplicationInput {
    pub cv_id: Option<String>,
    pub cover_letter: Option<String>,
    pub notes: Option<String>,
    pub ai_next_steps: Option<serde_json::Value>,
    pub applied_at: Option<i64>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationFilter {
    pub stage: Option<String>,
    pub job_id: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn list(
    pool: &SqlitePool,
    filter: ApplicationFilter,
) -> DbResult<Vec<ApplicationWithJob>> {
    let limit = filter.limit.unwrap_or(200).clamp(1, 1000);
    let offset = filter.offset.unwrap_or(0).max(0);

    let mut where_parts: Vec<String> = Vec::new();
    if filter.stage.is_some() {
        where_parts.push("a.stage = ?".into());
    }
    if filter.job_id.is_some() {
        where_parts.push("a.job_id = ?".into());
    }
    let where_clause = if where_parts.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_parts.join(" AND "))
    };

    let sql = format!(
        "SELECT a.id, a.job_id, a.cv_id, a.cover_letter, a.stage, a.notes,
                a.ai_next_steps, a.ai_next_steps_at, a.applied_at,
                a.created_at, a.updated_at,
                j.company, j.role, j.location, j.match_score
         FROM application a
         JOIN job j ON j.id = a.job_id
         {} ORDER BY a.updated_at DESC LIMIT ? OFFSET ?",
        where_clause
    );

    let mut q = sqlx::query_as::<_, ApplicationWithJob>(&sql);
    if let Some(s) = filter.stage.as_deref() {
        q = q.bind(s.to_string());
    }
    if let Some(j) = filter.job_id.as_deref() {
        q = q.bind(j.to_string());
    }
    q = q.bind(limit).bind(offset);

    Ok(q.fetch_all(pool).await?)
}

pub async fn get(pool: &SqlitePool, id: &str) -> DbResult<Application> {
    sqlx::query_as::<_, Application>("SELECT * FROM application WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| DbError::NotFound(format!("application {id}")))
}

pub async fn get_detail(pool: &SqlitePool, id: &str) -> DbResult<ApplicationDetail> {
    let application = get(pool, id).await?;
    let job = sqlx::query_as::<_, Job>("SELECT * FROM job WHERE id = ?1")
        .bind(&application.job_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| DbError::NotFound(format!("job {}", application.job_id)))?;
    let timeline = sqlx::query_as::<_, TimelineEvent>(
        "SELECT * FROM timeline_event WHERE application_id = ?1 ORDER BY occurred_at DESC",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;
    Ok(ApplicationDetail {
        application,
        job,
        timeline,
    })
}

pub async fn create(pool: &SqlitePool, input: CreateApplicationInput) -> DbResult<Application> {
    let stage = input.stage.unwrap_or_else(|| "sourced".to_string());
    validate_stage(&stage)?;

    let id = new_id();
    let now = now_ts();

    let mut tx = pool.begin().await?;

    sqlx::query(
        "INSERT INTO application (id, job_id, cv_id, cover_letter, stage, notes, applied_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)"
    )
    .bind(&id)
    .bind(&input.job_id)
    .bind(&input.cv_id)
    .bind(&input.cover_letter)
    .bind(&stage)
    .bind(&input.notes)
    .bind(input.applied_at)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    // Auto-create initial timeline event
    timeline::create_in_tx(
        &mut *tx,
        &id,
        "stage_changed",
        &format!("Created in stage: {stage}"),
        None,
    )
    .await?;

    tx.commit().await?;

    sqlx::query_as::<_, Application>("SELECT * FROM application WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool)
        .await
        .map_err(Into::into)
}

pub async fn update(
    pool: &SqlitePool,
    id: &str,
    patch: UpdateApplicationInput,
) -> DbResult<Application> {
    let now = now_ts();
    let next_steps_json = match patch.ai_next_steps {
        Some(v) => Some(serde_json::to_string(&v)?),
        None => None,
    };
    let next_steps_at = if next_steps_json.is_some() {
        Some(now)
    } else {
        None
    };

    sqlx::query(
        "UPDATE application SET
           cv_id = COALESCE(?1, cv_id),
           cover_letter = COALESCE(?2, cover_letter),
           notes = COALESCE(?3, notes),
           ai_next_steps = COALESCE(?4, ai_next_steps),
           ai_next_steps_at = COALESCE(?5, ai_next_steps_at),
           applied_at = COALESCE(?6, applied_at),
           updated_at = ?7
         WHERE id = ?8",
    )
    .bind(patch.cv_id)
    .bind(patch.cover_letter)
    .bind(patch.notes)
    .bind(next_steps_json)
    .bind(next_steps_at)
    .bind(patch.applied_at)
    .bind(now)
    .bind(id)
    .execute(pool)
    .await?;

    get(pool, id).await
}

/// Update stage and atomically write a timeline event for the change.
pub async fn update_stage(pool: &SqlitePool, id: &str, new_stage: &str) -> DbResult<Application> {
    validate_stage(new_stage)?;
    let now = now_ts();

    let mut tx = pool.begin().await?;

    let existing: Option<(String,)> = sqlx::query_as("SELECT stage FROM application WHERE id = ?1")
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?;
    let prev_stage = existing
        .ok_or_else(|| DbError::NotFound(format!("application {id}")))?
        .0;

    if new_stage == "applied" {
        sqlx::query("UPDATE application SET stage = ?1, updated_at = ?2, applied_at = COALESCE(applied_at, ?2) WHERE id = ?3")
            .bind(new_stage)
            .bind(now)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    } else {
        sqlx::query("UPDATE application SET stage = ?1, updated_at = ?2 WHERE id = ?3")
            .bind(new_stage)
            .bind(now)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    }

    timeline::create_in_tx(
        &mut *tx,
        id,
        "stage_changed",
        &format!("Stage: {prev_stage} -> {new_stage}"),
        None,
    )
    .await?;

    tx.commit().await?;
    get(pool, id).await
}

pub async fn delete(pool: &SqlitePool, id: &str) -> DbResult<()> {
    let res = sqlx::query("DELETE FROM application WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(DbError::NotFound(format!("application {id}")));
    }
    Ok(())
}
