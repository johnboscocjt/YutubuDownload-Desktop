use crate::deps::{common_ytdlp_args, ytdlp_program};
use crate::error::{Result, YtdError};
use crate::paths::YtdPaths;
use crate::quality::build_video_format;
use crate::types::{DownloadCompleteEvent, DownloadJobConfig, ProgressEvent, ProgressPhase};
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::{mpsc, Mutex, RwLock};
use uuid::Uuid;

pub type ProgressSender = mpsc::UnboundedSender<ProgressEvent>;
pub type CompleteSender = mpsc::UnboundedSender<DownloadCompleteEvent>;

pub struct DownloadManager {
    paths: YtdPaths,
    jobs: Arc<RwLock<HashMap<String, Arc<Mutex<Option<tokio::process::Child>>>>>>,
    cancelled: Arc<RwLock<HashSet<String>>>,
    paused: Arc<RwLock<HashSet<String>>>,
}

impl DownloadManager {
    pub fn new(paths: YtdPaths) -> Self {
        Self {
            paths,
            jobs: Arc::new(RwLock::new(HashMap::new())),
            cancelled: Arc::new(RwLock::new(HashSet::new())),
            paused: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    pub fn build_output_template(config: &DownloadJobConfig) -> String {
        if config.is_playlist {
            if config.use_playlist_folder {
                let folder = config
                    .custom_folder_name
                    .clone()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| "%(playlist_title)s [%(playlist_id)s]".into());
                return format!("{folder}/%(playlist_index)02d - %(title)s.%(ext)s");
            }
            return "%(playlist_title)s [%(playlist_id)s]/%(playlist_index)02d - %(title)s.%(ext)s"
                .into();
        }
        if let Some(ref name) = config.custom_folder_name {
            if !name.is_empty() {
                return format!("{name}/%(title)s.%(ext)s");
            }
        }
        "%(title)s.%(ext)s".into()
    }

    pub fn build_format_string(config: &DownloadJobConfig) -> String {
        if config.is_mp3 {
            // Audio-only — do not fall back to full video ("best") before extract.
            return "bestaudio".into();
        }
        build_video_format(config.requested_height.unwrap_or(720))
    }

    pub async fn start_download(
        &self,
        config: DownloadJobConfig,
        progress_tx: ProgressSender,
        complete_tx: CompleteSender,
    ) -> Result<String> {
        let job_id = Uuid::new_v4().to_string();
        let program = ytdlp_program()?;
        let output_dir = PathBuf::from(&config.output_dir);
        std::fs::create_dir_all(&output_dir)?;

        let template = Self::build_output_template(&config);
        if let Some(ref name) = config.custom_folder_name {
            if !name.is_empty() {
                let _ = std::fs::create_dir_all(output_dir.join(name));
            }
        }

        let mut args = common_ytdlp_args(&self.paths.cookie_file);
        if config.is_playlist {
            args.push("--yes-playlist".into());
        } else {
            args.push("--no-playlist".into());
        }
        if config.is_mp3 {
            args.push("-x".into());
            args.push("--audio-format".into());
            args.push("mp3".into());
            let qual = config.audio_quality.clone().unwrap_or_else(|| "0".into());
            args.push("--audio-quality".into());
            args.push(qual);
        }
        args.push("-f".into());
        args.push(Self::build_format_string(&config));
        args.push("-o".into());
        args.push(output_dir.join(&template).to_string_lossy().into_owned());
        if !config.is_mp3 {
            args.push("--merge-output-format".into());
            args.push("mp4".into());
        }
        if config.concurrent_fragments > 1 {
            args.push("--concurrent-fragments".into());
            args.push(config.concurrent_fragments.to_string());
        }
        args.extend([
            "--ignore-errors".into(),
            "--continue".into(),
            "--newline".into(),
            "--progress".into(),
            "--output-na-placeholder".into(),
            "-".into(),
            "--retries".into(),
            "3".into(),
            "--fragment-retries".into(),
            "3".into(),
            "--file-access-retries".into(),
            "3".into(),
        ]);
        if config.force_redownload {
            args.push("--force-overwrites".into());
        } else {
            args.push("--no-overwrites".into());
        }
        args.push(config.url.clone());

        let _ = progress_tx.send(ProgressEvent {
            job_id: job_id.clone(),
            percent: None,
            speed: None,
            eta: None,
            file_size: None,
            title: None,
            item_index: None,
            total_items: None,
            low_network: false,
            log_line: Some("Starting download...".into()),
            output_file: None,
            phase: ProgressPhase::Starting,
        });

        let mut cmd = Command::new(&program);
        cmd.args(&args)
            .current_dir(&output_dir)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());
        #[cfg(unix)]
        {
            unsafe {
                cmd.pre_exec(|| {
                    use nix::unistd::{setpgid, Pid};
                    let _ = setpgid(Pid::from_raw(0), Pid::from_raw(0));
                    Ok(())
                });
            }
        }
        let child = cmd
            .spawn()
            .map_err(|e| YtdError::YtdlpFailed(e.to_string()))?;

        let child_handle = Arc::new(Mutex::new(Some(child)));
        self.jobs
            .write()
            .await
            .insert(job_id.clone(), child_handle.clone());

        let job_id_clone = job_id.clone();
        let jobs = self.jobs.clone();
        let cancelled = self.cancelled.clone();
        let paused = self.paused.clone();
        let output_dir_str = config.output_dir.clone();

        tokio::spawn(async move {
            let (stdout, stderr) = {
                let mut guard = child_handle.lock().await;
                let child = match guard.as_mut() {
                    Some(c) => c,
                    None => return,
                };
                (child.stdout.take(), child.stderr.take())
            };

            let mut state = ParseState::default();
            let progress_re = Regex::new(r"^\[download\]\s+([0-9.]+)%").unwrap();
            let size_re = Regex::new(r"of\s+~?\s*([0-9.]+)([KMGT])iB").unwrap();
            let speed_re = Regex::new(r"at\s+([0-9.]+)([KMGT]?)iB/s").unwrap();
            let eta_re = Regex::new(r"ETA\s+([0-9:]+)").unwrap();
            let item_re = Regex::new(
                r"(?i)Downloading\s+(?:(?:item|video)\s+)?([0-9]+)\s+of\s+([0-9]+)",
            )
            .unwrap();

            let dest_re = Regex::new(r"^\[download\]\ +Destination:\ +(.*)$").unwrap();
            let merger_re =
                Regex::new(r#"^\[Merger\]\ Merging formats into "(.+)"$"#).unwrap();
            let title_re = Regex::new(r"^\[info\]\ +([^:]+):\ +Downloading").unwrap();

            if let Some(out) = stdout {
                let mut lines = BufReader::new(out).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    if let Some(caps) = item_re.captures(&line) {
                        state.item_index = caps.get(1).and_then(|m| m.as_str().parse().ok());
                        state.total_items = caps.get(2).and_then(|m| m.as_str().parse().ok());
                    }
                    if let Some(caps) = merger_re.captures(&line) {
                        let dest = caps[1].to_string();
                        state.last_output_file = Some(dest.clone());
                        if let Some(title) = title_from_output_path(&dest) {
                            state.title = Some(title);
                        }
                    }
                    if let Some(caps) = dest_re.captures(&line) {
                        let dest = caps[1].to_string();
                        if is_final_media_dest(&dest) {
                            state.last_output_file = Some(dest.clone());
                            if let Some(title) = title_from_output_path(&dest) {
                                state.title = Some(title);
                            }
                        }
                    }
                    if let Some(caps) = title_re.captures(&line) {
                        let candidate = caps[1].trim();
                        if !is_likely_youtube_id(candidate) {
                            state.title = Some(candidate.to_string());
                        }
                    }
                    if line.to_lowercase().contains("retry")
                        || line.to_lowercase().contains("connection reset")
                        || line.to_lowercase().contains("http error")
                    {
                        state.mark_weak_network(true);
                    }
                    if let Some(caps) = progress_re.captures(&line) {
                        let percent: f64 = caps[1].parse().unwrap_or(0.0);
                        state.last_percent = Some(percent);
                        let file_size = size_re
                            .captures(&line)
                            .map(|c| format!("{}{}iB", &c[1], &c[2]));
                        let speed = speed_re
                            .captures(&line)
                            .map(|c| format!("{}{}iB/s", &c[1], &c[2]));
                        if speed.as_deref() == Some("0B/s") && percent >= 10.0 {
                            state.mark_weak_network(false);
                        } else if speed.is_some() {
                            state.mark_network_stable();
                        }
                        let eta = eta_re
                            .captures(&line)
                            .map(|c| c[1].to_string());
                        let _ = progress_tx.send(ProgressEvent {
                            job_id: job_id_clone.clone(),
                            percent: Some(percent),
                            speed,
                            eta,
                            file_size,
                            title: state.title.clone(),
                            item_index: state.item_index,
                            total_items: state.total_items,
                            low_network: state.low_network,
                            log_line: None,
                            output_file: state.last_output_file.clone(),
                            phase: ProgressPhase::Downloading,
                        });
                    } else if line.contains("[download]") || line.contains("[info]") {
                        let _ = progress_tx.send(ProgressEvent {
                            job_id: job_id_clone.clone(),
                            percent: state.last_percent,
                            speed: None,
                            eta: None,
                            file_size: None,
                            title: state.title.clone(),
                            item_index: state.item_index,
                            total_items: state.total_items,
                            low_network: state.low_network,
                            log_line: Some(line),
                            output_file: state.last_output_file.clone(),
                            phase: ProgressPhase::Downloading,
                        });
                    }
                }
            }
            if let Some(err) = stderr {
                let mut lines = BufReader::new(err).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    if !line.trim().is_empty() {
                        state.mark_weak_network(true);
                        let _ = progress_tx.send(ProgressEvent {
                            job_id: job_id_clone.clone(),
                            percent: state.last_percent,
                            speed: None,
                            eta: None,
                            file_size: None,
                            title: state.title.clone(),
                            item_index: state.item_index,
                            total_items: state.total_items,
                            low_network: state.low_network,
                            log_line: Some(line),
                            output_file: state.last_output_file.clone(),
                            phase: ProgressPhase::Downloading,
                        });
                    }
                }
            }

            let result = {
                let mut guard = child_handle.lock().await;
                match guard.as_mut() {
                    Some(c) => Some(c.wait().await),
                    None => None,
                }
            };

            jobs.write().await.remove(&job_id_clone);
            paused.write().await.remove(&job_id_clone);

            let was_cancelled = cancelled.write().await.remove(&job_id_clone);

            if was_cancelled {
                let _ = complete_tx.send(DownloadCompleteEvent {
                    job_id: job_id_clone,
                    success: false,
                    output_dir: output_dir_str,
                    message: "Download cancelled".into(),
                    output_file: state.last_output_file.clone(),
                });
                return;
            }

            if state.last_output_file.as_ref().is_none_or(|p| !is_final_media_dest(p)) {
                if let Some(found) =
                    find_latest_media_in_dir(Path::new(&output_dir_str), state.title.as_deref())
                {
                    state.last_output_file = Some(found);
                }
            }

            match result {
                Some(Ok(status)) if status.success() => {
                    let _ = progress_tx.send(ProgressEvent {
                        job_id: job_id_clone.clone(),
                        percent: Some(100.0),
                        speed: None,
                        eta: None,
                        file_size: None,
                        title: state.title.clone(),
                        item_index: state.item_index,
                        total_items: state.total_items,
                        low_network: false,
                        log_line: None,
                        output_file: state.last_output_file.clone(),
                        phase: ProgressPhase::Complete,
                    });
                    let _ = complete_tx.send(DownloadCompleteEvent {
                        job_id: job_id_clone,
                        success: true,
                        output_dir: output_dir_str,
                        message: "Download complete".into(),
                        output_file: state.last_output_file.clone(),
                    });
                }
                Some(Ok(_)) => {
                    let _ = complete_tx.send(DownloadCompleteEvent {
                        job_id: job_id_clone,
                        success: false,
                        output_dir: output_dir_str,
                        message: "Download finished with errors".into(),
                        output_file: state.last_output_file.clone(),
                    });
                }
                Some(Err(e)) => {
                    let _ = complete_tx.send(DownloadCompleteEvent {
                        job_id: job_id_clone,
                        success: false,
                        output_dir: output_dir_str,
                        message: e.to_string(),
                        output_file: state.last_output_file.clone(),
                    });
                }
                None => {
                    let _ = complete_tx.send(DownloadCompleteEvent {
                        job_id: job_id_clone,
                        success: false,
                        output_dir: output_dir_str,
                        message: "Download cancelled".into(),
                        output_file: state.last_output_file.clone(),
                    });
                }
            }
        });

