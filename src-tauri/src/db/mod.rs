pub mod application;
pub mod copilot_conversation;
pub mod cv;
pub mod error;
pub mod ingest;
pub mod integration;
pub mod interview;
pub mod job;
pub mod models;
pub mod prep;
pub mod subscription;
pub mod timeline;
pub mod user;

#[cfg(test)]
mod tests;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;
use tauri::Manager;

pub use error::{DbError, DbResult};

/// Default user id for the local-first single-user mode.
pub const DEFAULT_USER_ID: &str = "local-default";

/// Initialize the SQLite pool, run migrations, ensure default user exists.
pub async fn init_pool(app: &tauri::AppHandle) -> anyhow::Result<SqlitePool> {
    let dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&dir)?;
    let db_path = dir.join("career-os.db");

    let opts = SqliteConnectOptions::from_str(&format!("sqlite://{}", db_path.display()))?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(opts)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    // Ensure default user row exists (single-user local-first)
    user::ensure_default_user(&pool).await?;

    Ok(pool)
}

/// Audio dir for prep recordings inside app data dir.
#[allow(dead_code)] // used by future prep recording flows
pub fn audio_dir(app: &tauri::AppHandle) -> anyhow::Result<std::path::PathBuf> {
    let dir = app.path().app_data_dir()?.join("audio");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

/// Generate a new uuid as String for a primary key.
pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Current epoch seconds.
pub fn now_ts() -> i64 {
    chrono::Utc::now().timestamp()
}
