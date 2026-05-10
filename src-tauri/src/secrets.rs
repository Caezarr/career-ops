//! Keychain-backed API key storage. Sprint 1 PR-B.
//!
//! Until this module landed, API keys lived in the webview's
//! `localStorage` — auditable to anything the webview JS could touch
//! (extensions, devtools, injected scripts via a future XSS, etc.).
//! This module moves them to the macOS Keychain via the `keyring`
//! crate (the same path JT auth cookies already use — see
//! `src-tauri/src/ingest/jobteaser/auth.rs:67`).
//!
//! Service name: `career-os` (matches the JT module so a single
//! Keychain prompt covers the whole app on first read).
//! Account names: `secret.<slot>` — namespaced under `secret.` so
//! these never collide with the JT cookie slots
//! (`career-os.jobteaser.<slug>.session`).
//!
//! Threat model: anything in this module is the trust boundary
//! between the webview and the host Keychain. Every Tauri command
//! that exposes these helpers MUST be window-label gated (audit
//! CRITICAL #1, see `lib.rs::assert_main_or_copilot`).

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Allow-list of secret slots. Anything outside this enum is
/// rejected at the IPC boundary — prevents a compromised webview
/// from poking at arbitrary Keychain accounts.
///
/// The trailing `Key` / `Jwt` suffixes are part of the public
/// wire-format slot names (`anthropic_key`, `auth_jwt`, etc.) and
/// renaming the variants would break the IPC contract.
#[allow(clippy::enum_variant_names)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SecretSlot {
    AnthropicKey,
    OpenaiKey,
    AssemblyaiKey,
    DeepgramKey,
    /// JWT issued by the Career OS auth Worker after a successful
    /// magic-link sign-in. ~30-day TTL. Cleared on sign-out.
    AuthJwt,
}

impl SecretSlot {
    /// Account portion of the Keychain (service, account) tuple.
    /// Stable strings — once shipped, don't change them or users
    /// lose their saved keys.
    pub fn account(self) -> &'static str {
        match self {
            SecretSlot::AnthropicKey => "secret.anthropic_key",
            SecretSlot::OpenaiKey => "secret.openai_key",
            SecretSlot::AssemblyaiKey => "secret.assemblyai_key",
            SecretSlot::DeepgramKey => "secret.deepgram_key",
            SecretSlot::AuthJwt => "secret.auth_jwt",
        }
    }
}

#[derive(Debug, Error)]
pub enum SecretError {
    #[error("keychain entry: {0}")]
    Entry(String),
    #[error("keychain read: {0}")]
    Read(String),
    #[error("keychain write: {0}")]
    Write(String),
    #[error("keychain delete: {0}")]
    Delete(String),
}

const SERVICE: &str = "career-os";

fn entry(slot: SecretSlot) -> Result<keyring::Entry, SecretError> {
    keyring::Entry::new(SERVICE, slot.account()).map_err(|e| SecretError::Entry(e.to_string()))
}

/// Set (or replace) the value for a secret slot.
/// Empty string is treated as a delete to keep the IPC surface
/// small — the frontend "clear key" button just sends "".
pub fn set(slot: SecretSlot, value: &str) -> Result<(), SecretError> {
    if value.is_empty() {
        return delete(slot);
    }
    let e = entry(slot)?;
    e.set_password(value)
        .map_err(|e| SecretError::Write(e.to_string()))
}

/// Read the current value, or `None` if the slot is unset.
/// `keyring::Error::NoEntry` is the expected "not yet stored"
/// case — every other error bubbles up so we don't silently
/// hide Keychain access denials.
pub fn get(slot: SecretSlot) -> Result<Option<String>, SecretError> {
    let e = entry(slot)?;
    match e.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(SecretError::Read(err.to_string())),
    }
}

/// Remove the slot. Idempotent: missing entry = success.
pub fn delete(slot: SecretSlot) -> Result<(), SecretError> {
    let e = entry(slot)?;
    match e.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(SecretError::Delete(err.to_string())),
    }
}
