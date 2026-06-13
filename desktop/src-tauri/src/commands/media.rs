use serde::{Deserialize, Serialize};
use tauri_plugin_opener::OpenerExt;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::UNIX_EPOCH;

const MEDIA_EXT: &[&str] = &[
    "mp4", "webm", "mkv", "mov", "m4v", "mp3", "m4a", "opus", "wav", "aac", "flac",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayableHint {
    pub title: String,
    pub item_index: Option<u32>,
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayableFile {
    pub path: String,
    pub title: String,
    pub item_index: Option<u32>,
    pub is_audio: bool,
}

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

fn is_media(path: &Path) -> bool {
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    if is_ytdlp_fragment_name(name) {
        return false;
    }
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| MEDIA_EXT.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn normalize(s: &str) -> String {
    clean_display_title(s)
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn clean_display_title(title: &str) -> String {
    let mut s = title.to_string();
    let lower = s.to_lowercase();
    let bytes = lower.as_bytes();
    let mut cut: Option<usize> = None;
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
                cut = Some(i);
                break;
            }
        }
        i += 1;
    }
    if let Some(pos) = cut {
        s.truncate(pos);
    }
    s.trim().to_string()
}

fn title_from_path(path: &Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(clean_display_title)
        .filter(|s| !s.is_empty())
        .unwrap_or_default()
}

fn playable_title(path: &Path, hint: &PlayableHint) -> String {
    let from_path = title_from_path(path);
    if !from_path.is_empty() {
        return from_path;
    }
    clean_display_title(&hint.title)
}

fn media_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .filter(|e| MEDIA_EXT.contains(&e.as_str()))
}

fn collect_media_files(dir: &Path, out: &mut Vec<PathBuf>, depth: u8) {
    if depth > 4 {
        return;
    }
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_media_files(&path, out, depth + 1);
        } else if is_media(&path) {
            out.push(path);
        }
    }
}

fn is_video_container(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase()),
        Some(ext) if matches!(ext.as_str(), "mp4" | "webm" | "mkv" | "mov" | "m4v")
    )
}

fn has_video_stream(path: &Path) -> bool {
    let ffprobe = match ffprobe_program() {
        Some(p) => p,
        None => return is_video_container(path),
    };
    let output = Command::new(&ffprobe)
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=codec_type",
            "-of",
            "csv=p=0",
        ])
        .arg(path)
        .output()
        .ok();
    match output {
        Some(o) if o.status.success() => {
            String::from_utf8_lossy(&o.stdout).trim() == "video"
        }
        _ => is_video_container(path),
    }
}

fn file_size(path: &Path) -> u64 {
    path.metadata().map(|m| m.len()).unwrap_or(0)
}

fn score_match(file: &Path, hint: &PlayableHint) -> i32 {
    let stem = file
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    let fname = file
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    let mut score = 0i32;

    if let Some(idx) = hint.item_index {
        let idx_padded = format!("{:02}", idx);
        if fname.starts_with(&format!("{idx_padded} -"))
            || fname.starts_with(&format!("{idx} -"))
            || fname.starts_with(&format!("{idx_padded}."))
        {
            score += 100;
        }
    }

    if let Some(ref saved) = hint.file_path {
        if file.to_string_lossy() == *saved {
            return 1000;
        }
    }

    let n_stem = normalize(stem);
    let n_title = normalize(&hint.title);
    if n_stem.is_empty() || n_title.is_empty() {
        return score;
    }
    if n_stem == n_title {
        score += 80;
    } else if n_stem.contains(&n_title) || n_title.contains(&n_stem) {
        score += 50;
    } else {
        let words: Vec<&str> = n_title.split_whitespace().collect();
        let hits = words.iter().filter(|w| w.len() > 2 && n_stem.contains(*w)).count();
        score += (hits as i32) * 8;
    }
    score
}

fn hint_prefers_audio(hint: &PlayableHint, candidates: &[PathBuf]) -> bool {
    if let Some(ref saved) = hint.file_path {
        let path = Path::new(saved);
        if is_audio_path(path) {
            return true;
        }
        if is_video_container(path) {
            return false;
        }
    }

    let Some(idx) = hint.item_index else {
        return false;
    };
    let idx_padded = format!("{idx:02}");
    let idx_plain = idx.to_string();
    let index_matches: Vec<&PathBuf> = candidates
        .iter()
        .filter(|p| {
            let Some(fname) = p.file_name().and_then(|n| n.to_str()) else {
                return false;
            };
            fname.starts_with(&format!("{idx_padded} -"))
                || fname.starts_with(&format!("{idx_plain} -"))
        })
        .collect();
    !index_matches.is_empty() && index_matches.iter().all(|p| is_audio_path(p))
}

