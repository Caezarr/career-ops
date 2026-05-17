//! Tauri commands that wrap the `db::*` SQLite helpers.
//!
//! Sprint 6 (audit Backend HIGH — `lib.rs` partial split): extracted
//! verbatim from `lib.rs` so the entry point shrinks and each domain
//! has its own module. The bodies are byte-for-byte the same as the
//! pre-split versions; only the surrounding syntactic context (uses,
//! visibility) is new. The `invoke_handler!` macro in `lib.rs` resolves
//! these via a glob `pub use` — see `lib.rs` for the wiring.
//!
//! Window-label assertions stay in `lib.rs` and are re-exported as
//! `pub(crate)` so the writes here can keep gating with
//! `assert_main_or_copilot_db`.

use sqlx::SqlitePool;
use tauri::{State, WebviewWindow};

use crate::assert_main_or_copilot_db;
use crate::db::{
    self,
    models::{
        Application, ApplicationDetail, ApplicationWithJob, CvSummary, DashboardStats,
        Integration, InterviewSession, Job, PipelineCounts, PrepSession, PrepStats,
        TimelineEvent, TranscriptEntry, User,
    },
    DbError,
};

// ============================================================================
// DB commands — User
// ============================================================================

#[tauri::command]
pub async fn db_get_user(pool: State<'_, SqlitePool>) -> Result<User, DbError> {
    db::user::get_current(pool.inner()).await
}

#[tauri::command]
pub async fn db_update_user(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    input: db::user::UpdateUserInput,) -> Result<User, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::user::update(pool.inner(), input).await
}

#[tauri::command]
pub async fn db_mark_onboarded(window: WebviewWindow,
    pool: State<'_, SqlitePool>) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::user::mark_onboarded(pool.inner()).await
}

// ============================================================================
// DB commands — CV
// ============================================================================

#[tauri::command]
pub async fn db_list_cvs(pool: State<'_, SqlitePool>) -> Result<Vec<CvSummary>, DbError> {
    db::cv::list(pool.inner(), db::DEFAULT_USER_ID).await
}

#[tauri::command]
pub async fn db_get_cv(pool: State<'_, SqlitePool>, id: String) -> Result<CvSummary, DbError> {
    db::cv::get_summary(pool.inner(), &id).await
}

#[tauri::command]
pub async fn db_create_cv(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    input: db::cv::CreateCvInput,) -> Result<CvSummary, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::cv::create(pool.inner(), input).await
}

#[tauri::command]
pub async fn db_update_cv(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,
    patch: db::cv::UpdateCvInput,) -> Result<CvSummary, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::cv::update(pool.inner(), &id, patch).await
}

#[tauri::command]
pub async fn db_set_default_cv(window: WebviewWindow,
    pool: State<'_, SqlitePool>, id: String) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::cv::set_default(pool.inner(), &id).await
}

#[tauri::command]
pub async fn db_delete_cv(
    pool: State<'_, SqlitePool>,
    window: WebviewWindow,
    id: String,
) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::cv::delete(pool.inner(), &id).await
}

// ============================================================================
// DB commands — Job
// ============================================================================

#[tauri::command]
pub async fn db_list_jobs(
    pool: State<'_, SqlitePool>,
    filter: Option<db::job::JobFilter>,
) -> Result<Vec<Job>, DbError> {
    db::job::list(pool.inner(), filter.unwrap_or_default()).await
}

#[tauri::command]
pub async fn db_get_job(pool: State<'_, SqlitePool>, id: String) -> Result<Job, DbError> {
    db::job::get(pool.inner(), &id).await
}

#[tauri::command]
pub async fn db_create_job(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    input: db::job::CreateJobInput,) -> Result<Job, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::job::create(pool.inner(), input).await
}

#[tauri::command]
pub async fn db_update_job(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,
    patch: db::job::UpdateJobInput,) -> Result<Job, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::job::update(pool.inner(), &id, patch).await
}

#[tauri::command]
pub async fn db_delete_job(window: WebviewWindow,
    pool: State<'_, SqlitePool>, id: String) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::job::delete(pool.inner(), &id).await
}

// ============================================================================
// DB commands — Application
// ============================================================================

#[tauri::command]
pub async fn db_list_applications(
    pool: State<'_, SqlitePool>,
    filter: Option<db::application::ApplicationFilter>,
) -> Result<Vec<ApplicationWithJob>, DbError> {
    db::application::list(pool.inner(), filter.unwrap_or_default()).await
}

#[tauri::command]
pub async fn db_get_application(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<ApplicationDetail, DbError> {
    db::application::get_detail(pool.inner(), &id).await
}

#[tauri::command]
pub async fn db_create_application(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    input: db::application::CreateApplicationInput,) -> Result<Application, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::application::create(pool.inner(), input).await
}

#[tauri::command]
pub async fn db_update_application(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,
    patch: db::application::UpdateApplicationInput,) -> Result<Application, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::application::update(pool.inner(), &id, patch).await
}

