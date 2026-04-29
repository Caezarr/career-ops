#![cfg(test)]

use crate::db::{
    application::{self, ApplicationFilter, CreateApplicationInput},
    cv::{self, CreateCvInput, UpdateCvInput},
    integration::{self, UpsertIntegrationInput},
    interview::{self, StartInterviewInput},
    job::{self, CreateJobInput, JobFilter, UpdateJobInput},
    models::TranscriptEntry,
    prep::{self, CreatePrepInput},
    timeline::{self, CreateTimelineInput},
    user,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

async fn test_pool() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    user::ensure_default_user(&pool).await.unwrap();
    pool
}

// ----------------------------------------------------------------------------
// User
// ----------------------------------------------------------------------------

#[tokio::test]
async fn user_get_default() {
    let pool = test_pool().await;
    let u = user::get_current(&pool).await.unwrap();
    assert_eq!(u.id, "local-default");
    assert_eq!(u.name, "You");
    assert_eq!(u.plan, "free");
}

#[tokio::test]
async fn user_update_partial() {
    let pool = test_pool().await;
    let upd = user::UpdateUserInput {
        name: Some("Gabriel".into()),
        target_role: Some("PM".into()),
        ..Default::default()
    };
    let u = user::update(&pool, upd).await.unwrap();
    assert_eq!(u.name, "Gabriel");
    assert_eq!(u.target_role.as_deref(), Some("PM"));
    assert_eq!(u.plan, "free"); // untouched
}

#[tokio::test]
async fn user_mark_onboarded() {
    let pool = test_pool().await;
    user::mark_onboarded(&pool).await.unwrap();
    let u = user::get_current(&pool).await.unwrap();
    assert!(u.onboarded_at.is_some());
}

// ----------------------------------------------------------------------------
// CV
// ----------------------------------------------------------------------------

#[tokio::test]
async fn cv_create_and_list() {
    let pool = test_pool().await;
    let cv1 = cv::create(
        &pool,
        CreateCvInput {
            name: "Consulting CV".into(),
            role_focus: Some("Consulting".into()),
            b64_pdf: None,
            parsed_text: Some("hello".into()),
            is_default: Some(true),
        },
    )
    .await
    .unwrap();
    assert_eq!(cv1.is_default, 1);

    let cvs = cv::list(&pool, "local-default").await.unwrap();
    assert_eq!(cvs.len(), 1);
    assert_eq!(cvs[0].id, cv1.id);
}

#[tokio::test]
async fn cv_set_default_unsets_others() {
    let pool = test_pool().await;
    let a = cv::create(
        &pool,
        CreateCvInput {
            name: "A".into(),
            role_focus: None,
            b64_pdf: None,
            parsed_text: None,
            is_default: Some(true),
        },
    )
    .await
    .unwrap();
    let b = cv::create(
        &pool,
        CreateCvInput {
            name: "B".into(),
            role_focus: None,
            b64_pdf: None,
            parsed_text: None,
            is_default: Some(false),
        },
    )
    .await
    .unwrap();

    cv::set_default(&pool, &b.id).await.unwrap();

    let a_after = cv::get_summary(&pool, &a.id).await.unwrap();
    let b_after = cv::get_summary(&pool, &b.id).await.unwrap();
    assert_eq!(a_after.is_default, 0);
    assert_eq!(b_after.is_default, 1);
}

#[tokio::test]
async fn cv_update_and_delete() {
    let pool = test_pool().await;
    let c = cv::create(
        &pool,
        CreateCvInput {
            name: "Old".into(),
            role_focus: None,
            b64_pdf: None,
            parsed_text: None,
            is_default: Some(false),
        },
    )
    .await
    .unwrap();
    let upd = cv::update(
        &pool,
        &c.id,
        UpdateCvInput {
            name: Some("New".into()),
            ..Default::default()
        },
    )
    .await
    .unwrap();
    assert_eq!(upd.name, "New");
    cv::update_ats_score(&pool, &c.id, 87.5).await.unwrap();
    let after = cv::get_summary(&pool, &c.id).await.unwrap();
    assert_eq!(after.ats_score, Some(87.5));

    cv::delete(&pool, &c.id).await.unwrap();
    assert!(cv::get_summary(&pool, &c.id).await.is_err());
}

// ----------------------------------------------------------------------------
// Job
// ----------------------------------------------------------------------------

