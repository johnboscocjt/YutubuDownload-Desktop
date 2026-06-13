# YutubuDownload Desktop (Tauri)

Cross-platform desktop app for YutubuDownload v2.0.1. Uses the shared Rust core (`crates/ytd-core`) for quality probing, cookies, and yt-dlp orchestration.

**Linux:** `.deb` installer available · **Windows / macOS:** coming soon

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

## Build Linux `.deb`

```bash
cd desktop
npm install
npm run tauri build
```

Artifacts:

| Output | Path |
|--------|------|
| `.deb` package | `target/release/bundle/deb/` (workspace root) |

Install the `.deb`:

```bash
sudo dpkg -i YutubuDownload_*_amd64.deb
sudo apt-get install -f
```

Publish the `.deb` to [GitHub Releases](https://github.com/johnboscocjt/YutubuDownload-Desktop/releases) so the website download button serves it automatically.

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
| Terminal script | `YutubuDownload` (separate repo) |

## Documentation

- [GUI App Guide](docs/GUI_APP_GUIDE.md) — screenshots for every screen
- [Technology](docs/TECHNOLOGY.md)
- [Release notes v2.0.1](docs/RELEASE_v2.0.1.md)
