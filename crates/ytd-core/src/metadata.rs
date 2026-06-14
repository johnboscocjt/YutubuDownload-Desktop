use crate::deps::ytdlp_probe_output;
use crate::error::Result;
use crate::paths::YtdPaths;
use crate::types::MetadataInfo;
use regex::Regex;

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

pub fn extract_playlist_id(url: &str) -> Option<String> {
    let re = Regex::new(r"(?i)[?&]list=([A-Za-z0-9_-]+)").ok()?;
    re.captures(url)
        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
}

pub fn normalize_youtube_url(url: &str) -> String {
    let trimmed = url.trim();
    let video_id = extract_video_id(trimmed);
    let playlist_id = extract_playlist_id(trimmed);

    match (video_id, playlist_id) {
        (Some(v), Some(list)) => {
            format!("https://www.youtube.com/watch?v={v}&list={list}")
        }
        (Some(v), None) => format!("https://www.youtube.com/watch?v={v}"),
        (None, Some(list)) => format!("https://www.youtube.com/playlist?list={list}"),
        (None, None) => trimmed.to_string(),
    }
}

pub fn thumbnail_url_for_video(video_id: &str) -> String {
    format!("https://i.ytimg.com/vi/{video_id}/hqdefault.jpg")
}

/// Same default folder label as terminal `ytd` / yt-dlp template root.
pub fn default_playlist_folder_label(playlist_title: &str, playlist_id: &str) -> String {
    format!("{playlist_title} [{playlist_id}]")
}

fn parse_probe_lines(raw: &str) -> impl Iterator<Item = &str> {
    raw.lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.eq_ignore_ascii_case("na"))
}

fn fetch_playlist_metadata(paths: &YtdPaths, url: &str) -> Result<MetadataInfo> {
    let video_id = extract_video_id(url);
    let playlist_id = extract_playlist_id(url);
    let probe_url = playlist_id
        .as_ref()
        .map(|id| format!("https://www.youtube.com/playlist?list={id}"))
        .unwrap_or_else(|| normalize_youtube_url(url));

    let mut playlist_title: Option<String> = None;
    let mut entry_count: Option<u32> = None;

    if let Some(raw) = ytdlp_probe_output(
        paths,
        &probe_url,
        true,
        &[
            "--playlist-end",
            "1",
            "--print",
            "%(playlist_title)s",
            "--print",
            "%(playlist_count)s",
        ],
    ) {
        let mut lines = parse_probe_lines(&raw);
        playlist_title = lines.next().map(str::to_string);
        entry_count = lines.next().and_then(|s| s.parse::<u32>().ok());
    }

    if playlist_title.as_ref().is_none_or(|s| s.is_empty()) {
        if let Some(raw) = ytdlp_probe_output(
            paths,
            &normalize_youtube_url(url),
            true,
            &["--playlist-end", "1", "--print", "%(playlist_title)s"],
        ) {
            playlist_title = parse_probe_lines(&raw).next().map(str::to_string);
        }
    }

    if entry_count.is_none() {
        // Avoid scanning the entire playlist just to count entries (very slow on large lists).
        // entry_count may stay None; download still works and the UI fills in during progress.
    }

    let playlist_title = playlist_title.or_else(|| {
        playlist_id
            .as_ref()
            .map(|id| default_playlist_folder_label("Playlist", id))
    });

    if playlist_title.is_none() {
        return Err(crate::error::YtdError::YtdlpFailed(
            "Could not fetch playlist info — check the URL is public and try again".into(),
        ));
    }

    Ok(MetadataInfo {
        video_id: video_id.clone(),
        playlist_id,
        title: playlist_title.clone(),
        duration: None,
        thumbnail_url: video_id.as_ref().map(|id| thumbnail_url_for_video(id)),
        is_playlist: true,
        playlist_title,
        entry_count,
    })
}

