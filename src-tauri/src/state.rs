use tokio::sync::oneshot;

#[derive(Default)]
pub struct AppState {
    pub stop_signal: Option<oneshot::Sender<()>>,
}
