use crate::error::Result;
use crate::paths::YtdPaths;
use crate::types::{DependencyStatus, InstallHints, ToolStatus, USER_AGENT};
use std::path::PathBuf;
use std::process::Command;

fn which(cmd: &str) -> Option<PathBuf> {
    which::which(cmd).ok()
}

fn tool_version(program: &str, args: &[&str]) -> Option<String> {
    Command::new(program)
        .args(args)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.lines().next().unwrap_or("").trim().to_string())
        .filter(|s| !s.is_empty())
}

fn local_bin_ytdlp() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".local/bin/yt-dlp"))
}

pub fn resolve_ytdlp() -> ToolStatus {
    if let Some(path) = which("yt-dlp").or_else(local_bin_ytdlp) {
        let path_str = path.to_string_lossy().into_owned();
        return ToolStatus {
            found: true,
            path: Some(path_str.clone()),
            version: tool_version(&path_str, &["--version"]),
            detail: None,
        };
    }
    ToolStatus {
        found: false,
        path: None,
        version: None,
        detail: Some("yt-dlp not in PATH or ~/.local/bin".into()),
    }
}

pub fn resolve_ffmpeg() -> ToolStatus {
    if let Some(path) = which("ffmpeg") {
        let path_str = path.to_string_lossy().into_owned();
        return ToolStatus {
            found: true,
            path: Some(path_str.clone()),
            version: tool_version(&path_str, &["-version"]),
            detail: None,
        };
    }
    ToolStatus {
        found: false,
        path: None,
        version: None,
        detail: Some("ffmpeg not found".into()),
    }
}

pub fn resolve_js_runtime() -> ToolStatus {
    if let Some(path) = which("deno") {
        let path_str = path.to_string_lossy().into_owned();
        return ToolStatus {
            found: true,
            path: Some(path_str.clone()),
            version: tool_version(&path_str, &["--version"]),
            detail: Some("deno".into()),
        };
    }
    if let Some(path) = which("node") {
        let path_str = path.to_string_lossy().into_owned();
        return ToolStatus {
            found: true,
            path: Some(path_str.clone()),
            version: tool_version(&path_str, &["--version"]),
            detail: Some("node".into()),
        };
    }
    ToolStatus {
        found: false,
        path: None,
        version: None,
        detail: Some("Install Deno (recommended) or Node.js".into()),
    }
}

pub fn resolve_python_cookies(paths: &YtdPaths) -> ToolStatus {
    for python in ["python3", "python", paths.venv_python().to_str().unwrap_or("")] {
        if python.is_empty() {
            continue;
        }
        let output = Command::new(python)
            .args(["-c", "import browser_cookie3; print('ok')"])
            .output();
        if let Ok(out) = output {
            if out.status.success() {
                return ToolStatus {
                    found: true,
                    path: Some(python.to_string()),
                    version: None,
                    detail: Some("browser_cookie3 available".into()),
                };
            }
        }
    }
    ToolStatus {
        found: false,
        path: None,
        version: None,
        detail: Some("pip install browser-cookie3 secretstorage cryptography".into()),
    }
}

fn install_hints() -> InstallHints {
    if cfg!(target_os = "linux") {
        InstallHints {
            ytdlp: "sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp".into(),
            ffmpeg: "sudo apt install ffmpeg".into(),
            js_runtime: "curl -fsSL https://deno.land/install.sh | sh".into(),
            python_cookies: "python3 -m venv ~/youtubedownloading/yt-venv && source ~/youtubedownloading/yt-venv/bin/activate && pip install browser-cookie3 secretstorage cryptography".into(),
        }
    } else if cfg!(target_os = "macos") {
        InstallHints {
            ytdlp: "brew install yt-dlp".into(),
            ffmpeg: "brew install ffmpeg".into(),
            js_runtime: "brew install deno".into(),
            python_cookies: "pip3 install browser-cookie3".into(),
        }
    } else {
        InstallHints {
            ytdlp: "winget install yt-dlp or download from github.com/yt-dlp/yt-dlp/releases".into(),
            ffmpeg: "winget install ffmpeg".into(),
            js_runtime: "Install Deno from deno.land".into(),
            python_cookies: "pip install browser-cookie3".into(),
        }
    }
}