#[tokio::test]
async fn job_create_filter_starred() {
    let pool = test_pool().await;
    let _ = job::create(
        &pool,
        CreateJobInput {
            company: "Stripe".into(),
            role: "PM".into(),
            source: None,
            source_url: None,
            location: Some("Paris".into()),
            salary_min: Some(80000),
            salary_max: Some(120000),
            salary_currency: None,
            jd_text: None,
            match_score: Some(89.0),
            starred: Some(true),
        },
    )
    .await
    .unwrap();
    let _ = job::create(
        &pool,
        CreateJobInput {
            company: "OpenAI".into(),
            role: "Eng".into(),
            source: None,
            source_url: None,
            location: None,
            salary_min: None,
            salary_max: None,
            salary_currency: None,
            jd_text: None,
            match_score: None,
            starred: Some(false),
        },
    )
    .await
    .unwrap();

    let starred = job::list(
        &pool,
        JobFilter {
            starred: Some(true),
            ..Default::default()
        },
    )
    .await
    .unwrap();
    assert_eq!(starred.len(), 1);
    assert_eq!(starred[0].company, "Stripe");

    let all = job::list(&pool, JobFilter::default()).await.unwrap();
    assert_eq!(all.len(), 2);
}

#[tokio::test]
async fn job_update_and_delete() {
    let pool = test_pool().await;
    let j = job::create(
        &pool,
        CreateJobInput {
            company: "X".into(),
            role: "Y".into(),
            source: None,
            source_url: None,
            location: None,
            salary_min: None,
            salary_max: None,
            salary_currency: None,
            jd_text: None,
            match_score: None,
            starred: None,
        },
    )
    .await
    .unwrap();
    let upd = job::update(
        &pool,
        &j.id,
        UpdateJobInput {
            company: Some("Z".into()),
            starred: Some(true),
            ..Default::default()
        },
    )
    .await
    .unwrap();
    assert_eq!(upd.company, "Z");
    assert_eq!(upd.starred, 1);

    job::delete(&pool, &j.id).await.unwrap();
    assert!(job::get(&pool, &j.id).await.is_err());
}

// ----------------------------------------------------------------------------
// Application + cascade
// ----------------------------------------------------------------------------

async fn seed_job(pool: &SqlitePool) -> String {
    let j = job::create(
        pool,
        CreateJobInput {
            company: "Stripe".into(),
            role: "PM".into(),
            source: None,
            source_url: None,
            location: None,
            salary_min: None,
            salary_max: None,
            salary_currency: None,
            jd_text: None,
            match_score: None,
            starred: None,
        },
    )
    .await
    .unwrap();
    j.id
}

#[tokio::test]
async fn application_create_lists_with_join() {
    let pool = test_pool().await;
    let job_id = seed_job(&pool).await;
    let _ = application::create(
        &pool,
        CreateApplicationInput {
            job_id: job_id.clone(),
            cv_id: None,
            cover_letter: None,
            stage: Some("applied".into()),
            notes: None,
            applied_at: None,
        },
    )
    .await
    .unwrap();

    let apps = application::list(&pool, ApplicationFilter::default())
        .await
        .unwrap();
    assert_eq!(apps.len(), 1);
    assert_eq!(apps[0].company, "Stripe");
    assert_eq!(apps[0].stage, "applied");
}

#[tokio::test]
async fn application_update_stage_creates_timeline() {
    let pool = test_pool().await;
    let job_id = seed_job(&pool).await;
    let app = application::create(
        &pool,
        CreateApplicationInput {
            job_id,
            cv_id: None,
            cover_letter: None,
            stage: Some("sourced".into()),
            notes: None,
            applied_at: None,
        },
    )
    .await
    .unwrap();
    application::update_stage(&pool, &app.id, "applied")
        .await
        .unwrap();
    application::update_stage(&pool, &app.id, "interview")
        .await
        .unwrap();

    let detail = application::get_detail(&pool, &app.id).await.unwrap();
    assert_eq!(detail.application.stage, "interview");
    assert!(detail.application.applied_at.is_some());
    // 1 from create() + 2 from updates
    assert_eq!(detail.timeline.len(), 3);
}

#[tokio::test]
async fn application_invalid_stage_rejected() {
    let pool = test_pool().await;
    let job_id = seed_job(&pool).await;
    let app = application::create(
        &pool,
        CreateApplicationInput {
            job_id,
            cv_id: None,
            cover_letter: None,
            stage: None,
            notes: None,
            applied_at: None,
        },
    )
    .await
    .unwrap();
    let r = application::update_stage(&pool, &app.id, "bogus").await;
    assert!(r.is_err());
}