fn path_has_video_stream(path: &Path) -> bool {
    if is_audio_path(path) {
        return false;
    }
    has_video_stream(path)
}

fn pick_best(candidates: &[PathBuf], hint: &PlayableHint) -> Option<PathBuf> {
    let mut cleaned = hint.clone();
    cleaned.title = clean_display_title(&hint.title);
    let prefer_audio = hint_prefers_audio(&cleaned, candidates);

    let mut scored: Vec<(PathBuf, i32, bool, u64)> = candidates
        .iter()
        .map(|p| {
            let mut score = score_match(p, &cleaned);
            let has_video = path_has_video_stream(p);
            if is_audio_path(p) && prefer_audio {
                score += 160;
            }
            if is_video_container(p) && !prefer_audio {
                score += 120;
            }
            if has_video && !prefer_audio {
                score += 80;
            }
            let size = file_size(p);
            (p.clone(), score, has_video, size)
        })
        .filter(|(_, s, _, _)| *s > 0)
        .collect();

    if !scored.is_empty() {
        scored.sort_by(|a, b| {
            b.1.cmp(&a.1)
                .then_with(|| {
                    if prefer_audio {
                        a.2.cmp(&b.2)
                    } else {
                        b.2.cmp(&a.2)
                    }
                })
                .then_with(|| b.3.cmp(&a.3))
        });
        return Some(scored[0].0.clone());
    }

    let n_title = normalize(&cleaned.title);
    if n_title.is_empty() {
        return None;
    }

    let mut fallback: Vec<(PathBuf, bool, u64)> = candidates
        .iter()
        .filter_map(|p| {
            let stem = p.file_stem()?.to_str()?;
            let n_stem = normalize(stem);
            if n_stem.contains(&n_title) || n_title.contains(&n_stem) {
                Some((p.clone(), path_has_video_stream(p), file_size(p)))
            } else {
                None
            }
        })
        .collect();

    fallback.sort_by(|a, b| {
        if prefer_audio {
            a.1.cmp(&b.1).then_with(|| b.2.cmp(&a.2))
        } else {
            b.1.cmp(&a.1).then_with(|| b.2.cmp(&a.2))
        }
    });
    fallback.first().map(|(p, _, _)| p.clone())
}

fn is_audio_path(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase()),
        Some(ext) if matches!(ext.as_str(), "mp3" | "m4a" | "opus" | "wav" | "aac" | "flac")
    )
}

#[tauri::command]
pub fn resolve_playable_files_inner(
    output_dir: String,
    hints: Vec<PlayableHint>,
    search_folder: Option<String>,
    playlist_id: Option<String>,
) -> Result<Vec<PlayableFile>, String> {
    let root = PathBuf::from(&output_dir);
    if !root.is_dir() {
        return Err(format!("Destination not found: {output_dir}"));
    }

    let mut candidates = Vec::new();
    if let Some(folder) = search_folder {
        let folder_path = PathBuf::from(folder);
        if folder_path.is_dir() {
            collect_media_files(&folder_path, &mut candidates, 0);
        }
    }
    if candidates.is_empty() {
        if let Some(ref id) = playlist_id {
            if let Ok(paths) = find_playlist_folder_media(&root, id) {
                for path in paths {
                    candidates.push(PathBuf::from(path));
                }
            }
        }
    }
    if candidates.is_empty() {
        collect_media_files(&root, &mut candidates, 0);
    }

    if candidates.is_empty() {
        return Ok(vec![]);
    }

    let mut results = Vec::new();
    for hint in hints {
        if let Some(ref saved) = hint.file_path {
            let p = PathBuf::from(saved);
            if p.is_file() && is_media(&p) && !is_ytdlp_fragment_name(
                p.file_name().and_then(|n| n.to_str()).unwrap_or(""),
            ) {
                let audio_only = is_audio_path(&p);
                results.push(PlayableFile {
                    path: saved.clone(),
                    title: playable_title(&p, &hint),
                    item_index: hint.item_index,
                    is_audio: audio_only,
                });
                continue;
            }
        }
        // Ignore stale yt-dlp fragment paths saved during download (e.g. .f140)

        if let Some(best) = pick_best(&candidates, &hint) {
            let audio_only = is_audio_path(&best);
            results.push(PlayableFile {
                path: best.to_string_lossy().into_owned(),
                title: playable_title(&best, &hint),
                item_index: hint.item_index,
                is_audio: audio_only,
            });
        }
    }

    results.sort_by_key(|f| f.item_index.unwrap_or(0));
    Ok(results)
}