#[tauri::command]
pub async fn db_update_application_stage(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,
    stage: String,) -> Result<Application, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::application::update_stage(pool.inner(), &id, &stage).await
}

#[tauri::command]
pub async fn db_delete_application(window: WebviewWindow,
    pool: State<'_, SqlitePool>, id: String) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::application::delete(pool.inner(), &id).await
}

// ============================================================================
// DB commands — Timeline
// ============================================================================

#[tauri::command]
pub async fn db_list_timeline(
    pool: State<'_, SqlitePool>,
    application_id: String,
) -> Result<Vec<TimelineEvent>, DbError> {
    db::timeline::list_for_application(pool.inner(), &application_id).await
}

#[tauri::command]
pub async fn db_create_timeline_event(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    input: db::timeline::CreateTimelineInput,) -> Result<TimelineEvent, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::timeline::create(pool.inner(), input).await
}

// ============================================================================
// DB commands — Interview
// ============================================================================

#[tauri::command]
pub async fn db_start_interview(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    input: db::interview::StartInterviewInput,) -> Result<InterviewSession, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::interview::start(pool.inner(), input).await
}

#[tauri::command]
pub async fn db_append_transcript(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,
    entry: TranscriptEntry,) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::interview::append_transcript(pool.inner(), &id, entry).await
}

#[tauri::command]
pub async fn db_append_response(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,
    response: String,) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::interview::append_response(pool.inner(), &id, response).await
}

#[tauri::command]
pub async fn db_end_interview(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,
    summary: Option<String>,) -> Result<InterviewSession, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::interview::end(pool.inner(), &id, summary).await
}

#[tauri::command]
pub async fn db_list_interviews(
    pool: State<'_, SqlitePool>,
    limit: Option<u32>,
) -> Result<Vec<InterviewSession>, DbError> {
    db::interview::list(pool.inner(), db::DEFAULT_USER_ID, limit.unwrap_or(50) as i64).await
}

// ============================================================================
// DB commands — Prep
// ============================================================================

#[tauri::command]
pub async fn db_create_prep_session(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    input: db::prep::CreatePrepInput,) -> Result<PrepSession, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::prep::create(pool.inner(), input).await
}

#[tauri::command]
pub async fn db_list_prep_sessions(
    pool: State<'_, SqlitePool>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<PrepSession>, DbError> {
    db::prep::list(
        pool.inner(),
        db::DEFAULT_USER_ID,
        limit.unwrap_or(50) as i64,
        offset.unwrap_or(0) as i64,
    )
    .await
}

#[tauri::command]
pub async fn db_prep_stats(pool: State<'_, SqlitePool>) -> Result<PrepStats, DbError> {
    db::prep::stats(pool.inner(), db::DEFAULT_USER_ID).await
}

// ============================================================================
// DB commands — Integration
// ============================================================================

#[tauri::command]
pub async fn db_list_integrations(pool: State<'_, SqlitePool>) -> Result<Vec<Integration>, DbError> {
    db::integration::list(pool.inner()).await
}

#[tauri::command]
pub async fn db_upsert_integration(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    input: db::integration::UpsertIntegrationInput,) -> Result<Integration, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::integration::upsert(pool.inner(), input).await
}

// ============================================================================
// DB commands — Dashboard aggregates
// ============================================================================

#[tauri::command]
pub async fn db_dashboard_stats(pool: State<'_, SqlitePool>) -> Result<DashboardStats, DbError> {
    let pool = pool.inner();
    let now = chrono::Utc::now().timestamp();
    let week_ago = now - 7 * 24 * 3600;

    let active_applications: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM application WHERE stage NOT IN ('rejected', 'offer')",
    )
    .fetch_one(pool)
    .await?;

    let interviews_this_week: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM interview_session WHERE started_at >= ?1",
    )
    .bind(week_ago)
    .fetch_one(pool)
    .await?;

    let total_apps: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM application")
        .fetch_one(pool)
        .await?;
    let responded: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM application WHERE stage IN ('phone_screen', 'interview', 'offer', 'rejected')",
    )
    .fetch_one(pool)
    .await?;
    let response_rate = if total_apps > 0 {
        (responded as f64) / (total_apps as f64) * 100.0
    } else {
        0.0
    };

    // Avg time-to-reply: time between application created and first non-applied/sourced timeline event.
    let avg_time_to_reply_secs: Option<i64> = sqlx::query_scalar(
        "SELECT CAST(AVG(reply_secs) AS INTEGER) FROM (
           SELECT MIN(t.occurred_at) - a.created_at AS reply_secs
             FROM application a
             JOIN timeline_event t ON t.application_id = a.id
            WHERE t.event_type IN ('recruiter_viewed', 'interview_scheduled', 'stage_changed')
              AND t.occurred_at > a.created_at
            GROUP BY a.id
         )",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(None);

    let counts: Vec<(String, i64)> =
        sqlx::query_as("SELECT stage, COUNT(*) FROM application GROUP BY stage")
            .fetch_all(pool)
            .await?;
    let mut pipeline_counts = PipelineCounts {
        sourced: 0,
        applied: 0,
        phone_screen: 0,
        interview: 0,
        offer: 0,
        rejected: 0,
    };
    for (stage, count) in counts {
        match stage.as_str() {
            "sourced" => pipeline_counts.sourced = count,
            "applied" => pipeline_counts.applied = count,
            "phone_screen" => pipeline_counts.phone_screen = count,
            "interview" => pipeline_counts.interview = count,
            "offer" => pipeline_counts.offer = count,
            "rejected" => pipeline_counts.rejected = count,
            _ => {}
        }
    }

    let recent_activity = db::timeline::recent_global(pool, 5).await?;

    Ok(DashboardStats {
        active_applications,
        interviews_this_week,
        response_rate,
        avg_time_to_reply_secs,
        pipeline_counts,
        recent_activity,
    })
}