        Ok(job_id)
    }

    pub async fn cancel_download(&self, job_id: &str) -> Result<()> {
        self.cancelled
            .write()
            .await
            .insert(job_id.to_string());
        self.paused.write().await.remove(job_id);

        let jobs = self.jobs.read().await;
        let handle = jobs
            .get(job_id)
            .ok_or_else(|| YtdError::JobNotFound(job_id.into()))?;
        let mut guard = handle.lock().await;
        if let Some(child) = guard.as_mut() {
            #[cfg(unix)]
            if let Some(pid) = child.id() {
                use nix::sys::signal::{kill, Signal};
                use nix::unistd::Pid;
                let _ = kill(Pid::from_raw(-(pid as i32)), Signal::SIGKILL);
            }
            child.kill().await.map_err(YtdError::Io)?;
        }
        *guard = None;
        Ok(())
    }

    pub async fn pause_download(&self, job_id: &str) -> Result<()> {
        #[cfg(unix)]
        {
            use nix::sys::signal::{kill, Signal};
            use nix::unistd::Pid;

            let jobs = self.jobs.read().await;
            let handle = jobs
                .get(job_id)
                .ok_or_else(|| YtdError::JobNotFound(job_id.into()))?;
            let guard = handle.lock().await;
            if let Some(child) = guard.as_ref() {
                if let Some(pid) = child.id() {
                    kill(Pid::from_raw(-(pid as i32)), Signal::SIGSTOP).map_err(|e| {
                        YtdError::Other(format!("Failed to pause download: {e}"))
                    })?;
                    self.paused.write().await.insert(job_id.to_string());
                    return Ok(());
                }
            }
            Err(YtdError::Other("Download process is not running".into()))
        }
        #[cfg(not(unix))]
        {
            let _ = job_id;
            Err(YtdError::Other(
                "Pause is only supported on Linux and macOS".into(),
            ))
        }
    }

    pub async fn resume_download(&self, job_id: &str) -> Result<()> {
        #[cfg(unix)]
        {
            use nix::sys::signal::{kill, Signal};
            use nix::unistd::Pid;

            let jobs = self.jobs.read().await;
            let handle = jobs
                .get(job_id)
                .ok_or_else(|| YtdError::JobNotFound(job_id.into()))?;
            let guard = handle.lock().await;
            if let Some(child) = guard.as_ref() {
                if let Some(pid) = child.id() {
                    kill(Pid::from_raw(-(pid as i32)), Signal::SIGCONT).map_err(|e| {
                        YtdError::Other(format!("Failed to resume download: {e}"))
                    })?;
                    self.paused.write().await.remove(job_id);
                    return Ok(());
                }
            }
            Err(YtdError::Other("Download process is not running".into()))
        }
        #[cfg(not(unix))]
        {
            let _ = job_id;
            Err(YtdError::Other(
                "Resume is only supported on Linux and macOS".into(),
            ))
        }
    }

    pub async fn is_paused(&self, job_id: &str) -> bool {
        self.paused.read().await.contains(job_id)
    }
}

