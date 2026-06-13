use crate::state::SharedState;
use std::path::PathBuf;
use tauri::State;
use tauri_plugin_opener::OpenerExt;
use ytd_core::{check_dependencies, refresh_cookie_store, DependencyStatus};

#[tauri::command]
pub async fn check_dependencies_cmd(state: State<'_, SharedState>) -> Result<DependencyStatus, String> {
    let guard = state.lock().await;
    Ok(check_dependencies(&guard.paths))
}

#[tauri::command]
pub async fn refresh_cookies(state: State<'_, SharedState>, force: bool) -> Result<String, String> {
    let paths = {
        let guard = state.lock().await;
        guard.paths.clone()
    };
    tokio::task::spawn_blocking(move || refresh_cookie_store(&paths, force))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn default_download_dir(state: State<'_, SharedState>) -> Result<String, String> {
    let guard = state.lock().await;
    Ok(guard
        .paths
        .default_download_dir()
        .to_string_lossy()
        .into_owned())
}

#[tauri::command]
pub async fn open_output_folder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_file_location(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    let dir = if p.is_file() {
        p.parent().map(|parent| parent.to_path_buf())
    } else if p.is_dir() {
        Some(p)
    } else {
        p.parent().map(|parent| parent.to_path_buf())
    };
    let dir = dir.ok_or_else(|| format!("No folder for: {path}"))?;
    app.opener()
        .open_path(dir.to_string_lossy().into_owned(), None::<&str>)
        .map_err(|e| e.to_string())
}
