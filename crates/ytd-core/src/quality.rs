use crate::deps::{common_ytdlp_args, ytdlp_program};
use crate::error::{Result, YtdError};
use crate::paths::YtdPaths;
use crate::types::{QualityResolution, STANDARD_HEIGHTS};
use std::process::Command;

fn ytdlp_probe(paths: &YtdPaths, url: &str, extra_args: &[&str]) -> String {
    let program = match ytdlp_program() {
        Ok(p) => p,
        Err(_) => return String::new(),
    };

    let mut args = common_ytdlp_args(&paths.cookie_file);
    args.push("--no-playlist".into());
    args.push("--quiet".into());
    for a in extra_args {
        args.push((*a).into());
    }
    args.push(url.into());

    let run = || {
        Command::new(&program)
            .args(&args)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
            .unwrap_or_default()
    };

    let output = run();
    if output.is_empty() {
        let mut no_cookie: Vec<String> = vec![
            "--no-playlist".into(),
            "--no-warnings".into(),
            "--quiet".into(),
            "--socket-timeout".into(),
            "10".into(),
            "--retries".into(),
            "2".into(),
        ];
        no_cookie.extend(crate::deps::js_runtime_args());
        for a in extra_args {
            no_cookie.push((*a).into());
        }
        no_cookie.push(url.into());
        Command::new(&program)
            .args(&no_cookie)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
            .unwrap_or_default()
    } else {
        output
    }
}

fn parse_heights(output: &str) -> Vec<u32> {
    let mut heights: Vec<u32> = output
        .lines()
        .filter_map(|l| l.trim().parse::<u32>().ok())
        .collect();
    heights.sort_by(|a, b| b.cmp(a));
    heights.dedup();
    heights
}

pub fn fetch_available_video_heights(paths: &YtdPaths, url: &str) -> Result<Vec<u32>> {
    let mut heights = parse_heights(&ytdlp_probe(
        paths,
        url,
        &["-f", "bv*", "--print", "%(height)s"],
    ));
    if heights.is_empty() {
        heights = parse_heights(&ytdlp_probe(
            paths,
            url,
            &["-f", "b", "--print", "%(height)s"],
        ));
    }
    Ok(heights)
}

pub fn build_video_format(target: u32) -> String {
    // Prefer H.264 so merged MP4s play in desktop WebView (AV1/HEVC often fail in WebKit).
    format!(
        "bestvideo[vcodec^=avc1][height={t}]+bestaudio[ext=m4a]/\
         bestvideo[vcodec^=avc][height={t}]+bestaudio/\
         bestvideo[vcodec^=avc1][height<={t}]+bestaudio[ext=m4a]/\
         bestvideo[vcodec^=avc][height<={t}]+bestaudio/\
         bestvideo[height={t}][ext=mp4]+bestaudio[ext=m4a]/\
         bestvideo[height={t}]+bestaudio/\
         best[height={t}][ext=mp4]/best[height<={t}]/best",
        t = target
    )
}

/// Pick the best height at or below `requested` from available heights (no extra yt-dlp calls).
fn pick_height_from_list(requested: u32, available: &[u32]) -> Option<u32> {
    if available.is_empty() {
        return None;
    }
    if available.contains(&requested) {
        return Some(requested);
    }
    for h in STANDARD_HEIGHTS {
        if h <= requested && available.contains(&h) {
            return Some(h);
        }
    }
    available
        .iter()
        .copied()
        .filter(|h| *h <= requested)
        .max()
        .or_else(|| available.iter().copied().max())
}

pub fn resolve_video_quality(
    paths: &YtdPaths,
    url: &str,
    requested: u32,
    listed_heights: &[u32],
) -> Result<QualityResolution> {
    if !STANDARD_HEIGHTS.contains(&requested) {
        return Err(YtdError::Config(format!(
            "Invalid height {requested}. Use one of {:?}",
            STANDARD_HEIGHTS
        )));
    }

    let available = if listed_heights.is_empty() {
        fetch_available_video_heights(paths, url).unwrap_or_default()
    } else {
        listed_heights.to_vec()
    };

    let chosen = pick_height_from_list(requested, &available);
    let confirmed = chosen == Some(requested);

    let message = match chosen {
        Some(h) if h == requested => {
            format!("{h}p confirmed — will download at requested quality")
        }
        Some(h) => format!("{requested}p is not available. Will download at {h}p instead"),
        None => format!(
            "Could not list qualities online. yt-dlp will try {requested}p first, then fall back if needed"
        ),
    };

    Ok(QualityResolution {
        requested_height: requested,
        chosen_height: chosen,
        confirmed,
        message,
        format_string: build_video_format(requested),
    })
}

pub fn display_heights(actual: &[u32]) -> Vec<u32> {
    let mut display: Vec<u32> = actual
        .iter()
        .copied()
        .filter(|h| STANDARD_HEIGHTS.contains(h))
        .collect();
    for h in STANDARD_HEIGHTS {
        if !display.contains(&h) {
            display.push(h);
        }
    }
    display.sort_by(|a, b| b.cmp(a));
    display.dedup();
    display
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_video_format_prefers_h264() {
        let f = build_video_format(1080);
        assert!(f.contains("vcodec^=avc1"));
        assert!(f.contains("vcodec^=avc"));
        assert!(f.contains("bestvideo[vcodec^=avc1][height<=1080]"));
        assert!(f.contains("best[height<=1080]"));
    }

    #[test]
    fn display_heights_includes_standards() {
        let d = display_heights(&[720, 1080]);
        assert!(d.contains(&2160));
        assert!(d.contains(&720));
    }

    #[test]
    fn pick_height_prefers_exact_match() {
        assert_eq!(pick_height_from_list(480, &[720, 480, 360]), Some(480));
    }

    #[test]
    fn pick_height_falls_back_to_lower() {
        assert_eq!(pick_height_from_list(480, &[720, 360]), Some(360));
    }
}