fn fetch_metadata_multiprint(paths: &YtdPaths, url: &str, is_playlist: bool) -> Result<MetadataInfo> {
    if is_playlist {
        return fetch_playlist_metadata(paths, url);
    }

    let video_id = extract_video_id(url);

    let raw = ytdlp_probe_output(
        paths,
        url,
        false,
        &[
            "--print",
            "%(title)s",
            "--print",
            "%(duration)s",
            "--print",
            "%(thumbnail)s",
        ],
    )
    .ok_or_else(|| crate::error::YtdError::YtdlpFailed("Could not fetch video info".into()))?;
    let mut lines = raw.lines().map(str::trim).filter(|l| !l.is_empty());
    let title = lines.next().map(str::to_string);
    let duration = lines.next().map(str::to_string);
    let thumbnail_url = lines
        .next()
        .map(str::to_string)
        .or_else(|| video_id.as_ref().map(|id| thumbnail_url_for_video(id)));

    Ok(MetadataInfo {
        video_id,
        playlist_id: None,
        title: title.clone(),
        duration,
        thumbnail_url,
        is_playlist: false,
        playlist_title: None,
        entry_count: None,
    })
}

pub fn fetch_metadata(paths: &YtdPaths, url: &str, is_playlist: bool) -> Result<MetadataInfo> {
    let clean = normalize_youtube_url(url);
    fetch_metadata_multiprint(paths, &clean, is_playlist)
}

/// Fast probe matching terminal speed: lightweight prints + height list in parallel (no -j dump).
pub fn probe_video_info(
    paths: &YtdPaths,
    url: &str,
    is_playlist: bool,
    skip_heights: bool,
) -> Result<(MetadataInfo, Vec<u32>)> {
    let clean = normalize_youtube_url(url);

    if skip_heights {
        let metadata = fetch_metadata_multiprint(paths, &clean, is_playlist)?;
        return Ok((metadata, vec![]));
    }

    let (metadata, heights) = std::thread::scope(|scope| {
        let paths_h = paths;
        let url_h = clean.as_str();
        let heights_handle = scope.spawn(move || {
            crate::quality::fetch_available_video_heights(paths_h, url_h).unwrap_or_default()
        });
        let metadata = fetch_metadata_multiprint(paths, &clean, is_playlist);
        let heights = heights_handle.join().unwrap_or_default();
        (metadata, heights)
    });

    Ok((metadata?, heights))
}

/// Flat-playlist titles for desktop progress UI (index, title).
pub fn fetch_playlist_entry_titles(paths: &YtdPaths, url: &str) -> Result<Vec<(u32, String)>> {
    let clean = normalize_youtube_url(url);
    let Some(raw) = ytdlp_probe_output(
        paths,
        &clean,
        true,
        &[
            "--flat-playlist",
            "--print",
            "%(playlist_autonumber)s",
            "--print",
            "%(title)s",
        ],
    ) else {
        return Ok(vec![]);
    };

    let lines: Vec<String> = parse_probe_lines(&raw).map(str::to_string).collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i + 1 < lines.len() {
        if let Ok(index) = lines[i].parse::<u32>() {
            let title = lines[i + 1].trim().to_string();
            if !title.is_empty() && !title.eq_ignore_ascii_case("na") {
                out.push((index, title));
            }
            i += 2;
            continue;
        }
        i += 1;
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_preserves_playlist_list_param() {
        let url = "https://www.youtube.com/watch?v=wdp7smAtqZI&list=PL4cUxeCkcC9goeb7U1FXFdNszWetcMhfB";
        let normalized = normalize_youtube_url(url);
        assert!(normalized.contains("list=PL4cUxeCkcC9goeb7U1FXFdNszWetcMhfB"));
        assert!(normalized.contains("v=wdp7smAtqZI"));
    }

    #[test]
    fn normalize_strips_tracking_params_but_keeps_list() {
        let url = "https://www.youtube.com/watch?v=wdp7smAtqZI&list=PLabc&pp=tracking";
        let normalized = normalize_youtube_url(url);
        assert!(!normalized.contains("pp="));
        assert!(normalized.contains("list=PLabc"));
    }

    #[test]
    fn default_playlist_folder_label_formats_like_cli() {
        assert_eq!(
            default_playlist_folder_label("Python Crash Course", "PLabc123"),
            "Python Crash Course [PLabc123]"
        );
    }
}
