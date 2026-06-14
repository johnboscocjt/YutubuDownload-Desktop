use http::header::{
    ACCEPT_RANGES, ACCESS_CONTROL_EXPOSE_HEADERS, CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE,
    RANGE,
};
use http::{Request, Response, StatusCode};
use http_range::HttpRange;
use percent_encoding::percent_decode;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

const MEDIA_EXT: &[&str] = &[
    "mp4", "webm", "mkv", "mov", "m4v", "mp3", "m4a", "opus", "wav", "aac", "flac",
];

fn mime_for(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .as_deref()
    {
        Some("mp4") | Some("m4v") => "video/mp4",
        Some("webm") => "video/webm",
        Some("mkv") => "video/x-matroska",
        Some("mp3") => "audio/mpeg",
        Some("m4a") => "audio/mp4",
        Some("opus") => "audio/opus",
        Some("wav") => "audio/wav",
        Some("aac") => "audio/aac",
        Some("flac") => "audio/flac",
        _ => "application/octet-stream",
    }
}

fn is_media_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| MEDIA_EXT.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn user_home_dir() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("USERPROFILE") {
        return Some(PathBuf::from(p));
    }
    if let Ok(p) = std::env::var("HOME") {
        return Some(PathBuf::from(p));
    }
    None
}

fn is_allowed_path(path: &Path) -> bool {
    if !path.is_file() || !is_media_file(path) {
        return false;
    }

    let check = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());

    let staging = std::env::temp_dir().join("yutubu-playback");
    if let Ok(staging_canon) = staging.canonicalize() {
        if check.starts_with(staging_canon) {
            return true;
        }
    }

    if let Some(home) = user_home_dir() {
        let home_canon = home.canonicalize().unwrap_or(home);
        if check.starts_with(&home_canon) {
            return true;
        }
    }

    false
}

fn decode_request_path(uri_path: &str) -> Option<PathBuf> {
    let decoded = percent_decode(uri_path.as_bytes()).decode_utf8().ok()?;
    let decoded = decoded.trim();
    if decoded.is_empty() {
        return None;
    }

    #[cfg(windows)]
    {
        // Tauri sends `/C:/Users/...` for custom protocol requests on Windows.
        let bytes = decoded.as_bytes();
        if bytes.first() == Some(&b'/') && decoded.len() >= 3 && bytes[2] == b':' {
            return Some(PathBuf::from(&decoded[1..]));
        }
    }

    Some(PathBuf::from(decoded))
}

fn error_response(status: StatusCode, message: &str) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header(CONTENT_TYPE, "text/plain")
        .body(message.as_bytes().to_vec())
        .unwrap()
}

pub fn handle_media_request(request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let path = match decode_request_path(request.uri().path()) {
        Some(p) => p,
        None => return error_response(StatusCode::BAD_REQUEST, "invalid path"),
    };

    if !is_allowed_path(&path) {
        return error_response(StatusCode::FORBIDDEN, "path not allowed");
    }

    let mut file = match File::open(&path) {
        Ok(f) => f,
        Err(_) => return error_response(StatusCode::NOT_FOUND, "file not found"),
    };

    let len = match file.metadata() {
        Ok(m) => m.len(),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "metadata error"),
    };

    let mime = mime_for(&path);
    let origin = "*";

    if let Some(range_header) = request.headers().get(RANGE).and_then(|v| v.to_str().ok()) {
        let ranges = match HttpRange::parse(range_header, len) {
            Ok(r) if !r.is_empty() => r,
            _ => {
                return Response::builder()
                    .status(StatusCode::RANGE_NOT_SATISFIABLE)
                    .header(CONTENT_RANGE, format!("bytes */{len}"))
                    .header("Access-Control-Allow-Origin", origin)
                    .body(vec![])
                    .unwrap();
            }
        };

        let range = &ranges[0];
        let start = range.start;
        let end = (start + range.length - 1).min(len.saturating_sub(1));
        let nbytes = end + 1 - start;

        let mut buf = vec![0u8; nbytes as usize];
        if file.seek(SeekFrom::Start(start)).is_err() || file.read_exact(&mut buf).is_err() {
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "read error");
        }

        return Response::builder()
            .status(StatusCode::PARTIAL_CONTENT)
            .header(CONTENT_TYPE, mime)
            .header(CONTENT_RANGE, format!("bytes {start}-{end}/{len}"))
            .header(CONTENT_LENGTH, nbytes)
            .header(ACCEPT_RANGES, "bytes")
            .header(ACCESS_CONTROL_EXPOSE_HEADERS, "content-range")
            .header("Access-Control-Allow-Origin", origin)
            .body(buf)
            .unwrap();
    }

    let mut buf = Vec::with_capacity(len as usize);
    if file.seek(SeekFrom::Start(0)).is_err() || file.read_to_end(&mut buf).is_err() {
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, "read error");
    }

    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, mime)
        .header(CONTENT_LENGTH, len)
        .header(ACCEPT_RANGES, "bytes")
        .header("Access-Control-Allow-Origin", origin)
        .body(buf)
        .unwrap()
}

pub fn register_protocol<R: tauri::Runtime>(
    builder: tauri::Builder<R>,
) -> tauri::Builder<R> {
    builder.register_asynchronous_uri_scheme_protocol("ytd-media", |_ctx, request, responder| {
        tauri::async_runtime::spawn_blocking(move || {
            responder.respond(handle_media_request(request));
        });
    })
}

#[cfg(test)]
mod tests {
    use super::{decode_request_path, is_allowed_path};
    use std::path::Path;

    #[test]
    fn decodes_absolute_paths_without_dropping_the_root_slash() {
        let path = decode_request_path("/tmp/yutubu-playback/play-123.mp4").unwrap();
        assert_eq!(path.to_string_lossy(), "/tmp/yutubu-playback/play-123.mp4");
    }

    #[test]
    fn decodes_percent_encoded_paths() {
        let path = decode_request_path("/home/user/My%20Video.mp4").unwrap();
        assert_eq!(path.to_string_lossy(), "/home/user/My Video.mp4");
    }

    #[cfg(windows)]
    #[test]
    fn decodes_windows_drive_paths_from_tauri_uri() {
        let path = decode_request_path("/C:/Users/me/Downloads/My%20Video.mp4").unwrap();
        assert_eq!(
            path.to_string_lossy(),
            "C:/Users/me/Downloads/My Video.mp4"
        );
    }

    #[test]
    fn allows_files_under_user_home() {
        use std::path::PathBuf;
        let home = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .ok()
            .map(PathBuf::from);
        let Some(home) = home else {
            return;
        };
        let file = home.join("yutubu-media-test-dummy.mp4");
        let _ = std::fs::write(&file, b"test");
        assert!(is_allowed_path(&file));
        let _ = std::fs::remove_file(&file);
    }
}