#[tauri::command]
pub async fn resolve_playable_files(
    output_dir: String,
    hints: Vec<PlayableHint>,
    search_folder: Option<String>,
    playlist_id: Option<String>,
) -> Result<Vec<PlayableFile>, String> {
    tokio::task::spawn_blocking(move || {
        resolve_playable_files_inner(output_dir, hints, search_folder, playlist_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

fn playback_staging_dir() -> PathBuf {
    std::env::temp_dir().join("yutubu-playback")
}

fn ffmpeg_program() -> Option<String> {
    which::which("ffmpeg")
        .ok()
        .map(|p| p.to_string_lossy().into_owned())
}

fn ffprobe_program() -> Option<String> {
    which::which("ffprobe")
        .ok()
        .map(|p| p.to_string_lossy().into_owned())
}

fn probe_video_codec(path: &Path) -> Option<String> {
    let ffprobe = ffprobe_program()?;
    let output = Command::new(&ffprobe)
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=codec_name",
            "-of",
            "csv=p=0",
        ])
        .arg(path)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout)
        .ok()
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty())
}

/// WebKitGTK reliably plays H.264 in MP4; VP9/AV1/HEVC often fail in-app.
fn is_browser_video_codec(codec: &str) -> bool {
    matches!(codec, "h264" | "avc" | "mpeg4")
}

fn cache_key_for(source: &Path) -> String {
    let modified = source
        .metadata()
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let mut hasher = DefaultHasher::new();
    source.to_string_lossy().hash(&mut hasher);
    modified.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn remux_faststart(source: &Path, dest: &Path) -> Result<(), String> {
    let ffmpeg = ffmpeg_program().ok_or_else(|| {
        "ffmpeg is required to prepare this video. Install ffmpeg from Setup.".to_string()
    })?;

    let status = Command::new(&ffmpeg)
        .args([
            "-y",
            "-i",
            &source.to_string_lossy(),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            &dest.to_string_lossy(),
        ])
        .output()
        .map_err(|e| format!("ffmpeg failed to start: {e}"))?;

    if status.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&status.stderr);
        Err(format!(
            "Could not prepare video: {}",
            err.lines().last().unwrap_or("ffmpeg error")
        ))
    }
}

fn transcode_for_browser(source: &Path, dest: &Path) -> Result<(), String> {
    let ffmpeg = ffmpeg_program().ok_or_else(|| {
        "ffmpeg is required to play this video format in the app. Install ffmpeg from Setup."
            .to_string()
    })?;

    let status = Command::new(&ffmpeg)
        .args([
            "-y",
            "-i",
            &source.to_string_lossy(),
            "-c:v",
            "libx264",
            "-profile:v",
            "baseline",
            "-level",
            "3.1",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "ultrafast",
            "-threads",
            "0",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            &dest.to_string_lossy(),
        ])
        .output()
        .map_err(|e| format!("ffmpeg failed to start: {e}"))?;

    if status.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&status.stderr);
        Err(format!(
            "Could not prepare video for in-app playback: {}",
            err.lines().last().unwrap_or("ffmpeg error")
        ))
    }
}

fn stage_media_for_playback_inner(source_path: String) -> Result<String, String> {
    let source = PathBuf::from(&source_path);
    if !source.is_file() {
        return Err(format!("Media file not found: {source_path}"));
    }
    if !is_media(&source) {
        return Err(format!("Not a playable media file: {source_path}"));
    }

    let staging = playback_staging_dir();
    std::fs::create_dir_all(&staging).map_err(|e| e.to_string())?;

    if is_audio_path(&source) {
        let key = cache_key_for(&source);
        let ext = media_extension(&source).unwrap_or_else(|| "mp3".into());
        let dest = staging.join(format!("play-{key}.{ext}"));
        if !dest.is_file() {
            std::fs::copy(&source, &dest).map_err(|e| e.to_string())?;
        }
        return Ok(dest.to_string_lossy().into_owned());
    }

    let key = cache_key_for(&source);
    let codec = probe_video_codec(&source);
    let needs_transcode = codec
        .as_deref()
        .map(|c| !is_browser_video_codec(c))
        .unwrap_or(true);

    let dest = staging.join(format!("play-{key}.mp4"));
    if dest.is_symlink() {
        let _ = std::fs::remove_file(&dest);
    }
    if dest.is_file() {
        return Ok(dest.to_string_lossy().into_owned());
    }

    if needs_transcode {
        transcode_for_browser(&source, &dest)?;
    } else if remux_faststart(&source, &dest).is_err() {
        transcode_for_browser(&source, &dest)?;
    }

    Ok(dest.to_string_lossy().into_owned())
}

