mod ai;
mod audio;
mod db;
mod ingest;
mod latex;
mod llm;
mod pdf;
mod session;
mod state;
mod stt;

use serde::Deserialize;
use sqlx::SqlitePool;
use state::AppState;
use std::sync::Arc;
use tauri::{Emitter, Manager, State};
use tokio::sync::Mutex;
use tracing::info;

use db::models::{
    Application, ApplicationDetail, ApplicationWithJob, CvSummary, DashboardStats, Integration,
    InterviewSession, Job, PipelineCounts, PrepSession, PrepStats, TimelineEvent, TranscriptEntry,
    User,
};
use db::DbError;

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CaptureConfig {
    pub anthropic_key: String,
    #[serde(default)]
    pub openai_key: String,
    pub cv: String,
    pub jd: String,
    pub persona: String,
    #[serde(default = "default_duration")]
    pub duration_secs: u32,
    /// User's mic. Empty = system default input.
    #[serde(default)]
    pub audio_device: String,
    /// Loopback (recruiter audio). Empty = don't capture loopback.
    /// Typically "BlackHole 2ch" on Mac after BlackHole + Multi-Output Device setup.
    #[serde(default)]
    pub loopback_device: String,
    /// Claude model to use. Empty = use default in llm.rs.
    #[serde(default)]
    pub model: String,
    /// AssemblyAI API key for real-time streaming STT.
    #[serde(default)]
    pub assemblyai_key: String,
    /// Session mode: "qa" (default) or "pitch" (structured self-presentation).
    #[serde(default = "default_app_mode")]
    pub app_mode: String,
}

fn default_app_mode() -> String {
    "qa".to_string()
}

fn default_duration() -> u32 {
    6
}

/// List Claude models available on this Anthropic API key.
#[tauri::command]
async fn list_anthropic_models(key: String) -> Result<Vec<String>, String> {
    if key.is_empty() {
        return Err("API key is empty".into());
    }
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get("https://api.anthropic.com/v1/models")
        .header("x-api-key", &key)
        .header("anthropic-version", "2023-06-01")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let models: Vec<String> = body["data"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|m| m["id"].as_str().map(|s| s.to_string()))
        .collect();

    if models.is_empty() {
        return Err(format!("No models returned: {body}"));
    }
    Ok(models)
}

#[tauri::command]
async fn start_capture(
    app: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    config: CaptureConfig,
) -> Result<(), String> {
    let state = state.inner().clone();

    // Spawn the pipeline in the background so the command returns fast
    tokio::spawn(async move {
        if let Err(e) = run_pipeline(app.clone(), state, config).await {
            let _ = app.emit("error", e.to_string());
            let _ = app.emit("status", "error");
        }
    });

    Ok(())
}

#[tauri::command]
async fn stop_capture(state: State<'_, Arc<Mutex<AppState>>>) -> Result<(), String> {
    let mut s = state.lock().await;
    if let Some(stop) = s.stop_signal.take() {
        let _ = stop.send(());
    }
    Ok(())
}

/// Decode a base64-encoded PDF and extract its text content.
/// Used by the Config panel to load a CV PDF.
#[tauri::command]
async fn parse_cv_pdf(b64: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || pdf::extract_text_from_base64(&b64))
        .await
        .map_err(|e| format!("task join error: {e}"))?
        .map_err(|e| e.to_string())
}

/// List the names of all available audio input devices.
#[tauri::command]
async fn list_audio_devices() -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(audio::list_input_devices)
        .await
        .map_err(|e| format!("task join error: {e}"))
}

/// Start a continuous session: listen indefinitely, auto-fire bullets when the
/// recruiter pauses after speaking. Replaces the manual hotkey for live interviews.
#[tauri::command]
async fn start_session(
    app: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    config: CaptureConfig,
) -> Result<(), String> {
    let (stop_tx, stop_rx) = tokio::sync::oneshot::channel();
    {
        let mut s = state.lock().await;
        // If a session is already running, stop it first.
        if let Some(existing) = s.stop_signal.take() {
            let _ = existing.send(());
        }
        s.stop_signal = Some(stop_tx);
    }

    session::run_session(app, config, stop_rx)
        .await
        .map_err(|e| format!("{e:#}"))
}

