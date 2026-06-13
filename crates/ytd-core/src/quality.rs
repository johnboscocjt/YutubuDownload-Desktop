use crate::deps::ytdlp_probe_output;
use crate::error::{Result, YtdError};
use crate::paths::YtdPaths;
use crate::types::{QualityResolution, STANDARD_HEIGHTS};

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
    let clean = crate::metadata::normalize_youtube_url(url);
    let mut heights = parse_heights(
        &ytdlp_probe_output(paths, &clean, false, &["-f", "bv*", "--print", "%(height)s"])
            .unwrap_or_default(),
    );
    if heights.is_empty() {
        heights = parse_heights(
            &ytdlp_probe_output(paths, &clean, false, &["-f", "b", "--print", "%(height)s"])
                .unwrap_or_default(),
        );
    }
    Ok(heights)
}

/// Full download chain: H.264 first (in-app playback), then VP9/AV1 at exact height, then capped fallback.
pub fn build_video_format(target: u32) -> String {
    format!(
        "bestvideo[vcodec^=avc1][height={t}]+bestaudio[ext=m4a]/\
         bestvideo[vcodec^=avc][height={t}]+bestaudio/\
         bestvideo[height={t}][vcodec^=vp9]+bestaudio/\
         bestvideo[height={t}][vcodec^=av01]+bestaudio/\
         bestvideo[height={t}]+bestaudio/\
         bestvideo[vcodec^=avc1][height<={t}]+bestaudio[ext=m4a]/\
         bestvideo[vcodec^=avc][height<={t}]+bestaudio/\
         bestvideo[height<={t}]+bestaudio/\
         best[height<={t}][ext=mp4]/best[height<={t}]",
        t = target
    )
}

/// H.264 at exact height (best for WebKit in-app playback).
fn h264_exact_format(height: u32) -> String {
    format!(
        "bestvideo[vcodec^=avc1][height={h}]+bestaudio[ext=m4a]/\
         bestvideo[vcodec^=avc][height={h}]+bestaudio/\
         bestvideo[vcodec^=avc1][height={h}][ext=mp4]+bestaudio",
        h = height
    )
}

/// Any codec at exact height — most YouTube 1080p+ streams are VP9/AV1, not H.264.
fn any_codec_exact_format(height: u32) -> String {
    format!(
        "bestvideo[height={h}][vcodec^=vp9]+bestaudio/\
         bestvideo[height={h}][vcodec^=av01]+bestaudio/\
         bestvideo[height={h}]+bestaudio/\
         bestvideo[height={h}]/best[height={h}]",
        h = height
    )
}

/// Highest stream up to max height (no bare `/best` that can grab 360p).
fn cap_format(max_height: u32) -> String {
    format!(
        "bestvideo[height<={h}]+bestaudio/\
         bestvideo[vcodec^=avc1][height<={h}]+bestaudio/\
         bestvideo[height<={h}]/best[height<={h}]",
        h = max_height
    )
}

/// What yt-dlp would actually fetch for this `-f` string (terminal script parity).
pub fn probe_simulated_height(paths: &YtdPaths, url: &str, format_str: &str) -> Option<u32> {
    let clean = crate::metadata::normalize_youtube_url(url);
    let output = ytdlp_probe_output(
        paths,
        &clean,
        false,
        &["-f", format_str, "--simulate", "--print", "%(height)s"],
    )?;
    parse_heights(&output).into_iter().max()
}

struct SimulatedPick {
    simulated_height: u32,
    format_string: String,
}

fn try_exact_height(
    paths: &YtdPaths,
    url: &str,
    format_str: &str,
    target: u32,
) -> Option<SimulatedPick> {
    let simulated_height = probe_simulated_height(paths, url, format_str)?;
    if simulated_height == target {
        Some(SimulatedPick {
            simulated_height,
            format_string: format_str.to_string(),
        })
    } else {
        None
    }
}

fn try_cap_height(
    paths: &YtdPaths,
    url: &str,
    format_str: &str,
    max_height: u32,
) -> Option<SimulatedPick> {
    let simulated_height = probe_simulated_height(paths, url, format_str)?;
    if simulated_height > 0 && simulated_height <= max_height {
        Some(SimulatedPick {
            simulated_height,
            format_string: format_str.to_string(),
        })
    } else {
        None
    }
}

