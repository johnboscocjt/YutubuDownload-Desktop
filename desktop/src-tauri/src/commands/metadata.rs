use crate::state::SharedState;
use serde::Serialize;
use tauri::State;
use ytd_core::{
    display_heights, ensure_cookie_store, fetch_available_video_heights, fetch_metadata,
    resolve_video_quality, MetadataInfo, QualityResolution,
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoProbeResult {
    pub metadata: MetadataInfo,
    pub qualities: Vec<u32>,
    pub quality: Option<QualityResolution>,
}

#[tauri::command]
pub async fn list_qualities(state: State<'_, SharedState>, url: String) -> Result<Vec<u32>, String> {
    let guard = state.lock().await;
    ensure_cookie_store(&guard.paths).map_err(|e| e.to_string())?;
    let heights = fetch_available_video_heights(&guard.paths, &url).map_err(|e| e.to_string())?;
    Ok(display_heights(&heights))
}

#[tauri::command]
pub async fn resolve_quality(
    state: State<'_, SharedState>,
    url: String,
    height: u32,
) -> Result<QualityResolution, String> {
    let guard = state.lock().await;
    ensure_cookie_store(&guard.paths).map_err(|e| e.to_string())?;
    let listed = fetch_available_video_heights(&guard.paths, &url).unwrap_or_default();
    resolve_video_quality(&guard.paths, &url, height, &listed).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_metadata_cmd(
    state: State<'_, SharedState>,
    url: String,
    playlist: bool,
) -> Result<MetadataInfo, String> {
    let guard = state.lock().await;
    ensure_cookie_store(&guard.paths).map_err(|e| e.to_string())?;
    fetch_metadata(&guard.paths, &url, playlist).map_err(|e| e.to_string())
}

/// One round-trip: metadata + quality list + resolution (single heights fetch).
#[tauri::command]
pub async fn probe_video_cmd(
    state: State<'_, SharedState>,
    url: String,
    playlist: bool,
    height: u32,
    is_mp3: bool,
) -> Result<VideoProbeResult, String> {
    let guard = state.lock().await;
    ensure_cookie_store(&guard.paths).map_err(|e| e.to_string())?;
    let metadata = fetch_metadata(&guard.paths, &url, playlist).map_err(|e| e.to_string())?;
    let heights = fetch_available_video_heights(&guard.paths, &url).unwrap_or_default();
    let qualities = display_heights(&heights);
    let quality = if is_mp3 {
        None
    } else {
        Some(
            resolve_video_quality(&guard.paths, &url, height, &heights)
                .map_err(|e| e.to_string())?,
        )
    };
    Ok(VideoProbeResult {
        metadata,
        qualities,
        quality,
    })
}