#[tauri::command]
async fn stop_session(state: State<'_, Arc<Mutex<AppState>>>) -> Result<(), String> {
    let mut s = state.lock().await;
    if let Some(stop) = s.stop_signal.take() {
        let _ = stop.send(());
    }
    Ok(())
}

/// Show the floating Copilot overlay window. Called from the Dashboard sidebar.
#[tauri::command]
async fn show_copilot_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("copilot") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Generate a structured 3-min pitch (Pyramid + STAR + MECE) on demand.
/// Streams `"answer-token"` events; returns immediately (generation runs in background).
#[tauri::command]
async fn generate_pitch(
    app: tauri::AppHandle,
    config: CaptureConfig,
    instructions: String,
) -> Result<(), String> {
    tokio::spawn(async move {
        app.emit("status", "thinking").ok();
        match llm::generate_pitch_streaming(&config, &instructions, &[], &app).await {
            Ok(_)  => { app.emit("status", "ready").ok(); }
            Err(e) => {
                app.emit("error", format!("{e:#}")).ok();
                app.emit("status", "error").ok();
            }
        }
    });
    Ok(())
}

// ============================================================================
// DB commands — User
// ============================================================================

#[tauri::command]
async fn db_get_user(pool: State<'_, SqlitePool>) -> Result<User, DbError> {
    db::user::get_current(pool.inner()).await
}

#[tauri::command]
async fn db_update_user(
    pool: State<'_, SqlitePool>,
    input: db::user::UpdateUserInput,
) -> Result<User, DbError> {
    db::user::update(pool.inner(), input).await
}

#[tauri::command]
async fn db_mark_onboarded(pool: State<'_, SqlitePool>) -> Result<(), DbError> {
    db::user::mark_onboarded(pool.inner()).await
}

// ============================================================================
// DB commands — CV
// ============================================================================

#[tauri::command]
async fn db_list_cvs(pool: State<'_, SqlitePool>) -> Result<Vec<CvSummary>, DbError> {
    db::cv::list(pool.inner(), db::DEFAULT_USER_ID).await
}

#[tauri::command]
async fn db_get_cv(pool: State<'_, SqlitePool>, id: String) -> Result<CvSummary, DbError> {
    db::cv::get_summary(pool.inner(), &id).await
}

#[tauri::command]
async fn db_create_cv(
    pool: State<'_, SqlitePool>,
    input: db::cv::CreateCvInput,
) -> Result<CvSummary, DbError> {
    db::cv::create(pool.inner(), input).await
}

#[tauri::command]
async fn db_update_cv(
    pool: State<'_, SqlitePool>,
    id: String,
    patch: db::cv::UpdateCvInput,
) -> Result<CvSummary, DbError> {
    db::cv::update(pool.inner(), &id, patch).await
}

#[tauri::command]
async fn db_set_default_cv(pool: State<'_, SqlitePool>, id: String) -> Result<(), DbError> {
    db::cv::set_default(pool.inner(), &id).await
}

#[tauri::command]
async fn db_delete_cv(pool: State<'_, SqlitePool>, id: String) -> Result<(), DbError> {
    db::cv::delete(pool.inner(), &id).await
}

// ============================================================================
// DB commands — Job
// ============================================================================

#[tauri::command]
async fn db_list_jobs(
    pool: State<'_, SqlitePool>,
    filter: Option<db::job::JobFilter>,
) -> Result<Vec<Job>, DbError> {
    db::job::list(pool.inner(), filter.unwrap_or_default()).await
}

#[tauri::command]
async fn db_get_job(pool: State<'_, SqlitePool>, id: String) -> Result<Job, DbError> {
    db::job::get(pool.inner(), &id).await
}

#[tauri::command]
async fn db_create_job(
    pool: State<'_, SqlitePool>,
    input: db::job::CreateJobInput,
) -> Result<Job, DbError> {
    db::job::create(pool.inner(), input).await
}

#[tauri::command]
async fn db_update_job(
    pool: State<'_, SqlitePool>,
    id: String,
    patch: db::job::UpdateJobInput,
) -> Result<Job, DbError> {
    db::job::update(pool.inner(), &id, patch).await
}

#[tauri::command]
async fn db_delete_job(pool: State<'_, SqlitePool>, id: String) -> Result<(), DbError> {
    db::job::delete(pool.inner(), &id).await
}

// ============================================================================
// DB commands — Application
// ============================================================================