fn exact_format_strategies(height: u32) -> Vec<String> {
    vec![
        h264_exact_format(height),
        any_codec_exact_format(height),
    ]
}

/// Simulate formats in priority order — try exact 1080p+ (any codec) before lowering height.
fn resolve_simulated_format(
    paths: &YtdPaths,
    url: &str,
    requested: u32,
    listed_heights: &[u32],
) -> Option<SimulatedPick> {
    // 1) Exact requested height: H.264 then VP9/AV1/any
    for fmt in exact_format_strategies(requested) {
        if let Some(pick) = try_exact_height(paths, url, &fmt, requested) {
            return Some(pick);
        }
    }

    // 2) Best verified stream up to requested cap (e.g. 1080 VP9 when exact match string differs)
    let cap = cap_format(requested);
    if let Some(pick) = try_cap_height(paths, url, &cap, requested) {
        if pick.simulated_height == requested
            || listed_heights.is_empty()
            || listed_heights.contains(&pick.simulated_height)
        {
            return Some(pick);
        }
    }

    // 3) Full format chain capped at requested
    let full = build_video_format(requested);
    if let Some(pick) = try_cap_height(paths, url, &full, requested) {
        if pick.simulated_height == requested
            || listed_heights.is_empty()
            || listed_heights.contains(&pick.simulated_height)
        {
            return Some(pick);
        }
    }

    // 4) Lower standard heights — only when requested height truly unavailable
    for h in STANDARD_HEIGHTS {
        if h >= requested {
            continue;
        }
        for fmt in exact_format_strategies(h) {
            if let Some(pick) = try_exact_height(paths, url, &fmt, h) {
                return Some(pick);
            }
        }
    }

    let mut listed: Vec<u32> = listed_heights
        .iter()
        .copied()
        .filter(|h| *h <= requested)
        .collect();
    listed.sort_by(|a, b| b.cmp(a));
    listed.dedup();
    for h in listed {
        for fmt in exact_format_strategies(h) {
            if let Some(pick) = try_exact_height(paths, url, &fmt, h) {
                return Some(pick);
            }
        }
    }

    None
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

    if let Some(pick) = resolve_simulated_format(paths, url, requested, &available) {
        let confirmed = pick.simulated_height == requested;
        let message = if confirmed {
            format!(
                "{}p confirmed — will download at requested quality",
                pick.simulated_height
            )
        } else {
            format!(
                "{requested}p is not available. Will download at {}p instead (verified with yt-dlp)",
                pick.simulated_height
            )
        };

        return Ok(QualityResolution {
            requested_height: requested,
            chosen_height: Some(pick.simulated_height),
            confirmed,
            message,
            format_string: pick.format_string,
        });
    }

    Ok(QualityResolution {
        requested_height: requested,
        chosen_height: None,
        confirmed: false,
        message: format!(
            "Could not verify quality online. yt-dlp will try {requested}p first, then fall back if needed"
        ),
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
    fn build_video_format_includes_vp9_and_cap() {
        let f = build_video_format(1080);
        assert!(f.contains("vcodec^=avc1"));
        assert!(f.contains("vcodec^=vp9"));
        assert!(f.contains("height=1080"));
        assert!(f.contains("height<=1080"));
        assert!(!f.ends_with("/best"));
    }

    #[test]
    fn any_codec_exact_has_no_bare_best() {
        let f = any_codec_exact_format(2160);
        assert!(f.contains("height=2160"));
        assert!(f.contains("vp9"));
        assert!(!f.ends_with("/best"));
    }

    #[test]
    fn display_heights_includes_standards() {
        let d = display_heights(&[720, 1080]);
        assert!(d.contains(&2160));
        assert!(d.contains(&720));
    }

    #[test]
    fn h264_exact_targets_height_only() {
        let f = h264_exact_format(1440);
        assert!(f.contains("[height=1440]"));
        assert!(!f.contains("height<=1440"));
    }
}