/// Stage media for in-app playback without blocking the UI thread.
#[tauri::command]
pub async fn stage_media_for_playback(source_path: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || stage_media_for_playback_inner(source_path))
        .await
        .map_err(|e| format!("Playback preparation interrupted: {e}"))?
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackPrepInfo {
    pub needs_transcode: bool,
    pub codec: Option<String>,
}

#[tauri::command]
pub fn probe_playback_prep(source_path: String) -> Result<PlaybackPrepInfo, String> {
    let source = PathBuf::from(&source_path);
    if !source.is_file() {
        return Err(format!("Media file not found: {source_path}"));
    }
    if is_audio_path(&source) {
        return Ok(PlaybackPrepInfo {
            needs_transcode: false,
            codec: None,
        });
    }
    let codec = probe_video_codec(&source);
    let needs_transcode = codec
        .as_deref()
        .map(|c| !is_browser_video_codec(c))
        .unwrap_or(true);
    Ok(PlaybackPrepInfo {
        needs_transcode,
        codec,
    })
}

#[tauri::command]
pub fn open_media_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.is_file() {
        return Err(format!("File not found: {path}"));
    }
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}

fn media_paths_in_playlist_folder(folder: &Path) -> Result<Vec<String>, String> {
    let scan = scan_playlist_folder(folder).ok_or_else(|| {
        format!(
            "Playlist folder not found or empty: {}",
            folder.to_string_lossy()
        )
    })?;
    Ok(scan.children.into_iter().map(|c| c.path).collect())
}

fn find_playlist_folder_media(root: &Path, playlist_id: &str) -> Result<Vec<String>, String> {
    let suffix = format!(" [{playlist_id}]");
    let entries = std::fs::read_dir(root).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if name.ends_with(&suffix) {
            return media_paths_in_playlist_folder(&path);
        }
    }
    Err(format!("No playlist folder found for {playlist_id}"))
}

fn write_m3u_playlist(paths: &[String]) -> Result<PathBuf, String> {
    let mut hasher = DefaultHasher::new();
    for path in paths {
        path.hash(&mut hasher);
    }
    let stamp = std::time::SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let file_name = format!("yutubu-playlist-{:x}-{stamp}.m3u", hasher.finish());
    let m3u_path = std::env::temp_dir().join(file_name);
    let mut body = String::from("#EXTM3U\n");
    for path in paths {
        body.push_str(path);
        body.push('\n');
    }
    std::fs::write(&m3u_path, body).map_err(|e| e.to_string())?;
    Ok(m3u_path)
}

