use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ============================================================================
// User
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub plan: String,
    pub persona: Option<String>,
    pub timezone: Option<String>,
    pub language: String,
    pub location: Option<String>,
    pub target_role: Option<String>,
    pub target_company: Option<String>,
    pub onboarded_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

// ============================================================================
// CV
// ============================================================================

/// Full CV including the PDF blob. Use sparingly.
#[allow(dead_code)] // used by get_with_blob for download/preview flows
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Cv {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub role_focus: Option<String>,
    #[serde(skip_serializing)] // never send blob over the wire by default
    pub pdf_blob: Option<Vec<u8>>,
    pub parsed_text: Option<String>,
    pub ats_score: Option<f64>,
    pub is_default: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Lightweight summary for list views (no blob).
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CvSummary {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub role_focus: Option<String>,
    pub parsed_text: Option<String>,
    pub ats_score: Option<f64>,
    pub is_default: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

// ============================================================================
// Job
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    pub source: String,
    pub source_url: Option<String>,
    pub company: String,
    pub role: String,
    pub location: Option<String>,
    pub salary_min: Option<i64>,
    pub salary_max: Option<i64>,
    pub salary_currency: String,
    pub jd_text: Option<String>,
    pub match_score: Option<f64>,
    pub starred: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

// ============================================================================
// Application
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Application {
    pub id: String,
    pub job_id: String,
    pub cv_id: Option<String>,
    pub cover_letter: Option<String>,
    pub stage: String,
    pub notes: Option<String>,
    pub ai_next_steps: Option<String>, // JSON string
    pub ai_next_steps_at: Option<i64>,
    pub applied_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Joined view: application + its job for list rendering.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationWithJob {
    pub id: String,
    pub job_id: String,
    pub cv_id: Option<String>,
    pub cover_letter: Option<String>,
    pub stage: String,
    pub notes: Option<String>,
    pub ai_next_steps: Option<String>,
    pub ai_next_steps_at: Option<i64>,
    pub applied_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
    // From job
    pub company: String,
    pub role: String,
    pub location: Option<String>,
    pub match_score: Option<f64>,
}

/// Detail view: application + job + timeline events.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationDetail {
    pub application: Application,
    pub job: Job,
    pub timeline: Vec<TimelineEvent>,
}

// ============================================================================
// Timeline event
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEvent {
    pub id: String,
    pub application_id: String,
    pub event_type: String,
    pub title: String,
    pub description: Option<String>,
    pub occurred_at: i64,
    pub created_at: i64,
}

// ============================================================================
// Prep session
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PrepSession {
    pub id: String,
    pub user_id: String,
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
    pub ai_feedback: Option<String>, // JSON string
    pub ai_improved_answer: Option<String>,
    pub recorded_at: i64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepStats {
    pub total: i64,
    pub avg_score: Option<f64>,
    pub by_category: Vec<CategoryCount>,
    pub by_week: Vec<WeekCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CategoryCount {
    pub category: Option<String>,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct WeekCount {
    pub week: String,
    pub count: i64,
}

// ============================================================================
// Interview session
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct InterviewSession {
    pub id: String,
    pub user_id: String,
    pub application_id: Option<String>,
    pub mode: String,
    pub transcript: Option<String>,    // JSON string
    pub ai_responses: Option<String>,  // JSON string
    pub summary: Option<String>,
    pub outcome: Option<String>,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptEntry {
    pub from: String, // 'recruiter' | 'user' | 'system'
    pub name: Option<String>,
    pub text: String,
    pub ts: i64,
}

// ============================================================================
// Integration
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Integration {
    pub id: String,
    pub status: String,
    pub model: Option<String>,
    pub config: Option<String>, // JSON
    pub connected_at: Option<i64>,
    pub last_validated_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

// ============================================================================
// Dashboard aggregates
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineCounts {
    pub sourced: i64,
    pub applied: i64,
    pub phone_screen: i64,
    pub interview: i64,
    pub offer: i64,
    pub rejected: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub active_applications: i64,
    pub interviews_this_week: i64,
    pub response_rate: f64,
    pub avg_time_to_reply_secs: Option<i64>,
    pub pipeline_counts: PipelineCounts,
    pub recent_activity: Vec<TimelineEvent>,
}
