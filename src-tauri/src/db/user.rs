use crate::db::{models::User, now_ts, DbError, DbResult, DEFAULT_USER_ID};
use sqlx::SqlitePool;

pub async fn ensure_default_user(pool: &SqlitePool) -> DbResult<()> {
    let exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM user WHERE id = ?1")
        .bind(DEFAULT_USER_ID)
        .fetch_one(pool)
        .await?;
    if exists == 0 {
        let now = now_ts();
        sqlx::query(
            "INSERT INTO user (id, name, email, plan, language, created_at, updated_at)
             VALUES (?1, 'You', NULL, 'free', 'en-US', ?2, ?2)",
        )
        .bind(DEFAULT_USER_ID)
        .bind(now)
        .execute(pool)
        .await?;
    }
    Ok(())
}

pub async fn get_current(pool: &SqlitePool) -> DbResult<User> {
    sqlx::query_as::<_, User>("SELECT * FROM user WHERE id = ?1")
        .bind(DEFAULT_USER_ID)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| DbError::NotFound("default user".into()))
}

#[derive(serde::Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserInput {
    pub name: Option<String>,
    pub email: Option<String>,
    pub persona: Option<String>,
    pub timezone: Option<String>,
    pub language: Option<String>,
    pub location: Option<String>,
    pub target_role: Option<String>,
    pub target_company: Option<String>,
}

pub async fn update(pool: &SqlitePool, input: UpdateUserInput) -> DbResult<User> {
    let now = now_ts();

    sqlx::query(
        "UPDATE user SET
           name = COALESCE(?1, name),
           email = COALESCE(?2, email),
           persona = COALESCE(?3, persona),
           timezone = COALESCE(?4, timezone),
           language = COALESCE(?5, language),
           location = COALESCE(?6, location),
           target_role = COALESCE(?7, target_role),
           target_company = COALESCE(?8, target_company),
           updated_at = ?9
         WHERE id = ?10",
    )
    .bind(input.name)
    .bind(input.email)
    .bind(input.persona)
    .bind(input.timezone)
    .bind(input.language)
    .bind(input.location)
    .bind(input.target_role)
    .bind(input.target_company)
    .bind(now)
    .bind(DEFAULT_USER_ID)
    .execute(pool)
    .await?;

    get_current(pool).await
}

pub async fn mark_onboarded(pool: &SqlitePool) -> DbResult<()> {
    let now = now_ts();
    sqlx::query("UPDATE user SET onboarded_at = ?1, updated_at = ?2 WHERE id = ?3")
        .bind(now)
        .bind(now)
        .bind(DEFAULT_USER_ID)
        .execute(pool)
        .await?;
    Ok(())
}
