mod commands;
mod dbus_bootstrap;
mod linux_media_env;
mod media_stream;
mod native_player;
mod state;

use state::{AppState, SharedState};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use ytd_core::download::DownloadManager;
use ytd_core::YtdPaths;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    linux_media_env::configure();
    dbus_bootstrap::bootstrap();

    let paths = YtdPaths::desktop();
    let _ = paths.ensure_dirs();
    let downloads = Arc::new(DownloadManager::new(paths.clone()));

    let (progress_tx, mut progress_rx) = mpsc::unbounded_channel();
    let (complete_tx, mut complete_rx) = mpsc::unbounded_channel();

    let app_state: SharedState = std::sync::Arc::new(tokio::sync::Mutex::new(AppState {
        paths,
        downloads,
        progress_tx,
        complete_tx,
    }));

    let builder = tauri::Builder::default();
    let builder = media_stream::register_protocol(builder);

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(app_state.clone())
        .setup(move |app| {
            let handle: AppHandle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                while let Some(event) = progress_rx.recv().await {
                    let _ = handle.emit("download-progress", event);
                }
            });
            let handle2 = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                while let Some(event) = complete_rx.recv().await {
                    let _ = handle2.emit("download-complete", event);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_dependencies_cmd,
            commands::refresh_cookies,
            commands::default_download_dir,
            commands::list_qualities,
            commands::resolve_quality,
            commands::fetch_metadata_cmd,
            commands::probe_video_cmd,
            commands::list_playlist_titles_cmd,
            commands::start_download,
            commands::cancel_download,
            commands::pause_download,
            commands::resume_download,
            commands::open_output_folder,
            commands::open_file_location,
            commands::list_documentation,
            commands::read_documentation,
            commands::resolve_playable_files,
            commands::scan_partial_playlists,
            commands::stage_media_for_playback,
            commands::probe_playback_prep,
            commands::open_media_file,
            commands::open_playlist_in_system_player,
            native_player::has_native_player_cmd,
            native_player::start_native_player,
            native_player::native_player_load,
            native_player::native_player_alive,
            native_player::update_native_player_bounds,
            native_player::stop_native_player_cmd,
            native_player::native_player_control,
            native_player::native_player_paused,
            native_player::native_player_progress,
            native_player::native_player_volume,
            native_player::native_player_set_volume,
            native_player::native_player_seek,
            native_player::pointer_in_app_window,
            native_player::set_cinema_pointer_watch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
