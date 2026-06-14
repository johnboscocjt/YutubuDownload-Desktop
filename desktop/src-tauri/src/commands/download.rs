use crate::state::SharedState;
use tauri::State;
use ytd_core::{
    ensure_cookie_store, fetch_available_video_heights, normalize_youtube_url, resolve_video_quality,
    DownloadJobConfig,
};

#[tauri::command]
pub async fn start_download(
    state: State<'_, SharedState>,
    mut config: DownloadJobConfig,
) -> Result<String, String> {
    config.url = normalize_youtube_url(&config.url);

    let (downloads, progress_tx, complete_tx) = {
        let guard = state.lock().await;
        ensure_cookie_store(&guard.paths).map_err(|e| e.to_string())?;
        (
            guard.downloads.clone(),
            guard.progress_tx.clone(),
            guard.complete_tx.clone(),
        )
    };

    if !config.is_mp3 && !config.skip_quality_check {
        if let Some(h) = config.requested_height {
            let paths = {
                let guard = state.lock().await;
                guard.paths.clone()
            };
            let url = config.url.clone();
            let paths_for_heights = paths.clone();
            let listed = tokio::task::spawn_blocking(move || {
                fetch_available_video_heights(&paths_for_heights, &url).unwrap_or_default()
            })
            .await
            .map_err(|e| e.to_string())?;
            if let Ok(resolved) = resolve_video_quality(&paths, &config.url, h, &listed) {
                config.video_format = Some(resolved.format_string.clone());
                if let Some(chosen) = resolved.chosen_height {
                    config.requested_height = Some(chosen);
                }
            }
        }
    }

    downloads
        .start_download(config, progress_tx, complete_tx)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cancel_download(state: State<'_, SharedState>, job_id: String) -> Result<(), String> {
    let downloads = {
        let guard = state.lock().await;
        guard.downloads.clone()
    };
    downloads
        .cancel_download(&job_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pause_download(state: State<'_, SharedState>, job_id: String) -> Result<(), String> {
    let downloads = {
        let guard = state.lock().await;
        guard.downloads.clone()
    };
    downloads
        .pause_download(&job_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn resume_download(state: State<'_, SharedState>, job_id: String) -> Result<(), String> {
    let downloads = {
        let guard = state.lock().await;
        guard.downloads.clone()
    };
    downloads
        .resume_download(&job_id)
        .await
        .map_err(|e| e.to_string())
}
