use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocEntry {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: String,
}

fn docs_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../docs")
}

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

struct DocSpec {
    id: &'static str,
    title: &'static str,
    description: &'static str,
    category: &'static str,
    /// Paths tried in order (relative to repo or app docs dir).
    paths: &'static [&'static str],
    embed: Option<&'static str>,
}

const DOCS: &[DocSpec] = &[
    DocSpec {
        id: "gui-app-guide",
        title: "Desktop App Guide",
        description: "Navigate the GUI with screenshots: Download, Play Completed, History, Setup, Settings.",
        category: "Getting Started",
        paths: &["desktop/docs/GUI_APP_GUIDE.md", "GUI_APP_GUIDE.md"],
        embed: Some(include_str!("../../../docs/GUI_APP_GUIDE.md")),
    },
    DocSpec {
        id: "download-guide",
        title: "Download Guide",
        description: "Quality, single video, playlist, and MP3 flows with diagrams.",
        category: "Downloading",
        paths: &["DOWNLOAD_GUIDE.md"],
        embed: Some(include_str!("../../../../DOWNLOAD_GUIDE.md")),
    },
    DocSpec {
        id: "technology",
        title: "Technology & Architecture",
        description: "Tauri, Rust core, yt-dlp stack, and reliability design.",
        category: "Technology",
        paths: &["desktop/docs/TECHNOLOGY.md", "TECHNOLOGY.md"],
        embed: Some(include_str!("../../../docs/TECHNOLOGY.md")),
    },
    DocSpec {
        id: "player-performance",
        title: "Player & Download Performance",
        description: "How the in-app player works (mpv embed, seek) and how downloads stay fast.",
        category: "Technology",
        paths: &["desktop/docs/PLAYER_AND_PERFORMANCE.md"],
        embed: Some(include_str!("../../../docs/PLAYER_AND_PERFORMANCE.md")),
    },
    DocSpec {
        id: "troubleshooting",
        title: "Troubleshooting",
        description: "Reinstall, cookies, regex fixes, and common errors.",
        category: "Support",
        paths: &["TROUBLESHOOTING.md"],
        embed: Some(include_str!("../../../../TROUBLESHOOTING.md")),
    },
    DocSpec {
        id: "desktop-app",
        title: "Build & Develop",
        description: "Build, dev, and CLI usage for developers.",
        category: "Technology",
        paths: &["desktop/README.md"],
        embed: None,
    },
    DocSpec {
        id: "full-manual",
        title: "Full Manual",
        description: "Complete YutubuDownload technical documentation.",
        category: "Reference",
        paths: &["YTdownloadScriptForVideoPlaylistAudio.md"],
        embed: None,
    },
    DocSpec {
        id: "release-notes",
        title: "Release Notes v2.0.1",
        description: "Latest features: stable quality, loop mode, desktop app.",
        category: "Reference",
        paths: &[
            "desktop/docs/RELEASE_v2.0.1.md",
            "RELEASE_v2.0.1.md",
        ],
        embed: Some(include_str!("../../../docs/RELEASE_v2.0.1.md")),
    },
];

fn resolve_path(rel: &str) -> PathBuf {
    if rel.starts_with("desktop/docs/") {
        return docs_dir().join(rel.trim_start_matches("desktop/docs/"));
    }
    workspace_root().join(rel)
}

fn read_file(path: &Path) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| format!("Could not read {}: {e}", path.display()))
}

fn load_doc(spec: &DocSpec) -> Result<String, String> {
    for rel in spec.paths {
        let path = resolve_path(rel);
        if path.is_file() {
            return read_file(&path);
        }
    }
    if let Some(content) = spec.embed {
        return Ok(content.to_string());
    }
    Err(format!(
        "Document not found: {} (tried {} path(s))",
        spec.id,
        spec.paths.len()
    ))
}

pub fn list_docs() -> Vec<DocEntry> {
    DOCS
        .iter()
        .map(|d| DocEntry {
            id: d.id.into(),
            title: d.title.into(),
            description: d.description.into(),
            category: d.category.into(),
        })
        .collect()
}

#[tauri::command]
pub fn list_documentation() -> Vec<DocEntry> {
    list_docs()
}

#[tauri::command]
pub fn read_documentation(id: String) -> Result<String, String> {
    let spec = DOCS
        .iter()
        .find(|d| d.id == id)
        .ok_or_else(|| format!("Unknown document: {id}"))?;
    load_doc(spec)
}