fn open_paths_in_system_player(app: &tauri::AppHandle, paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Err("No playable files found for this playlist.".into());
    }
    if paths.len() == 1 {
        return open_media_file(app.clone(), paths[0].clone());
    }

    let m3u_path = write_m3u_playlist(&paths)?;
    let m3u_str = m3u_path.to_string_lossy().into_owned();

    if which::which("mpv").is_ok() {
        let status = Command::new("mpv")
            .args(["--no-terminal", "--force-window=yes", &format!("--playlist={m3u_str}")])
            .spawn();
        if status.is_ok() {
            return Ok(());
        }
    }

    app.opener()
        .open_path(&m3u_str, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_playlist_in_system_player(
    app: tauri::AppHandle,
    output_dir: String,
    hints: Vec<PlayableHint>,
    folder_path: Option<String>,
    playlist_id: Option<String>,
) -> Result<(), String> {
    let mut paths: Vec<String> = resolve_playable_files_inner(
        output_dir.clone(),
        hints,
        folder_path.clone(),
        playlist_id.clone(),
    )?
        .into_iter()
        .map(|f| f.path)
        .collect();

    if paths.is_empty() {
        if let Some(folder) = folder_path {
            let folder_path = PathBuf::from(folder);
            if folder_path.is_dir() {
                paths = media_paths_in_playlist_folder(&folder_path)?;
            }
        }
    }

    if paths.is_empty() {
        if let Some(id) = playlist_id {
            let root = PathBuf::from(&output_dir);
            if root.is_dir() {
                paths = find_playlist_folder_media(&root, &id).unwrap_or_default();
            }
        }
    }

    open_paths_in_system_player(&app, paths)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartialPlaylistScan {
    pub playlist_title: String,
    pub playlist_id: String,
    pub folder_path: String,
    pub url: String,
    pub children: Vec<PlayableFile>,
    pub item_count: u32,
    pub completed_count: u32,
    pub has_artifacts: bool,
}

fn parse_playlist_folder_name(name: &str) -> Option<(String, String)> {
    let bracket = name.rfind(" [")?;
    if !name.ends_with(']') {
        return None;
    }
    let title = name[..bracket].trim();
    let id = name[bracket + 2..name.len() - 1].trim();
    if title.is_empty() || id.is_empty() || !id.starts_with("PL") {
        return None;
    }
    Some((title.to_string(), id.to_string()))
}

fn parse_item_index_from_name(name: &str) -> Option<u32> {
    let bytes = name.as_bytes();
    let mut i = 0usize;
    let mut value = 0u32;
    let mut digits = 0usize;
    while i < bytes.len() && bytes[i].is_ascii_digit() {
        value = value
            .saturating_mul(10)
            .saturating_add((bytes[i] - b'0') as u32);
        digits += 1;
        i += 1;
    }
    if digits == 0 || i + 2 >= bytes.len() {
        return None;
    }
    if &name[i..i + 3] != " - " {
        return None;
    }
    Some(value)
}

fn title_from_numbered_filename(name: &str) -> String {
    if let Some(idx) = parse_item_index_from_name(name) {
        let prefix = format!("{idx:02} - ");
        let alt = format!("{idx} - ");
        if let Some(rest) = name.strip_prefix(&prefix).or_else(|| name.strip_prefix(&alt)) {
            let stem = Path::new(rest)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or(rest);
            return clean_display_title(stem);
        }
    }
    title_from_path(Path::new(name))
}

fn dir_has_incomplete_artifacts(dir: &Path) -> bool {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return false;
    };
    for entry in entries.flatten() {
        let name = entry
            .file_name()
            .to_string_lossy()
            .to_string();
        if name.contains(".part") || is_ytdlp_fragment_name(&name) {
            return true;
        }
    }
    false
}

fn scan_playlist_folder(folder: &Path) -> Option<PartialPlaylistScan> {
    let folder_name = folder.file_name()?.to_str()?;
    let (playlist_title, playlist_id) = parse_playlist_folder_name(folder_name)?;
    let has_artifacts = dir_has_incomplete_artifacts(folder);

    let mut children = Vec::new();
    let mut max_index = 0u32;
    let entries = std::fs::read_dir(folder).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() || !is_media(&path) {
            continue;
        }
        let fname = path.file_name()?.to_str()?;
        let item_index = parse_item_index_from_name(fname)?;
        max_index = max_index.max(item_index);
        let audio_only = is_audio_path(&path) && !has_video_stream(&path);
        children.push(PlayableFile {
            path: path.to_string_lossy().into_owned(),
            title: title_from_numbered_filename(fname),
            item_index: Some(item_index),
            is_audio: audio_only,
        });
    }

    if children.is_empty() && !has_artifacts {
        return None;
    }

    children.sort_by_key(|c| c.item_index.unwrap_or(0));
    let completed_count = children.len() as u32;
    let item_count = max_index.max(completed_count);

    Some(PartialPlaylistScan {
        playlist_title,
        playlist_id: playlist_id.clone(),
        folder_path: folder.to_string_lossy().into_owned(),
        url: format!("https://www.youtube.com/playlist?list={playlist_id}"),
        children,
        item_count,
        completed_count,
        has_artifacts,
    })
}

#[tauri::command]
pub fn scan_partial_playlists(output_dir: String) -> Result<Vec<PartialPlaylistScan>, String> {
    let root = PathBuf::from(&output_dir);
    if !root.is_dir() {
        return Ok(vec![]);
    }

    let mut results = Vec::new();
    let entries = std::fs::read_dir(&root).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        if let Some(scan) = scan_playlist_folder(&path) {
            results.push(scan);
        }
    }
    results.sort_by(|a, b| a.playlist_title.cmp(&b.playlist_title));
    Ok(results)
}
