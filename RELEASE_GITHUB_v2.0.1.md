# YutubuDownload v2.0.1

**Release date:** June 2026  
**Codename:** Desktop + Terminal Coexistence Edition

---

## Summary

First full **multi-platform desktop release**: Linux `.deb`, Windows `.exe`, and macOS universal `.dmg`, plus the existing **`ytd` terminal CLI**. Desktop and CLI are designed to **coexist** on Linux — installing the GUI no longer removes `/usr/local/bin/ytd`.

**Website:** https://ytddesktop.vercel.app  
**CLI docs:** https://ytdownloadertz.vercel.app

---

## Downloads

| Platform | File | Install |
|----------|------|---------|
| **Linux** | `YutubuDownload_2.0.1_amd64.deb` | `sudo dpkg -i …` then `sudo apt-get install -f -y` |
| **Windows** | `YutubuDownload_2.0.1_x64-setup.exe` | Run the NSIS setup wizard (64-bit) |
| **macOS** | `YutubuDownload_2.0.1_universal.dmg` | Drag to Applications (Apple Silicon + Intel) |
| **Terminal (CLI)** | `install.sh` | One-line install — Linux native; Windows via WSL; macOS in Terminal |

Direct downloads from the website API:

- Linux: `/api/download?platform=linux`
- Windows: `/api/download?platform=windows`
- macOS: `/api/download?platform=macos`
- Terminal script: `/api/download?platform=terminal`

---

## Desktop app highlights

- **Probe-verified quality** — chosen resolution confirmed with `yt-dlp --simulate` before download starts
- **Video, playlist & MP3** — numbered playlist folders, real folder names
- **Download history** — open playlist, file, or destination folder
- **Dependency panel** — yt-dlp, ffmpeg, Deno/Node check + cookie refresh
- **In-app docs** — guides and Mermaid diagrams built into the app
- **Playback** — embedded mpv on Linux; HTML player on Windows and macOS
- **Tanzania-tuned** — low-network mode, shared cookies, resume, concurrent fragments

---

## Terminal (`ytd` CLI) highlights

- Probe-verified video quality and honest fallback messaging
- Loop download mode — multiple URLs in one session
- Multi-instance safe — shared `cookies.txt` + per-session temp/log isolation
- MP3 reliability improvements and auto `yt-dlp` refresh in `~/.local/bin`
- Safe reinstall via `install.sh`

### CLI platform notes

- **Linux:** fully supported
- **Windows:** use WSL or a Linux VM, then run `install.sh` inside Linux
- **macOS:** Unix-based — run `install.sh` in Terminal
- **Other Unix:** distro-agnostic across Unix-like systems

---

## Linux: desktop + CLI together

| | Desktop app | Terminal `ytd` |
|--|-------------|----------------|
| **Install** | `.deb` package | `install.sh` |
| **Command / launch** | App menu → `/usr/bin/yutubu-download` | `ytd` in shell |
| **Default saves** | `~/YutubuDownload-Desktop` | directory you choose |
| **Cookies** | shared at `~/.config/YutubuDownload` | same (by design) |

Install order does not matter. The `.deb` **does not remove** the CLI binaries.

---

## Install guides (website)

- Linux: `#linux-install`
- Windows: `#windows-install`
- macOS: `#macos-install`
- CLI deep docs: https://ytdownloadertz.vercel.app

---

## Upgrade

### Desktop

Download the latest installer for your OS from https://ytddesktop.vercel.app and install over the existing copy.

### Terminal (Linux / WSL / macOS Terminal)

```bash
sudo bash -c "$(curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/install.sh)"
```

Run `ytd` **without** `sudo` (unless your environment requires it for package deps only during install).

---

## Verify

**Desktop:** open from the app menu after install.

**CLI:**

```bash
ytd --version
```

Expected:

```text
ytd (YutubuDownload) v2.0.1 • Tanzania-Optimized • MULTI-INSTANCE + SHARED COOKIES
```

---

## macOS first launch

The app is open source and not yet notarized. If Gatekeeper blocks launch: **right-click → Open** in Applications, or run:

```bash
xattr -cr "/Applications/YutubuDownload.app"
```

---

## Dependencies (all platforms)

Install once and ensure they are on your `PATH`:

- **yt-dlp**
- **ffmpeg**
- **Deno** or **Node.js** (cookie extraction)

Linux: `apt` / bundled in `install.sh`  
Windows: `winget`  
macOS: `brew install yt-dlp ffmpeg deno`

---

## Bug fixes in this release line

- Cross-platform CI builds (Linux `.deb`, Windows NSIS, macOS universal `.dmg`)
- Linux `.deb` pre-install no longer deletes `/usr/local/bin/ytd`
- Separate terminal menu entry when both GUI and CLI are installed
- Website per-platform download labels and install/uninstall guides

---

## Repository layout

- **Desktop + website:** `johnboscocjt/YutubuDownload-Desktop`
- **Terminal CLI:** `johnboscocjt/Youtube-Downloader-For-UbuntuTerminal`
- **Rust core:** `crates/ytd-core` (shared by desktop and CLI tooling)

---

## License

MIT — Johnbosco