#[derive(Default)]
struct ParseState {
    title: Option<String>,
    item_index: Option<u32>,
    total_items: Option<u32>,
    last_percent: Option<f64>,
    last_output_file: Option<String>,
    low_network: bool,
    weak_streak: u32,
    stable_streak: u32,
}

const MEDIA_EXTENSIONS: &[&str] = &[
    "mp4", "webm", "mkv", "mov", "m4v", "mp3", "m4a", "opus", "wav", "aac", "flac",
];

fn is_ytdlp_fragment_name(name: &str) -> bool {
    if name.contains(".part") {
        return true;
    }
    let lower = name.to_lowercase();
    let bytes = lower.as_bytes();
    let mut i = 0;
    while i + 2 < bytes.len() {
        if bytes[i] == b'.' && bytes[i + 1] == b'f' {
            let mut j = i + 2;
            let mut digits = 0usize;
            while j < bytes.len() && bytes[j].is_ascii_digit() {
                digits += 1;
                j += 1;
            }
            if digits > 0 && (j == bytes.len() || bytes[j] == b'.') {
                return true;
            }
        }
        i += 1;
    }
    false
}

fn is_final_media_dest(path: &str) -> bool {
    let path_obj = Path::new(path);
    let name = path_obj
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(path);
    if is_ytdlp_fragment_name(name) {
        return false;
    }
    path_obj
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| MEDIA_EXTENSIONS.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn is_likely_youtube_id(s: &str) -> bool {
    let t = s.trim();
    t.len() == 11
        && t.chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

fn normalize_media_title(stem: &str) -> String {
    let s = stem.trim();
    if let Ok(re) = Regex::new(r"^\d{1,2}\s*-\s+") {
        if let Some(m) = re.find(s) {
            return s[m.end()..].trim().to_string();
        }
    }
    s.to_string()
}

fn title_from_output_path(path: &str) -> Option<String> {
    let name = Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())?;
    let stem = Path::new(name)
        .file_stem()
        .and_then(|s| s.to_str())?;
    let cleaned = stem
        .trim_end_matches(".mp4")
        .trim_end_matches(".mp3")
        .trim_end_matches(".webm")
        .trim_end_matches(".m4a")
        .trim_end_matches(".mkv");
    let title = normalize_media_title(cleaned);
    if title.is_empty() || is_likely_youtube_id(&title) {
        return None;
    }
    Some(title)
}

fn is_video_container_ext(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase()),
        Some(ext) if matches!(ext.as_str(), "mp4" | "webm" | "mkv" | "mov" | "m4v")
    )
}

