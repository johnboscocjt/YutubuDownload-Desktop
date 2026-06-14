pub mod cookies;
pub mod deps;
pub mod download;
pub mod error;
pub mod metadata;
pub mod paths;
pub mod process_util;
pub mod quality;
pub mod types;

pub use cookies::{ensure_cookie_store, refresh_cookie_store};
pub use deps::check_dependencies;
pub use download::DownloadManager;
pub use error::{Result, YtdError};
pub use metadata::{
    default_playlist_folder_label, extract_playlist_id, extract_video_id, fetch_metadata,
    fetch_playlist_entry_titles, normalize_youtube_url, probe_video_info,
};
pub use paths::YtdPaths;
pub use quality::{
    build_video_format, display_heights, fetch_available_video_heights, resolve_video_quality,
};
pub use types::*;