pub fn check_dependencies(paths: &YtdPaths) -> DependencyStatus {
    let ytdlp = resolve_ytdlp();
    let ffmpeg = resolve_ffmpeg();
    let js_runtime = resolve_js_runtime();
    let python_cookies = resolve_python_cookies(paths);
    let all_ready = ytdlp.found && ffmpeg.found;

    DependencyStatus {
        all_ready,
        ytdlp,
        ffmpeg,
        js_runtime,
        python_cookies,
        install_hints: install_hints(),
    }
}

pub fn ytdlp_program() -> Result<String> {
    resolve_ytdlp()
        .path
        .ok_or(crate::error::YtdError::YtdlpNotFound)
}

pub fn js_runtime_args() -> Vec<String> {
    if which("deno").is_some() {
        vec!["--js-runtimes".into(), "deno".into()]
    } else if which("node").is_some() {
        vec!["--js-runtimes".into(), "node".into()]
    } else {
        vec![]
    }
}

pub fn common_ytdlp_args(cookie_file: &std::path::Path) -> Vec<String> {
    let mut args = vec![
        "--cookies".into(),
        cookie_file.to_string_lossy().into_owned(),
        "--user-agent".into(),
        USER_AGENT.into(),
        "--no-warnings".into(),
        "--socket-timeout".into(),
        "10".into(),
        "--retries".into(),
        "2".into(),
    ];
    args.extend(js_runtime_args());
    args
}

const YTDLP_PROBE_TIMEOUT_SECS: u64 = 15;

fn run_command_with_timeout(program: &str, args: &[String]) -> Option<String> {
    use std::sync::mpsc;
    use std::time::Duration;

    let program = program.to_string();
    let args = args.to_vec();
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let out = Command::new(&program)
            .args(&args)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
            .filter(|s| !s.trim().is_empty());
        let _ = tx.send(out);
    });
    rx.recv_timeout(Duration::from_secs(YTDLP_PROBE_TIMEOUT_SECS))
        .ok()
        .flatten()
}

fn ytdlp_run_inner(
    cookie_file: Option<&std::path::Path>,
    playlist: bool,
    url: &str,
    extra_args: &[&str],
) -> Option<String> {
    let program = ytdlp_program().ok()?;
    let mut args = match cookie_file {
        Some(c) => common_ytdlp_args(c),
        None => {
            let mut a = vec![
                "--no-warnings".into(),
                "--socket-timeout".into(),
                "10".into(),
                "--retries".into(),
                "2".into(),
            ];
            a.extend(js_runtime_args());
            a
        }
    };
    args.push("--quiet".into());
    args.push(
        if playlist {
            "--yes-playlist".into()
        } else {
            "--no-playlist".into()
        },
    );
    for a in extra_args {
        args.push((*a).into());
    }
    args.push(url.into());
    run_command_with_timeout(&program, &args)
}

/// Run yt-dlp like the terminal script: cookies first, then fallback, 15s cap per attempt.
pub fn ytdlp_probe_output(
    paths: &crate::paths::YtdPaths,
    url: &str,
    playlist: bool,
    extra_args: &[&str],
) -> Option<String> {
    ytdlp_run_inner(Some(&paths.cookie_file), playlist, url, extra_args)
        .or_else(|| ytdlp_run_inner(None, playlist, url, extra_args))
}

// Lightweight which implementation to avoid extra dep
mod which {
    use std::path::PathBuf;

    pub fn which(cmd: &str) -> Result<PathBuf, ()> {
        let path_var = std::env::var_os("PATH").unwrap_or_default();
        for dir in std::env::split_paths(&path_var) {
            let full = dir.join(cmd);
            if full.is_file() {
                return Ok(full);
            }
            #[cfg(windows)]
            {
                for ext in [".exe", ".cmd", ".bat"] {
                    let with_ext = dir.join(format!("{cmd}{ext}"));
                    if with_ext.is_file() {
                        return Ok(with_ext);
                    }
                }
            }
        }
        Err(())
    }
}
