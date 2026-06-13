# YutubuDownload Desktop (Tauri)

Cross-platform desktop app for YutubuDownload v2.0.1. Uses the shared Rust core (`crates/ytd-core`) for quality probing, cookies, and yt-dlp orchestration.

## Prerequisites

- Rust **1.88.0** (`rust-toolchain.toml` in repo root)
- Node.js 20+
- System tools: **yt-dlp**, **ffmpeg**, **Deno** or **Node**, Python with **browser-cookie3** (same as terminal `ytd`)
- Linux: `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`

## Development

```bash
cd desktop
npm install
npm run tauri dev
```

## Build

```bash
cd desktop
npm install
npm run tauri build
```

Artifacts appear under `desktop/src-tauri/target/release/bundle/`.

## Headless CLI (same core)

```bash
cargo build -p ytd-core-cli --release
./target/release/ytd-core-cli deps
./target/release/ytd-core-cli resolve --url 'https://www.youtube.com/watch?v=...' --height 1080
```

## Architecture

| Layer | Path |
|-------|------|
| React UI | `desktop/src/` |
| Tauri commands | `desktop/src-tauri/src/commands/` |
| Download logic | `crates/ytd-core/` |
| Terminal script | `YutubuDownload` (unchanged; can adopt CLI in future) |
