use crate::db::{models::Job, new_id, now_ts, DbError, DbResult};
use serde::Deserialize;
use sqlx::SqlitePool;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateJobInput {
    pub company: String,
    pub role: String,
    pub source: Option<String>,
    pub source_url: Option<String>,
    pub location: Option<String>,
    pub salary_min: Option<i64>,
    pub salary_max: Option<i64>,
    pub salary_currency: Option<String>,
    pub jd_text: Option<String>,
    pub match_score: Option<f64>,
    pub starred: Option<bool>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateJobInput {
    pub company: Option<String>,
    pub role: Option<String>,
    pub source: Option<String>,
    pub source_url: Option<String>,
    pub location: Option<String>,
    pub salary_min: Option<i64>,
    pub salary_max: Option<i64>,
    pub salary_currency: Option<String>,
    pub jd_text: Option<String>,
    pub match_score: Option<f64>,
    pub starred: Option<bool>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct JobFilter {
    pub company: Option<String>,
    pub starred: Option<bool>,
    pub source: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn list(pool: &SqlitePool, filter: JobFilter) -> DbResult<Vec<Job>> {
    let limit = filter.limit.unwrap_or(100).clamp(1, 500);
    let offset = filter.offset.unwrap_or(0).max(0);

    // Build dynamic WHERE
    let mut where_parts: Vec<String> = Vec::new();
    if filter.company.is_some() {
        where_parts.push("company LIKE ?".into());
    }
    if filter.starred.is_some() {
        where_parts.push("starred = ?".into());
    }
    if filter.source.is_some() {
        where_parts.push("source = ?".into());
    }
    let where_clause = if where_parts.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", where_parts.join(" AND "))
    };

    let sql = format!(
        "SELECT * FROM job{} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        where_clause
    );

    let mut q = sqlx::query_as::<_, Job>(&sql);
    if let Some(c) = filter.company.as_deref() {
        q = q.bind(format!("%{c}%"));
    }
    if let Some(s) = filter.starred {
        q = q.bind(if s { 1_i64 } else { 0_i64 });
    }
    if let Some(s) = filter.source.as_deref() {
        q = q.bind(s.to_string());
    }
    q = q.bind(limit).bind(offset);

    let rows = q.fetch_all(pool).await?;
    Ok(rows)
}

pub async fn get(pool: &SqlitePool, id: &str) -> DbResult<Job> {
    sqlx::query_as::<_, Job>("SELECT * FROM job WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| DbError::NotFound(format!("job {id}")))
}

pub async fn create(pool: &SqlitePool, input: CreateJobInput) -> DbResult<Job> {
    if input.company.trim().is_empty() || input.role.trim().is_empty() {
        return Err(DbError::InvalidInput("company and role are required".into()));
    }

    let id = new_id();
    let now = now_ts();
    let source = input.source.unwrap_or_else(|| "manual".to_string());
    let currency = input
        .salary_currency
        .unwrap_or_else(|| "EUR".to_string());

    sqlx::query(
        "INSERT INTO job (id, source, source_url, company, role, location, salary_min, salary_max,
                          salary_currency, jd_text, match_score, starred, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)",
    )
    .bind(&id)
    .bind(&source)
    .bind(&input.source_url)
    .bind(&input.company)
    .bind(&input.role)
    .bind(&input.location)
    .bind(input.salary_min)
    .bind(input.salary_max)
    .bind(&currency)
    .bind(&input.jd_text)
    .bind(input.match_score)
    .bind(if input.starred.unwrap_or(false) { 1_i64 } else { 0_i64 })
    .bind(now)
    .execute(pool)
    .await?;

    get(pool, &id).await
}

pub async fn update(pool: &SqlitePool, id: &str, patch: UpdateJobInput) -> DbResult<Job> {
    let now = now_ts();
    sqlx::query(
        "UPDATE job SET
           company = COALESCE(?1, company),
           role = COALESCE(?2, role),
           source = COALESCE(?3, source),
           source_url = COALESCE(?4, source_url),
           location = COALESCE(?5, location),
           salary_min = COALESCE(?6, salary_min),
           salary_max = COALESCE(?7, salary_max),
           salary_currency = COALESCE(?8, salary_currency),
           jd_text = COALESCE(?9, jd_text),
           match_score = COALESCE(?10, match_score),
           starred = COALESCE(?11, starred),
           updated_at = ?12
         WHERE id = ?13",
    )
    .bind(patch.company)
    .bind(patch.role)
    .bind(patch.source)
    .bind(patch.source_url)
    .bind(patch.location)
    .bind(patch.salary_min)
    .bind(patch.salary_max)
    .bind(patch.salary_currency)
    .bind(patch.jd_text)
    .bind(patch.match_score)
    .bind(patch.starred.map(|b| if b { 1_i64 } else { 0_i64 }))
    .bind(now)
    .bind(id)
    .execute(pool)
    .await?;
    get(pool, id).await
}

pub async fn delete(pool: &SqlitePool, id: &str) -> DbResult<()> {
    let res = sqlx::query("DELETE FROM job WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(DbError::NotFound(format!("job {id}")));
    }
    Ok(())
}
