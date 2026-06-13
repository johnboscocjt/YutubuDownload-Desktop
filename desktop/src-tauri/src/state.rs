use std::sync::Arc;
use tokio::sync::Mutex;
use ytd_core::download::{CompleteSender, DownloadManager, ProgressSender};
use ytd_core::YtdPaths;

pub struct AppState {
    pub paths: YtdPaths,
    pub downloads: Arc<DownloadManager>,
    pub progress_tx: ProgressSender,
    pub complete_tx: CompleteSender,
}

pub type SharedState = Arc<Mutex<AppState>>;
