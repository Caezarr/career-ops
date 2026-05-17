-- Sprint Week 1 task 1.3 — persistent Live Copilot conversations.
--
-- Why a NEW table rather than reusing `interview_session`:
--   - `interview_session` is the prep-mode artifact (Q-bank rehearsal,
--     pitch practice) with its own outcome / scoring fields.
--   - Live Copilot conversations are a different beast: real-time
--     interview transcripts streamed through SCK + AAI, with mixed
--     speaker roles (interviewer / candidate / copilot) and arbitrary
--     length. Splitting tables keeps queries on each side dead-simple.
--
-- Schema mirrors Pluely's conversation model
-- (`pluely/src-tauri/src/db/main.rs`) — proven pattern, with two
-- additions:
--   - `role` includes `'interviewer'` (Pluely only knows user/assistant)
--   - `attachments` JSON column reserved for Sprint Week 3 (paste image
--     / drop PDF / drop DOCX). Nullable for now; the column shape lands
--     here so we don't have to migrate again when the feature ships.

CREATE TABLE IF NOT EXISTS copilot_conversation (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    -- Candidate-editable label. Defaults to `Session {date}` on create
    -- and is replaced on first interviewer utterance with the opening
    -- words (truncated to ~60 chars).
    title       TEXT NOT NULL,
    -- Optional structured context — populated when the candidate
    -- selected a target role / company before the session. Surfaces
    -- in the past-interviews list for filter & search.
    company     TEXT,
    role        TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    -- 0 = active in dashboard, 1 = hidden from main list (still
    -- searchable). Soft-delete instead of hard-delete so the candidate
    -- can recover an interview they archived by accident.
    archived    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_copilot_conversation_updated
    ON copilot_conversation(updated_at DESC)
    WHERE archived = 0;

CREATE TABLE IF NOT EXISTS copilot_message (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES copilot_conversation(id) ON DELETE CASCADE,
    -- 'interviewer'  — the other side, transcribed from system audio
    -- 'candidate'    — the user's own voice (mic), via the user-side
    --                  AAI stream
    -- 'copilot'      — Claude's answer (scaffold or full prose)
    -- 'system'       — protocol / context notes (CV injection markers,
    --                  intent prefixes from quick actions, etc.)
    role            TEXT NOT NULL CHECK (role IN ('interviewer','candidate','copilot','system')),
    content         TEXT NOT NULL,
    timestamp       INTEGER NOT NULL,
    -- JSON array reserved for Week 3 image/file paste. Each entry shape
    -- TBD when that feature lands (likely `{kind, mime, bytes_b64?, uri?, ocr_text?}`).
    attachments     TEXT,
    -- JSON object: free-form per-message context — `response_style`
    -- for copilot answers, `intent` / `quick_action` for forced fires,
    -- `duration_ms` for interviewer utterances etc.
    metadata        TEXT
);

CREATE INDEX IF NOT EXISTS idx_copilot_message_conv_ts
    ON copilot_message(conversation_id, timestamp);