fn find_latest_media_in_dir(dir: &Path, title_hint: Option<&str>) -> Option<String> {
    let mut best: Option<(bool, u64, std::time::SystemTime, PathBuf)> = None;
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if !is_final_media_dest(&path.to_string_lossy()) {
            continue;
        }
        if let Some(hint) = title_hint {
            let stem = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            let hint_l = hint.to_lowercase();
            if !stem.contains(&hint_l) && !hint_l.contains(&stem) {
                continue;
            }
        }
        let modified = entry.metadata().ok()?.modified().ok()?;
        let size = entry.metadata().ok()?.len();
        let video = is_video_container_ext(&path);
        let replace = best.as_ref().map_or(true, |(bv, bs, bt, _)| {
            video > *bv || (video == *bv && size > *bs) || (video == *bv && size == *bs && modified > *bt)
        });
        if replace {
            best = Some((video, size, modified, path));
        }
    }
    best.map(|(_, _, _, p)| p.to_string_lossy().into_owned())
}

#[cfg(test)]
mod fragment_tests {
    use super::is_ytdlp_fragment_name;

    #[test]
    fn detects_audio_video_fragments() {
        assert!(is_ytdlp_fragment_name("Song.f398.m4a"));
        assert!(is_ytdlp_fragment_name("Song.f140"));
        assert!(is_ytdlp_fragment_name("Song.f136.mp4.part"));
    }

    #[test]
    fn allows_merged_outputs() {
        assert!(!is_ytdlp_fragment_name("Omemma Official Music Video.mp4"));
        assert!(!is_ytdlp_fragment_name("track.mp3"));
    }
}

impl ParseState {
    fn mark_weak_network(&mut self, immediate: bool) {
        if immediate {
            self.low_network = true;
            self.weak_streak = 3;
            self.stable_streak = 0;
            return;
        }
        self.weak_streak += 1;
        self.stable_streak = 0;
        if self.weak_streak >= 3 {
            self.low_network = true;
        }
    }

    fn mark_network_stable(&mut self) {
        self.weak_streak = 0;
        if self.low_network {
            self.stable_streak += 1;
            if self.stable_streak >= 2 {
                self.low_network = false;
                self.stable_streak = 0;
            }
        }
    }
}
