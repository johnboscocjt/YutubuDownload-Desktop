# YutubuDownload Desktop — Technology

## Stack

| Layer | Technology |
|-------|------------|
| UI | React + TypeScript + Vite |
| Shell | Tauri 2 (native WebView window) |
| Core | Rust `ytd-core` crate |
| Engine | yt-dlp + ffmpeg |
| Auth | Chrome cookies via Python `browser-cookie3` |
| JS challenges | Deno (preferred) or Node.js |

## Architecture

```
React UI  →  Tauri commands  →  ytd-core  →  yt-dlp / ffmpeg
                ↓ events
         download-progress / download-complete
```

## Reliability features (same as terminal `ytd`)

- **Shared cookies** with file lock at `~/.config/YutubuDownload/cookies.txt`
- **Probe-verified quality** before download (`yt-dlp --simulate`)
- **Exact-first format chain** then controlled fallback
- **Resume** (`--continue`) and **skip completed** (`--no-overwrites`)
- **Retries** on fragments and file access
- **Low-network mode** when speed telemetry is unstable

## Cross-platform

Linux, Windows, and macOS use the same Rust core. Install hints for yt-dlp, ffmpeg, Deno, and Python cookies are shown in **Setup**.

## Deeper dives

| Guide | Topics |
|-------|--------|
| **Player & Download Performance** | mpv GTK embed, HTML fallback, scrubbing, concurrent fragments, non-blocking UI |
| **Download Guide** | Quality verification, playlist/MP3 flows (with diagrams) |
| **Desktop App Guide** | Screenshots of every page |