#[tauri::command]
async fn db_list_applications(
    pool: State<'_, SqlitePool>,
    filter: Option<db::application::ApplicationFilter>,
) -> Result<Vec<ApplicationWithJob>, DbError> {
    db::application::list(pool.inner(), filter.unwrap_or_default()).await
}

#[tauri::command]
async fn db_get_application(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<ApplicationDetail, DbError> {
    db::application::get_detail(pool.inner(), &id).await
}

#[tauri::command]
async fn db_create_application(
    pool: State<'_, SqlitePool>,
    input: db::application::CreateApplicationInput,
) -> Result<Application, DbError> {
    db::application::create(pool.inner(), input).await
}

#[tauri::command]
async fn db_update_application(
    pool: State<'_, SqlitePool>,
    id: String,
    patch: db::application::UpdateApplicationInput,
) -> Result<Application, DbError> {
    db::application::update(pool.inner(), &id, patch).await
}

#[tauri::command]
async fn db_update_application_stage(
    pool: State<'_, SqlitePool>,
    id: String,
    stage: String,
) -> Result<Application, DbError> {
    db::application::update_stage(pool.inner(), &id, &stage).await
}

#[tauri::command]
async fn db_delete_application(pool: State<'_, SqlitePool>, id: String) -> Result<(), DbError> {
    db::application::delete(pool.inner(), &id).await
}

// ============================================================================
// DB commands — Timeline
// ============================================================================

#[tauri::command]
async fn db_list_timeline(
    pool: State<'_, SqlitePool>,
    application_id: String,
) -> Result<Vec<TimelineEvent>, DbError> {
    db::timeline::list_for_application(pool.inner(), &application_id).await
}

#[tauri::command]
async fn db_create_timeline_event(
    pool: State<'_, SqlitePool>,
    input: db::timeline::CreateTimelineInput,
) -> Result<TimelineEvent, DbError> {
    db::timeline::create(pool.inner(), input).await
}

// ============================================================================
// DB commands — Interview
// ============================================================================

#[tauri::command]
async fn db_start_interview(
    pool: State<'_, SqlitePool>,
    input: db::interview::StartInterviewInput,
) -> Result<InterviewSession, DbError> {
    db::interview::start(pool.inner(), input).await
}

#[tauri::command]
async fn db_append_transcript(
    pool: State<'_, SqlitePool>,
    id: String,
    entry: TranscriptEntry,
) -> Result<(), DbError> {
    db::interview::append_transcript(pool.inner(), &id, entry).await
}

#[tauri::command]
async fn db_append_response(
    pool: State<'_, SqlitePool>,
    id: String,
    response: String,
) -> Result<(), DbError> {
    db::interview::append_response(pool.inner(), &id, response).await
}

#[tauri::command]
async fn db_end_interview(
    pool: State<'_, SqlitePool>,
    id: String,
    summary: Option<String>,
) -> Result<InterviewSession, DbError> {
    db::interview::end(pool.inner(), &id, summary).await
}

#[tauri::command]
async fn db_list_interviews(
    pool: State<'_, SqlitePool>,
    limit: Option<u32>,
) -> Result<Vec<InterviewSession>, DbError> {
    db::interview::list(pool.inner(), db::DEFAULT_USER_ID, limit.unwrap_or(50) as i64).await
}

// ============================================================================
// DB commands — Prep
// ============================================================================

#[tauri::command]
async fn db_create_prep_session(
    pool: State<'_, SqlitePool>,
    input: db::prep::CreatePrepInput,
) -> Result<PrepSession, DbError> {
    db::prep::create(pool.inner(), input).await
}

#[tauri::command]
async fn db_list_prep_sessions(
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
async fn db_prep_stats(pool: State<'_, SqlitePool>) -> Result<PrepStats, DbError> {
    db::prep::stats(pool.inner(), db::DEFAULT_USER_ID).await
}

// ============================================================================
// DB commands — Integration
// ============================================================================

#[tauri::command]
async fn db_list_integrations(pool: State<'_, SqlitePool>) -> Result<Vec<Integration>, DbError> {
    db::integration::list(pool.inner()).await
}

#[tauri::command]
async fn db_upsert_integration(
    pool: State<'_, SqlitePool>,
    input: db::integration::UpsertIntegrationInput,
) -> Result<Integration, DbError> {
    db::integration::upsert(pool.inner(), input).await
}

// ============================================================================
// DB commands — Dashboard aggregates
// ============================================================================

#[tauri::command]
async fn db_dashboard_stats(pool: State<'_, SqlitePool>) -> Result<DashboardStats, DbError> {
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

// ── AI: ATS analysis command ─────────────────────────────────────────────────

/// Analyze a CV against an optional job description using Claude.
///
/// The CV content can be supplied two ways:
///   - `cv_text`  — raw parsed text passed directly from the frontend
///                  (preferred for store-driven variants that aren't yet
///                  persisted in SQLite)
///   - `cv_id`    — fallback: load from the SQLite DB (used when the CV
///                  was uploaded via `db_create_cv`)
///
/// At least one of the two MUST be provided. If both are given, `cv_text`
/// wins. When `cv_id` is also passed alongside `cv_text` we still cache
/// the resulting ats_score on the row so the variants table updates.
#[tauri::command]
async fn analyze_cv_ats(
    pool: State<'_, SqlitePool>,
    cv_id: Option<String>,
    cv_text: Option<String>,
    jd_text: Option<String>,
    anthropic_key: String,
    model: Option<String>,
) -> Result<ai::AtsAnalysis, ai::AiError> {
    let pool = pool.inner();

    // 1. Resolve CV text from one of the two sources.
    let parsed_text = match (cv_text.as_deref(), cv_id.as_deref()) {
        (Some(t), _) if !t.trim().is_empty() => t.to_string(),
        (_, Some(id)) => {
            let cv = db::cv::get_with_blob(pool, id)
                .await
                .map_err(|e| ai::AiError::InvalidResponse(format!("CV not found: {e}")))?;
            cv.parsed_text.unwrap_or_default()
        }
        _ => return Err(ai::AiError::CvEmpty),
    };

    if parsed_text.trim().is_empty() {
        return Err(ai::AiError::CvEmpty);
    }

    // 2. Call Claude with the score_cv tool.
    let cfg = ai::AiConfig::new(anthropic_key, model);
    let user_msg = ai::prompts::ats::build_user_message(&parsed_text, jd_text.as_deref());

    let analysis = ai::anthropic::ask_structured::<ai::AtsAnalysis>(
        &cfg,
        ai::prompts::ats::ATS_SYSTEM,
        &user_msg,
        "score_cv",
        "Score the CV against the job description and return a structured analysis.",
        ai::prompts::ats::tool_schema(),
        2000,
    )
    .await?;

    // 3. Cache the ats_score on the CV row when the CV exists in DB
    //    (best-effort — silent on failure).
    if let Some(id) = cv_id.as_deref() {
        let _ = db::cv::update_ats_score(pool, id, analysis.ats_score as f64).await;
    }

    Ok(analysis)
}

// ── AI: Application "next steps" generator ───────────────────────────────────

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateNextStepsInput {
    pub company: String,
    pub role: String,
    pub stage: String,
    pub jd_text: Option<String>,
    pub cv_text: Option<String>,
    pub anthropic_key: String,
    pub model: Option<String>,
}

/// Generate 3-5 concrete next-step actions for a job application.
///
/// Tailored to the application's current stage; pulls in the JD + CV
/// when available so steps reference real specifics. Surfaces only
/// `Vec<String>` to the frontend — the slice action persists them on
/// the application record.
#[tauri::command]
async fn generate_application_next_steps(
    input: GenerateNextStepsInput,
) -> Result<Vec<String>, ai::AiError> {
    if input.anthropic_key.trim().is_empty() {
        return Err(ai::AiError::KeyMissing);
    }

    let cfg = ai::AiConfig::new(input.anthropic_key, input.model);
    let user_msg = ai::prompts::next_steps::build_user_message(
        &input.company,
        &input.role,
        &input.stage,
        input.jd_text.as_deref(),
        input.cv_text.as_deref(),
    );

    let resp: ai::prompts::next_steps::NextStepsResponse =
        ai::anthropic::ask_structured(
            &cfg,
            ai::prompts::next_steps::NEXT_STEPS_SYSTEM,
            &user_msg,
            "next_steps",
            "Produce 3-5 concrete actionable next steps for the application.",
            ai::prompts::next_steps::tool_schema(),
            800,
        )
        .await?;

    Ok(resp.steps)
}

// ── AI: CV optimization (LaTeX → PDF) ─────────────────────────────────────────

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizedCvResult {
    /// Path to the generated PDF on disk.
    pub pdf_path: String,
    /// Path to the generated LaTeX source (kept so the user can re-edit / re-compile).
    pub tex_path: String,
    /// Compiler that produced the PDF (e.g. 'pdflatex (MacTeX)').
    pub compiler: &'static str,
    /// LaTeX source string (also returned so the frontend can preview / store).
    pub tex_source: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateOptimizedCvInput {
    pub cv_text: String,
    pub jd_text: String,
    /// JSON-stringified ATS analysis (suggestions, missing keywords, etc.).
    /// We pass it as a string so the command signature stays simple.
    pub analysis_json: String,
    pub profile_block: String,
    /// Optional free-form notes the user added on this run only ('shorten the
    /// summary', 'drop the leadership section', etc.). Appended to the prompt
    /// under <refinement_instructions/>.
    pub refinement_instructions: Option<String>,
    pub anthropic_key: String,
    pub model: Option<String>,
}

/// End-to-end pipeline: prompt Claude → get .tex → compile → return PDF path.
#[tauri::command]
async fn generate_optimized_cv(
    app: tauri::AppHandle,
    input: GenerateOptimizedCvInput,
) -> Result<OptimizedCvResult, String> {
    use crate::latex::pick_compiler;

    if input.cv_text.trim().is_empty() {
        return Err("CV text is empty — re-upload the source CV first".into());
    }
    if input.anthropic_key.trim().is_empty() {
        return Err("Anthropic API key is empty".into());
    }

    // 1. Ask Claude for the full .tex source.
    let cfg = ai::AiConfig::new(input.anthropic_key, input.model);
    let user_msg = ai::prompts::optimize::build_user_message(
        &input.cv_text,
        &input.jd_text,
        &input.analysis_json,
        &input.profile_block,
        input.refinement_instructions.as_deref(),
    );
    let mut tex_source = ai::anthropic::ask_completion(
        &cfg,
        ai::prompts::optimize::OPTIMIZE_SYSTEM,
        &user_msg,
        // 8000 tokens covers a single-page CV with margin to spare.
        8000,
    )
    .await
    .map_err(|e| format!("AI generation failed: {e}"))?;

    // Defensive: strip any accidental markdown fences. The system prompt forbids
    // them but we belt-and-suspenders the output to keep pdflatex happy.
    tex_source = strip_markdown_fences(&tex_source).to_string();

    // 2. Resolve the best LaTeX compiler available on the host.
    let compiler = pick_compiler()
        .await
        .map_err(|e| format!("LaTeX compiler unavailable: {e}"))?;

    // 3. Compile to PDF inside the per-app data dir.
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))?;
    let optims_dir = app_data.join("optimizations");

    let pdf_path = compiler
        .compile(&tex_source, &optims_dir)
        .await
        .map_err(|e| format!("LaTeX compilation failed:\n{e}"))?;

    // 4. Save the .tex alongside so the user can re-edit later.
    let tex_path = pdf_path.with_extension("tex");
    tokio::fs::write(&tex_path, tex_source.as_bytes())
        .await
        .map_err(|e| format!("save .tex: {e}"))?;

    Ok(OptimizedCvResult {
        pdf_path: pdf_path.to_string_lossy().into_owned(),
        tex_path: tex_path.to_string_lossy().into_owned(),
        compiler: compiler.name(),
        tex_source,
    })
}

/// Surface which LaTeX backends are available on this host so the UI can
/// show a 'MacTeX missing — install it' banner when nothing's found.
#[tauri::command]
async fn detect_latex_compilers() -> Result<latex::CompilerAvailability, String> {
    Ok(latex::detect_compilers().await)
}

/// Strip leading / trailing markdown code fences if Claude slipped any in.
fn strip_markdown_fences(s: &str) -> &str {
    let trimmed = s.trim();
    if let Some(rest) = trimmed.strip_prefix("```latex") {
        return rest.trim_start().trim_end_matches("```").trim();
    }
    if let Some(rest) = trimmed.strip_prefix("```tex") {
        return rest.trim_start().trim_end_matches("```").trim();
    }
    if let Some(rest) = trimmed.strip_prefix("```") {
        return rest.trim_start().trim_end_matches("```").trim();
    }
    trimmed
}

async fn run_pipeline(
    app: tauri::AppHandle,
    state: Arc<Mutex<AppState>>,
    config: CaptureConfig,
) -> anyhow::Result<()> {
    let (stop_tx, stop_rx) = tokio::sync::oneshot::channel();
    {
        let mut s = state.lock().await;
        s.stop_signal = Some(stop_tx);
    }

    // Stage 1: dual capture (mic = user, loopback = recruiter)
    app.emit("status", "recording")?;
    info!(
        "dual capture for {}s — mic='{}', loopback='{}'",
        config.duration_secs,
        if config.audio_device.is_empty() { "(default)" } else { &config.audio_device },
        if config.loopback_device.is_empty() { "(off)" } else { &config.loopback_device },
    );
    let captures = audio::record_dual_wav(
        config.duration_secs,
        config.audio_device.clone(),
        config.loopback_device.clone(),
        stop_rx,
    )
    .await?;
    info!("captured {} channels", captures.len());

    // Stage 2: transcribe each channel in parallel via Whisper
    app.emit("status", "thinking")?;
    let mut transcribe_futs = Vec::new();
    for cap in &captures {
        let key = config.openai_key.clone();
        let wav = cap.wav.clone();
        let label = cap.channel.label();
        transcribe_futs.push(async move {
            let res = stt::transcribe(&wav, &key).await;
            (label, res)
        });
    }
    let results = futures_util::future::join_all(transcribe_futs).await;

    // Stage 2b: build a labeled transcript ("recruiter: ..." / "user: ...")
    // The recruiter channel is what the LLM actually answers, but we keep both for context.
    let mut labeled = String::new();
    let mut recruiter_text = String::new();
    let mut user_text = String::new();
    for (label, res) in results {
        match res {
            Ok(t) => {
                let trimmed = t.trim();
                if trimmed.is_empty() {
                    continue;
                }
                labeled.push_str(label);
                labeled.push_str(": ");
                labeled.push_str(trimmed);
                labeled.push('\n');
                if label == "recruiter" {
                    recruiter_text = trimmed.to_string();
                } else {
                    user_text = trimmed.to_string();
                }
            }
            Err(e) => {
                tracing::warn!("[{}] transcription failed: {e:?}", label);
            }
        }
    }
    if labeled.is_empty() {
        labeled = "[no transcription — generating generic bullets]".to_string();
    }
    app.emit("transcript", &labeled)?;

    // The "question" passed to the LLM: prefer recruiter audio when present,
    // otherwise fall back to whatever we got from the mic.
    let question = if !recruiter_text.is_empty() {
        recruiter_text
    } else if !user_text.is_empty() {
        user_text
    } else {
        labeled.clone()
    };

    // Stage 3: stream bullets via Claude — each Bullet fires a "bullet" event
    // as its JSON object closes, so the UI shows bullets incrementally.
    // Single-shot mode has no multi-turn history, so we pass an empty slice.
    llm::generate_answer_streaming(&config, &question, &[], &app).await?;
    app.emit("status", "ready")?;

    {
        let mut s = state.lock().await;
        s.stop_signal = None;
    }

    Ok(())
}

// ─── Job ingestion (Greenhouse / Lever / Ashby / YC) ─────────────────────────

/// Run a single job-board ingestion. Frontend dispatches one of these per
/// configured `IngestSource`. Returns the ingested jobs in the frontend
/// `Job` shape (camelCase, with `source` populated for dedup).
#[tauri::command]
async fn ingest_run_source(
    provider: String,
    identifier: String,
) -> Result<ingest::IngestRunResult, String> {
    let provider_enum = ingest::IngestProvider::from_str(&provider)
        .ok_or_else(|| format!("Unknown provider: {}", provider))?;

    ingest::run_source(provider_enum, &identifier)
        .await
        .map_err(|e| e.to_string())
}

/// Sync the supplied list of sources in parallel. The "Sync all jobs"
/// button in the frontend hits this — passing the user's enabled
/// sources from the Zustand store. Empty list ⇒ falls back to the
/// curated `BUILTIN_SOURCES` constant (used during first-launch boot).
///
/// Optional `keyword` narrows the response to jobs matching every
/// whitespace-separated token as a word-prefix across role + company
/// + location. Empty / null = no filter.
#[tauri::command]
async fn ingest_run_all(
    sources: Vec<ingest::SourceSpec>,
    keyword: Option<String>,
) -> Result<ingest::IngestRunAllResult, String> {
    Ok(ingest::run_all(sources, keyword).await)
}

/// Returns the curated source list shipped with the app. Frontend
/// uses this to seed Settings → Job Sources on first launch.
#[tauri::command]
fn ingest_get_builtin_sources() -> Vec<ingest::SourceSpec> {
    ingest::get_builtin_sources_list()
}

// ─── Job Teaser SSO (Phase JT) ───────────────────────────────────────

/// Open Job Teaser's central sign-in page in a dedicated WebViewWindow.
/// The window's initialization_script polls `document.cookie` after the
/// user completes their school's SSO; once the JT session token is
/// detected, JS calls `jobteaser_auth_complete` (below) with the
/// captured cookies + the user's career-center profile.
#[tauri::command]
async fn jobteaser_auth_open(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    // If a window labelled `jobteaser-auth` already exists (user clicked
    // twice), focus it instead of opening a duplicate.
    if let Some(existing) = app.get_webview_window("jobteaser-auth") {
        let _ = existing.set_focus();
        return Ok(());
    }

    let bridge_script = include_str!("./ingest/jobteaser/auth_bridge.js");

    let url: tauri::Url = "https://www.jobteaser.com/fr/users/sign_in"
        .parse()
        .map_err(|e: <tauri::Url as std::str::FromStr>::Err| e.to_string())?;

    WebviewWindowBuilder::new(&app, "jobteaser-auth", WebviewUrl::External(url))
    .title("Sign in to Job Teaser")
    .inner_size(900.0, 720.0)
    .min_inner_size(640.0, 520.0)
    .resizable(true)
    .focused(true)
    .initialization_script(bridge_script)
    .build()
    .map_err(|e| format!("open auth window: {}", e))?;

    Ok(())
}

/// Called by the JS bridge once cookies + profile are captured.
/// Persists to Keychain, returns the profile to the frontend so it
/// can insert the IngestSource row + close the auth window.
#[tauri::command]
async fn jobteaser_auth_complete(
    app: tauri::AppHandle,
    profile: ingest::jobteaser::AuthProfile,
    cookies: ingest::jobteaser::AuthCookies,
) -> Result<ingest::jobteaser::AuthProfile, String> {
    let stored = ingest::jobteaser::handle_auth_complete(profile, cookies)
        .map_err(|e| e.to_string())?;

    // Notify the main dashboard window so it can insert the IngestSource
    // row + refresh Settings. Failure to emit is non-fatal — the next
    // page reload will pick up the keychain-backed session anyway.
    let payload = serde_json::json!({ "profile": &stored });
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.emit("jobteaser-auth-complete", payload);
    }

    // Auth roundtrip done — close the auth window if it's still open.
    if let Some(win) = app.get_webview_window("jobteaser-auth") {
        let _ = win.close();
    }

    Ok(stored)
}

/// Cheap check: does the user have stored session cookies for this
/// career_center_slug? Used by Settings to render "Re-authenticate"
/// instead of "Add school" when an entry already exists but a fetch
/// returned 401.
#[tauri::command]
fn jobteaser_has_session(career_center_slug: String) -> bool {
    ingest::jobteaser::auth::has_stored_session(&career_center_slug)
}

// ─── DB persistence (Phase 6) ────────────────────────────────────────

#[tauri::command]
async fn db_load_ingest_sources(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<db::ingest::IngestSourceRow>, DbError> {
    db::ingest::load_ingest_sources(&pool).await
}

#[tauri::command]
async fn db_upsert_ingest_source(
    pool: State<'_, SqlitePool>,
    source: db::ingest::IngestSourceRow,
) -> Result<(), DbError> {
    db::ingest::upsert_ingest_source(&pool, &source).await
}

#[tauri::command]
async fn db_delete_ingest_source(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), DbError> {
    db::ingest::delete_ingest_source(&pool, &id).await
}

#[tauri::command]
async fn db_load_ingested_jobs(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<db::ingest::IngestedJobRow>, DbError> {
    db::ingest::load_ingested_jobs(&pool).await
}

#[tauri::command]
async fn db_save_ingested_jobs(
    pool: State<'_, SqlitePool>,
    jobs: Vec<db::ingest::IngestedJobRow>,
) -> Result<usize, DbError> {
    db::ingest::save_ingested_jobs(&pool, &jobs).await
}

#[tauri::command]
async fn db_load_bookmarks(pool: State<'_, SqlitePool>) -> Result<Vec<String>, DbError> {
    db::ingest::load_bookmarks(&pool).await
}

#[tauri::command]
async fn db_set_bookmark(
    pool: State<'_, SqlitePool>,
    job_id: String,
    bookmarked: bool,
) -> Result<(), DbError> {
    db::ingest::set_bookmark(&pool, &job_id, bookmarked).await
}

/// Cheap probe to verify a Greenhouse / Lever / Ashby identifier resolves
/// before saving it as an `IngestSource` in Settings. Fetches the live
/// endpoint but only returns counts, no payload.
#[tauri::command]
async fn ingest_health_check(
    provider: String,
    identifier: String,
) -> Result<u64, String> {
    let provider_enum = ingest::IngestProvider::from_str(&provider)
        .ok_or_else(|| format!("Unknown provider: {}", provider))?;

    let result = ingest::run_source(provider_enum, &identifier)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.jobs.len() as u64)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,career_ops_lib=debug".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Autostart plugin — exposes is_enabled / enable / disable to the
        // frontend so the Settings → Notifications "Start on login" toggle
        // can install/remove a real macOS LaunchAgent. We register with
        // None for args; the Settings UI is the only place that flips it.
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let state = Arc::new(Mutex::new(AppState::default()));
            app.manage(state);

            // Initialize the SQLite pool (synchronously at startup so commands have access).
            let app_handle = app.handle().clone();
            let pool = tauri::async_runtime::block_on(async move {
                db::init_pool(&app_handle).await
            })
            .expect("DB init failed");
            app.manage(pool);

            // Best-effort stealth on macOS: window-level capture exclusion.
            // Only the Copilot overlay needs to hide from screen capture; the
            // main Dashboard window is a normal product window.
            // On macOS 15+ this is ignored by ScreenCaptureKit but we still set it.
            #[cfg(target_os = "macos")]
            {
                if let Some(window) = app.get_webview_window("copilot") {
                    let _ = window.set_content_protected(true);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Existing Copilot commands
            start_capture,
            stop_capture,
            parse_cv_pdf,
            list_audio_devices,
            list_anthropic_models,
            start_session,
            stop_session,
            generate_pitch,
            show_copilot_window,
            // DB: user
            db_get_user,
            db_update_user,
            db_mark_onboarded,
            // DB: cv
            db_list_cvs,
            db_get_cv,
            db_create_cv,
            db_update_cv,
            db_set_default_cv,
            db_delete_cv,
            // DB: job
            db_list_jobs,
            db_get_job,
            db_create_job,
            db_update_job,
            db_delete_job,
            // DB: application
            db_list_applications,
            db_get_application,
            db_create_application,
            db_update_application,
            db_update_application_stage,
            db_delete_application,
            // DB: timeline
            db_list_timeline,
            db_create_timeline_event,
            // DB: interview
            db_start_interview,
            db_append_transcript,
            db_append_response,
            db_end_interview,
            db_list_interviews,
            // DB: prep
            db_create_prep_session,
            db_list_prep_sessions,
            db_prep_stats,
            // DB: integration
            db_list_integrations,
            db_upsert_integration,
            // DB: dashboard aggregate
            db_dashboard_stats,
            // AI: ATS analysis
            analyze_cv_ats,
            // AI: CV optimization (LaTeX → PDF)
            generate_optimized_cv,
            detect_latex_compilers,
            // AI: Application next steps
            generate_application_next_steps,
            // Job ingestion (Greenhouse / Lever / Ashby / YC)
            ingest_run_source,
            ingest_run_all,
            ingest_health_check,
            ingest_get_builtin_sources,
            // Job Teaser SSO auth flow
            jobteaser_auth_open,
            jobteaser_auth_complete,
            jobteaser_has_session,
            // DB: ingest persistence (Phase 6)
            db_load_ingest_sources,
            db_upsert_ingest_source,
            db_delete_ingest_source,
            db_load_ingested_jobs,
            db_save_ingested_jobs,
            db_load_bookmarks,
            db_set_bookmark
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
