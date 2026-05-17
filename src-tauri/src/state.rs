use tokio::sync::{mpsc, oneshot};

#[derive(Default)]
pub struct AppState {
    pub stop_signal: Option<oneshot::Sender<()>>,
    /// T5 (2026-05-16): unbounded sender into the live session's force-
    /// answer channel. The Cmd+Shift+A global shortcut + the
    /// "Answer now" / "Recap" / "Push back" / "Follow-up" quick-action
    /// chips all funnel through `force_answer` (lib.rs) which sends on
    /// this channel; `session.rs::run_session` selects! over it
    /// alongside the 4s debouncer timer.
    ///
    /// Set when a session starts, cleared when it stops. Empty option
    /// means "no live session, force_answer is a no-op".
    pub force_answer_tx: Option<mpsc::UnboundedSender<String>>,
}
