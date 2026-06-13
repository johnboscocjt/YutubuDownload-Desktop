# 🎥 YutubuDownload Desktop
### *Tanzania-Optimized YouTube Downloader Desktop App*

YutubuDownload Desktop is the Tauri GUI for this repository. It focuses on downloading and playing videos, playlists, and MP3 files from the desktop app, with the Rust core shared across the UI and backend.

## What This Repo Is

- Desktop app: `desktop/`
- Shared Rust core: `crates/ytd-core/`
- Desktop backend commands: `desktop/src-tauri/src/`
- Website/landing page: `website/`

## Quick Start

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

## Requirements

- Rust 1.88.0
- Node.js 20+
- `yt-dlp`
- `ffmpeg`
- Deno or Node
- Python with `browser-cookie3`
- Linux desktop dependencies for Tauri as listed in [desktop/README.md](desktop/README.md)

## App Features

- Download single videos
- Download playlists
- Download MP3 audio
- View completed downloads in the app
- Play downloaded media inside the desktop app
- Open files and folders from the UI

## Documentation

- [Desktop app guide](desktop/docs/GUI_APP_GUIDE.md)
- [Desktop app README](desktop/README.md)
- [Technology notes](desktop/docs/TECHNOLOGY.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## Support

Use the desktop docs linked above for setup, usage, and troubleshooting.