// ─── DB persistence (Phase 6) ────────────────────────────────────────

#[tauri::command]
pub async fn db_load_ingest_sources(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<db::ingest::IngestSourceRow>, DbError> {
    db::ingest::load_ingest_sources(&pool).await
}

#[tauri::command]
pub async fn db_upsert_ingest_source(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    source: db::ingest::IngestSourceRow,) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::ingest::upsert_ingest_source(&pool, &source).await
}

/// Sprint 5 PR-C: bulk seed (1 transaction, 1 IPC) for first install.
/// Replaces the 30-iteration `db_upsert_ingest_source` loop in
/// `useSeedIngestSources.ts`.
#[tauri::command]
pub async fn db_save_ingest_sources(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    sources: Vec<db::ingest::IngestSourceRow>,
) -> Result<usize, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::ingest::save_ingest_sources(&pool, &sources).await
}

#[tauri::command]
pub async fn db_delete_ingest_source(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::ingest::delete_ingest_source(&pool, &id).await
}

#[tauri::command]
pub async fn db_load_ingested_jobs(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<db::ingest::IngestedJobRow>, DbError> {
    db::ingest::load_ingested_jobs(&pool).await
}

#[tauri::command]
pub async fn db_save_ingested_jobs(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    jobs: Vec<db::ingest::IngestedJobRow>,) -> Result<usize, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::ingest::save_ingested_jobs(&pool, &jobs).await
}

#[tauri::command]
pub async fn db_load_bookmarks(pool: State<'_, SqlitePool>) -> Result<Vec<String>, DbError> {
    db::ingest::load_bookmarks(&pool).await
}

#[tauri::command]
pub async fn db_set_bookmark(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    job_id: String,
    bookmarked: bool,) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::ingest::set_bookmark(&pool, &job_id, bookmarked).await
}

// ============================================================================
// DB commands — Copilot conversations (Sprint Week 1, task 1.3)
// ============================================================================
//
// Persistent Live Copilot conversations + messages. The store on the
// dashboard side calls these via `invoke('db_copilot_*', …)`; persistence
// is fail-soft (frontend logs to console on error and keeps the session
// going) so a transient DB hiccup never tanks a live interview.

#[tauri::command]
pub async fn db_copilot_create_conversation(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    input: db::copilot_conversation::CreateConversationInput,
) -> Result<db::copilot_conversation::CopilotConversation, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::copilot_conversation::create(pool.inner(), input).await
}

#[tauri::command]
pub async fn db_copilot_append_message(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    input: db::copilot_conversation::AppendMessageInput,
) -> Result<db::copilot_conversation::CopilotMessage, DbError> {
    assert_main_or_copilot_db(&window)?;
    db::copilot_conversation::append_message(pool.inner(), input).await
}

#[tauri::command]
pub async fn db_copilot_load_conversation(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<db::copilot_conversation::ConversationWithMessages, DbError> {
    db::copilot_conversation::load(pool.inner(), &id).await
}

#[tauri::command]
pub async fn db_copilot_list_conversations(
    pool: State<'_, SqlitePool>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<db::copilot_conversation::ConversationSummary>, DbError> {
    db::copilot_conversation::list(pool.inner(), limit, offset).await
}

#[tauri::command]
pub async fn db_copilot_search_conversations(
    pool: State<'_, SqlitePool>,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<db::copilot_conversation::ConversationSummary>, DbError> {
    db::copilot_conversation::search(pool.inner(), &query, limit).await
}

#[tauri::command]
pub async fn db_copilot_archive_conversation(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::copilot_conversation::archive(pool.inner(), &id).await
}

#[tauri::command]
pub async fn db_copilot_delete_conversation(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::copilot_conversation::delete(pool.inner(), &id).await
}

#[tauri::command]
pub async fn db_copilot_update_title(
    window: WebviewWindow,
    pool: State<'_, SqlitePool>,
    id: String,
    title: String,
) -> Result<(), DbError> {
    assert_main_or_copilot_db(&window)?;
    db::copilot_conversation::update_title(pool.inner(), &id, &title).await
}