#[tokio::test]
async fn delete_application_cascades_timeline() {
    let pool = test_pool().await;
    let job_id = seed_job(&pool).await;
    let app = application::create(
        &pool,
        CreateApplicationInput {
            job_id,
            cv_id: None,
            cover_letter: None,
            stage: None,
            notes: None,
            applied_at: None,
        },
    )
    .await
    .unwrap();
    timeline::create(
        &pool,
        CreateTimelineInput {
            application_id: app.id.clone(),
            event_type: "note".into(),
            title: "n".into(),
            description: None,
            occurred_at: None,
        },
    )
    .await
    .unwrap();

    let before: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM timeline_event WHERE application_id = ?1")
            .bind(&app.id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(before >= 2);

    application::delete(&pool, &app.id).await.unwrap();

    let after: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM timeline_event WHERE application_id = ?1")
            .bind(&app.id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(after, 0);
}

// ----------------------------------------------------------------------------
// Interview
// ----------------------------------------------------------------------------

#[tokio::test]
async fn interview_lifecycle() {
    let pool = test_pool().await;
    let s = interview::start(
        &pool,
        StartInterviewInput {
            mode: "qa".into(),
            application_id: None,
        },
    )
    .await
    .unwrap();
    assert_eq!(s.outcome.as_deref(), Some("pending"));

    interview::append_transcript(
        &pool,
        &s.id,
        TranscriptEntry {
            from: "recruiter".into(),
            name: None,
            text: "Tell me about you".into(),
            ts: 1,
        },
    )
    .await
    .unwrap();
    interview::append_response(&pool, &s.id, "first bullet".into())
        .await
        .unwrap();
    interview::append_response(&pool, &s.id, "second bullet".into())
        .await
        .unwrap();

    let ended = interview::end(&pool, &s.id, Some("good".into()))
        .await
        .unwrap();
    assert!(ended.ended_at.is_some());
    assert_eq!(ended.summary.as_deref(), Some("good"));

    let resp_json = ended.ai_responses.unwrap();
    let arr: Vec<String> = serde_json::from_str(&resp_json).unwrap();
    assert_eq!(arr.len(), 2);
}

#[tokio::test]
async fn interview_invalid_mode() {
    let pool = test_pool().await;
    let r = interview::start(
        &pool,
        StartInterviewInput {
            mode: "x".into(),
            application_id: None,
        },
    )
    .await;
    assert!(r.is_err());
}

// ----------------------------------------------------------------------------
// Prep
// ----------------------------------------------------------------------------

#[tokio::test]
async fn prep_create_and_stats() {
    let pool = test_pool().await;
    for i in 0..3 {
        prep::create(
            &pool,
            CreatePrepInput {
                question: format!("Q{i}"),
                category: Some("behavioral".into()),
                difficulty: Some("easy".into()),
                framework: Some("STAR".into()),
                target_company: None,
                target_role: None,
                user_answer_text: Some("ans".into()),
                user_answer_audio_path: None,
                score_structure: Some(8.0),
                score_conciseness: Some(7.0),
                score_evidence: Some(6.0),
                score_memorability: Some(7.0),
                ai_feedback: None,
                ai_improved_answer: None,
                recorded_at: None,
            },
        )
        .await
        .unwrap();
    }
    let s = prep::stats(&pool, "local-default").await.unwrap();
    assert_eq!(s.total, 3);
    assert!(s.avg_score.unwrap() > 6.0);
    assert!(!s.by_category.is_empty());
}

// ----------------------------------------------------------------------------
// Integration
// ----------------------------------------------------------------------------

#[tokio::test]
async fn integration_upsert() {
    let pool = test_pool().await;
    let i1 = integration::upsert(
        &pool,
        UpsertIntegrationInput {
            id: "anthropic".into(),
            status: "connected".into(),
            model: Some("claude-sonnet-4-5".into()),
            config: None,
        },
    )
    .await
    .unwrap();
    assert_eq!(i1.status, "connected");
    assert!(i1.connected_at.is_some());

    let i2 = integration::upsert(
        &pool,
        UpsertIntegrationInput {
            id: "anthropic".into(),
            status: "disconnected".into(),
            model: None,
            config: None,
        },
    )
    .await
    .unwrap();
    assert_eq!(i2.status, "disconnected");

    let list = integration::list(&pool).await.unwrap();
    assert_eq!(list.len(), 1);
}
