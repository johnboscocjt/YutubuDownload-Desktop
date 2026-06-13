use crate::deps::{common_ytdlp_args, ytdlp_program};
use crate::error::Result;
use crate::paths::YtdPaths;
use crate::types::MetadataInfo;
use regex::Regex;
use std::process::Command;

pub fn extract_video_id(url: &str) -> Option<String> {
    let patterns = [
        r"(?i)(?:v=|youtu\.be/)([^&?/]{11})",
        r"(?i)youtube\.com/embed/([^/?&]{11})",
        r"(?i)youtube\.com/watch\?.*v=([^&]{11})",
    ];
    for pat in patterns {
        if let Ok(re) = Regex::new(pat) {
            if let Some(caps) = re.captures(url) {
                return caps.get(1).map(|m| m.as_str().to_string());
            }
        }
    }
    None
}

fn ytdlp_get(paths: &YtdPaths, url: &str, playlist: bool, field: &str) -> Option<String> {
    let program = ytdlp_program().ok()?;
    let mut args = common_ytdlp_args(&paths.cookie_file);
    args.push("--quiet".into());
    args.push(if playlist {
        "--yes-playlist".into()
    } else {
        "--no-playlist".into()
    });
    args.push(format!("--get-{field}"));
    args.push(url.into());

    let run = Command::new(&program).args(&args).output().ok()?;
    if !run.status.success() {
        let mut fallback: Vec<String> = vec![
            "--quiet".into(),
            "--no-warnings".into(),
            if playlist {
                "--yes-playlist".into()
            } else {
                "--no-playlist".into()
            },
            format!("--get-{field}"),
            url.into(),
        ];
        fallback.extend(crate::deps::js_runtime_args());
        let run2 = Command::new(&program).args(&fallback).output().ok()?;
        if !run2.status.success() {
            return None;
        }
        return String::from_utf8(run2.stdout)
            .ok()
            .map(|s| s.lines().next().unwrap_or("").trim().to_string())
            .filter(|s| !s.is_empty());
    }
    String::from_utf8(run.stdout)
        .ok()
        .map(|s| s.lines().next().unwrap_or("").trim().to_string())
        .filter(|s| !s.is_empty())
}

pub fn thumbnail_url_for_video(video_id: &str) -> String {
    format!("https://i.ytimg.com/vi/{video_id}/hqdefault.jpg")
}

pub fn fetch_metadata(paths: &YtdPaths, url: &str, is_playlist: bool) -> Result<MetadataInfo> {
    let video_id = extract_video_id(url);

    if is_playlist {
        let playlist_title = ytdlp_get(paths, url, true, "title");
        let entries = ytdlp_get(paths, url, true, "playlist_count")
            .and_then(|s| s.parse::<u32>().ok());
        return Ok(MetadataInfo {
            video_id,
            title: playlist_title.clone(),
            duration: None,
            thumbnail_url: None,
            is_playlist: true,
            playlist_title,
            entry_count: entries,
        });
    }

    let title = ytdlp_get(paths, url, false, "title");
    let duration = ytdlp_get(paths, url, false, "duration");
    let thumbnail_url = ytdlp_get(paths, url, false, "thumbnail").or_else(|| {
        video_id
            .as_ref()
            .map(|id| thumbnail_url_for_video(id))
    });

    Ok(MetadataInfo {
        video_id,
        title: title.clone(),
        duration,
        thumbnail_url,
        is_playlist: false,
        playlist_title: None,
        entry_count: None,
    })
}
