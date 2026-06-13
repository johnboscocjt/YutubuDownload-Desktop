use crate::state::SharedState;
use serde::Serialize;
use tauri::State;
use ytd_core::{
    display_heights, ensure_cookie_store, fetch_playlist_entry_titles, normalize_youtube_url,
    probe_video_info, resolve_video_quality, MetadataInfo, QualityResolution,
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoProbeResult {
    pub metadata: MetadataInfo,
    pub qualities: Vec<u32>,
    pub available_heights: Vec<u32>,
    pub quality: Option<QualityResolution>,
}

#[tauri::command]
pub async fn list_qualities(state: State<'_, SharedState>, url: String) -> Result<Vec<u32>, String> {
    let url = normalize_youtube_url(&url);
    let paths = {
        let guard = state.lock().await;
        ensure_cookie_store(&guard.paths).map_err(|e| e.to_string())?;
        guard.paths.clone()
    };
    let heights = tokio::task::spawn_blocking(move || {
        ytd_core::fetch_available_video_heights(&paths, &url)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;
    Ok(display_heights(&heights))
}

#[tauri::command]
pub async fn resolve_quality(
    state: State<'_, SharedState>,
    url: String,
    height: u32,
    listed_heights: Option<Vec<u32>>,
) -> Result<QualityResolution, String> {
    let url = normalize_youtube_url(&url);
    let paths = {
        let guard = state.lock().await;
        ensure_cookie_store(&guard.paths).map_err(|e| e.to_string())?;
        guard.paths.clone()
    };
    let listed = if let Some(heights) = listed_heights {
        heights
    } else {
        let paths_for_heights = paths.clone();
        let url_for_heights = url.clone();
        tokio::task::spawn_blocking(move || {
            ytd_core::fetch_available_video_heights(&paths_for_heights, &url_for_heights)
                .unwrap_or_default()
        })
        .await
        .map_err(|e| e.to_string())?
    };
    resolve_video_quality(&paths, &url, height, &listed).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_metadata_cmd(
    state: State<'_, SharedState>,
    url: String,
    playlist: bool,
) -> Result<MetadataInfo, String> {
    let url = normalize_youtube_url(&url);
    let paths = {
        let guard = state.lock().await;
        ensure_cookie_store(&guard.paths).map_err(|e| e.to_string())?;
        guard.paths.clone()
    };
    tokio::task::spawn_blocking(move || {
        ytd_core::fetch_metadata(&paths, &url, playlist).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Fast probe: parallel lightweight yt-dlp calls (terminal-style, 15s timeout each).
#[tauri::command]
pub async fn probe_video_cmd(
    state: State<'_, SharedState>,
    url: String,
    playlist: bool,
    height: u32,
    is_mp3: bool,
) -> Result<VideoProbeResult, String> {
    let url = normalize_youtube_url(&url);
    let paths = {
        let guard = state.lock().await;
        ensure_cookie_store(&guard.paths).map_err(|e| e.to_string())?;
        guard.paths.clone()
    };

    let url_for_probe = url.clone();
    let paths_for_probe = paths.clone();
    let (metadata, heights) = tokio::task::spawn_blocking(move || {
        probe_video_info(&paths_for_probe, &url_for_probe, playlist, is_mp3 || playlist)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    let qualities = display_heights(&heights);
    let quality = if is_mp3 {
        None
    } else {
        Some(
            resolve_video_quality(&paths, &url, height, &heights).map_err(|e| e.to_string())?,
        )
    };

    Ok(VideoProbeResult {
        metadata,
        qualities,
        available_heights: heights,
        quality,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistTitleEntry {
    pub item_index: u32,
    pub title: String,
}

#[tauri::command]
pub async fn list_playlist_titles_cmd(
    state: State<'_, SharedState>,
    url: String,
) -> Result<Vec<PlaylistTitleEntry>, String> {
    let url = normalize_youtube_url(&url);
    let paths = {
        let guard = state.lock().await;
        ensure_cookie_store(&guard.paths).map_err(|e| e.to_string())?;
        guard.paths.clone()
    };
    tokio::task::spawn_blocking(move || {
        fetch_playlist_entry_titles(&paths, &url)
            .map(|entries| {
                entries
                    .into_iter()
                    .map(|(item_index, title)| PlaylistTitleEntry { item_index, title })
                    .collect()
            })
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
