-- Users (single-row for local-first; future: multi-user via sync)
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  persona TEXT,                  -- 'finance' | 'tech-ai' | 'consulting' | NULL
  timezone TEXT,
  language TEXT NOT NULL DEFAULT 'en-US',
  location TEXT,
  target_role TEXT,
  target_company TEXT,
  onboarded_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- CV variants (PDF stored as blob locally)
CREATE TABLE cv (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_focus TEXT,
  pdf_blob BLOB,
  parsed_text TEXT,
  ats_score REAL,                -- 0-100, NULL if not analyzed
  is_default INTEGER NOT NULL DEFAULT 0,    -- bool: 0/1
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_cv_user ON cv(user_id);
CREATE INDEX idx_cv_default ON cv(user_id, is_default);

-- Jobs (sourced or manually entered)
CREATE TABLE job (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'manual',     -- 'manual' | 'wttj' | 'linkedin' | 'greenhouse' | 'lever'
  source_url TEXT,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT NOT NULL DEFAULT 'EUR',
  jd_text TEXT,
  match_score REAL,              -- 0-100, NULL if not analyzed
  starred INTEGER NOT NULL DEFAULT 0,   -- bool
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_job_company ON job(company);
CREATE INDEX idx_job_starred ON job(starred);

-- Applications: pipeline kanban
CREATE TABLE application (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job(id) ON DELETE CASCADE,
  cv_id TEXT REFERENCES cv(id) ON DELETE SET NULL,
  cover_letter TEXT,
  stage TEXT NOT NULL,           -- 'sourced'|'applied'|'phone_screen'|'interview'|'offer'|'rejected'
  notes TEXT,
  ai_next_steps TEXT,            -- JSON array of strings; refreshed by AI; cached
  ai_next_steps_at INTEGER,      -- when computed (for staleness)
  applied_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_application_stage ON application(stage);
CREATE INDEX idx_application_job ON application(job_id);

-- Timeline events tied to an application
CREATE TABLE timeline_event (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES application(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,      -- 'applied'|'recruiter_viewed'|'interview_scheduled'|'reminder'|'note'|'stage_changed'
  title TEXT NOT NULL,
  description TEXT,
  occurred_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_timeline_app ON timeline_event(application_id, occurred_at);

-- Prep sessions: each practice/recording
CREATE TABLE prep_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category TEXT,                 -- 'behavioral'|'technical'|'case'|'culture'|NULL
  difficulty TEXT,               -- 'easy'|'medium'|'hard'|NULL
  framework TEXT,                -- 'STAR'|'MECE'|'Pyramid'|'Motivation'|NULL
  target_company TEXT,
  target_role TEXT,
  user_answer_text TEXT,
  user_answer_audio_path TEXT,   -- relative path within app data dir
  score_structure REAL,          -- 1-10
  score_conciseness REAL,
  score_evidence REAL,
  score_memorability REAL,
  ai_feedback TEXT,              -- JSON array of bullets
  ai_improved_answer TEXT,
  recorded_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_prep_user_time ON prep_session(user_id, recorded_at);

-- Interview sessions: each Copilot live session
CREATE TABLE interview_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  application_id TEXT REFERENCES application(id) ON DELETE SET NULL,
  mode TEXT NOT NULL,            -- 'qa' | 'pitch'
  transcript TEXT,               -- JSON array of {from, name, text, ts}
  ai_responses TEXT,             -- JSON array of suggested answers
  summary TEXT,                  -- AI-generated post-session summary
  outcome TEXT,                  -- 'pending'|'passed'|'failed'|'no_decision'
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_interview_user ON interview_session(user_id, started_at);
CREATE INDEX idx_interview_app ON interview_session(application_id);

-- Integrations status (API keys are in keychain, this just tracks which are connected)
CREATE TABLE integration (
  id TEXT PRIMARY KEY,           -- 'anthropic' | 'openai' | 'assemblyai'
  status TEXT NOT NULL,          -- 'connected' | 'disconnected'
  model TEXT,                    -- e.g., 'claude-3-5-sonnet-20241022'
  config TEXT,                   -- JSON for provider-specific extras
  connected_at INTEGER,
  last_validated_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Schema version for future-proofing
CREATE TABLE _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO _meta (key, value) VALUES ('schema_version', '1');
