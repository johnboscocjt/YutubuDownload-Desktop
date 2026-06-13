use serde::{Deserialize, Serialize};

pub const STANDARD_HEIGHTS: [u32; 6] = [2160, 1440, 1080, 720, 480, 360];

pub const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyStatus {
    pub ytdlp: ToolStatus,
    pub ffmpeg: ToolStatus,
    pub js_runtime: ToolStatus,
    pub python_cookies: ToolStatus,
    pub all_ready: bool,
    pub install_hints: InstallHints,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolStatus {
    pub found: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallHints {
    pub ytdlp: String,
    pub ffmpeg: String,
    pub js_runtime: String,
    pub python_cookies: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityResolution {
    pub requested_height: u32,
    pub chosen_height: Option<u32>,
    pub confirmed: bool,
    pub message: String,
    pub format_string: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataInfo {
    pub video_id: Option<String>,
    pub playlist_id: Option<String>,
    pub title: Option<String>,
    pub duration: Option<String>,
    pub thumbnail_url: Option<String>,
    pub is_playlist: bool,
    pub playlist_title: Option<String>,
    pub entry_count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadJobConfig {
    pub url: String,
    pub is_playlist: bool,
    pub is_mp3: bool,
    pub audio_quality: Option<String>,
    pub requested_height: Option<u32>,
    pub output_dir: String,
    pub use_playlist_folder: bool,
    pub custom_folder_name: Option<String>,
    pub concurrent_fragments: u32,
    #[serde(default)]
    pub skip_quality_check: bool,
    #[serde(default)]
    pub force_redownload: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub job_id: String,
    pub percent: Option<f64>,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub file_size: Option<String>,
    pub title: Option<String>,
    pub item_index: Option<u32>,
    pub total_items: Option<u32>,
    pub low_network: bool,
    pub log_line: Option<String>,
    pub output_file: Option<String>,
    pub phase: ProgressPhase,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProgressPhase {
    Starting,
    Downloading,
    Complete,
    Error,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadCompleteEvent {
    pub job_id: String,
    pub success: bool,
    pub output_dir: String,
    pub message: String,
    pub output_file: Option<String>,
}
