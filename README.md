# 🎥 YutubuDownload  
### *Tanzania-Optimized YouTube Downloader for Ubuntu Terminal*  

> “Out here doing some Alien things, Jesus is King...” — Johnbosco (Isaiah 28:21)

<div align="center">

```
█████ █████             █████               █████                ██████████                                       ████                         █████
░░███ ░░███             ░░███               ░░███                ░░███░░░░███                                     ░░███                        ░░███ 
 ░░███ ███   █████ ████ ███████   █████ ████ ░███████  █████ ████ ░███   ░░███  ██████  █████ ███ █████ ████████   ░███   ██████   ██████    ███████ 
  ░░█████   ░░███ ░███ ░░░███░   ░░███ ░███  ░███░░███░░███ ░███  ░███    ░███ ███░░███░░███ ░███░░███ ░░███░░███  ░███  ███░░███ ░░░░░███  ███░░███ 
   ░░███     ░███ ░███   ░███     ░███ ░███  ░███ ░███ ░███ ░███  ░███    ░███░███ ░███ ░███ ░███ ░███  ░███ ░███  ░███ ░███ ░███  ███████ ░███ ░███ 
    ░███     ░███ ░███   ░███ ███ ░███ ░███  ░███ ░███ ░███ ░███  ░███    ███ ░███ ░███ ░░███████████   ░███ ░███  ░███ ░███ ░███ ███░░███ ░███ ░███ 
    █████    ░░████████  ░░█████  ░░████████ ████████  ░░████████ ██████████  ░░██████   ░░████░████    ████ █████ █████░░██████ ░░████████░░████████
   ░░░░░      ░░░░░░░░    ░░░░░    ░░░░░░░░ ░░░░░░░░    ░░░░░░░░ ░░░░░░░░░░    ░░░░░░     ░░░░ ░░░░    ░░░░ ░░░░░ ░░░░░  ░░░░░░   ░░░░░░░░  ░░░░░░░░ 
```

**Author:** Johnbosco | **Last Updated:** June 12, 2026  
**Version:** v2.0.1 — *Multi-Instance Shared-Cookie Edition*  
🌍 *Tested across Dar es Salaam, Mwanza, Arusha & Zanzibar networks*  

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?logo=github)](https://github.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal)  
[![Version](https://img.shields.io/badge/Version-2.0.1-brightgreen)](https://github.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/releases/tag/v2.0.1)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

> 💡 **Zsh users**: After install, run `source ~/.zshrc` once  
> 🌍 **Tanzania Tip**: Run during off-peak hours (after 10 PM EAT) for faster downloads!

---

## 🆕 What's New

### v2.0.1 (2026-06-08) — Latest Release

- **Added**: **Loop download mode** — stay in `ytd` and paste multiple URLs until you type `q`
- **Improved**: **Stable video quality** — probes exact height with `yt-dlp --simulate` before download; falls back only when verified unavailable
- **Fixed**: MP3 downloads with `bestaudio/best` fallback; auto-refresh `yt-dlp` without sudo
- **Fixed**: Bash-compatible video ID regex (no more `invalid regular expression` errors)
- **Improved**: Safe reinstall via `install.sh` (detects existing installs; uses local script when run from a cloned repo)
- **Added**: `DOWNLOAD_GUIDE.md`, reinstall guidance in `TROUBLESHOOTING.md`, on-screen hint when URL parsing fails

**Upgrade & verify:**

```bash
sudo bash -c "$(curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/install.sh)"
ytd --version
# Expected: ytd (YutubuDownload) v2.0.1 (2026-06-08) • Tanzania-Optimized • MULTI-INSTANCE + SHARED COOKIES
```

### v2.0.0 (2026-04-20) — Multi-Instance Shared-Cookie Edition

v2.0.0 is focused on reliability under real-world network constraints: anti-bot handling, resilient download controls, and progress behavior that keeps downloads moving on unstable links.

**Highlights:**
- Safe multi-instance downloads for parallel terminal usage
- Shared cookie service with lock-based refresh
- Session-isolated temp/log structure for cleaner concurrent runs
- Exact quality targeting with fallback to nearest lower available format
- Adaptive progress with low-network mode when transfer telemetry is unstable
- `ytd` as the primary command; `YutubuDownload` remains compatible

**Compatibility:**
- Primary launch command: `ytd`
- Compatibility launch command: `YutubuDownload`
- Ubuntu terminal workflows supported

> **Note:** This release is tuned for reliability, not just speed. On unstable networks, the UI may intentionally simplify to reduce noisy ETA/speed swings while the download continues.

### 🧠 **MULTI-INSTANCE ARCHITECTURE (v2.0.0)**
- **Added**: Safe multi-terminal downloads with per-run `SESSION_ID`
- **Added**: Shared `cookies.txt` store with file-lock refresh model
- **Added**: Session-specific temp/log folders for clean isolation
- **Added**: Unique output roots per session to prevent cross-terminal overwrite
- **Added**: Optional fragment tuning via `YTDL_CONCURRENT_FRAGMENTS`
- **Removed**: Browser process killing flow (`pkill chrome/chromium`)

### 🚀 **BETTER PROGRESS BAR + QUALITY PICKING**
- **Fixed**: Progress output now stays cleaner as a single terminal line
- **Improved**: Quality resolver lists video-only formats, then **verifies your choice with yt-dlp before download**
- **Improved**: Tries exact requested height first (e.g. 1080p); falls back to nearest lower standard only when probe confirms it is unavailable
- **Improved**: Format chain tries exact height, then `height<=requested`, so downloads do not downgrade prematurely on slow probes
- **Improved**: Better quality consistency for 1080p+ selections

### ✨ **CLEAN PROGRESS BAR DISPLAY**
- **Fixed**: No more messy, overlapping progress bar output
- **Enhanced**: Single-line progress bar with clean updates
- **Added**: File size display in real-time
- **Format**: `Title VideoID ████████████████████░ 100.0% | 2.98MiB | ETA: 00:00 | 1.68MiB/s`
- **Completion**: Clean download confirmation: `✓ Downloaded: Title [2.98MiB]`

### 📊 **Enhanced Visual Feedback**
- **Video ID Display**: Shows first 8 characters next to title
- **Real-time File Size**: See download size as it progresses
- **Color-coded Elements**: Consistent terminal coloring
- **Smooth Updates**: Proper carriage returns for single-line updates
- **Multi-Instance Ready**: Supports concurrent terminal sessions with isolated state.

### 🌐 **Low-Network Progress Mode (Not a Failure)**
- **Default behavior**: On healthy networks, progress shows full detail (`ETA` + speed).
- **Automatic fallback**: On unstable/slow links, script switches to `low-network` progress mode.
- **Meaning**: Download is still working; UI is simplified to reduce noisy ETA/speed fluctuations.

Example when unstable network is detected:

```text
sIaT8Jl2zpI █░░░░░░░░░░░░░░ 0.0% | 4.32MiB | low-network
sIaT8Jl2zpI █████░░░░░░░░░░░ 37.6% | 4.32MiB | low-network
sIaT8Jl2zpI ████████░░░░░░ 63.5% | 4.32MiB | low-network
sIaT8Jl2zpI █████████████░ 96.4% | 4.32MiB | low-network
sIaT8Jl2zpI ██████████████░ 100.0% | 4.32MiB | low-network
```

On better networks, you will see richer output like:

```text
Title ██████████░░░░ 78.4% | 3.55MiB | ETA: 00:01 | 613.74KiB/s
```

### ⚔️ **Why v2.0.0 Is Dangerously Powerful (In a Good Way)**
- **More aggressive reliability stack** than normal wrappers: cookies + JS runtime + retries + resume + exact quality fallback.
- **Safer multi-instance behavior** than typical scripts: shared cookie refresh lock + per-run temp/log isolation.
- **Cleaner operator UX** than raw yt-dlp: guided prompts, folder logic, stable progress UI, meaningful failure hints.
- **Built for hard conditions**: unstable links, power/network interruptions, and anti-bot friction.

### 📈 v2.0.0 vs Typical Downloaders
| Capability | v2.0.0 ytd | Typical script wrapper |
|---|---|---|
| Concurrent terminals | ✅ Safe (lock + session isolation) | ⚠️ Often conflicts |
| Cookie handling | ✅ Shared + controlled refresh | ⚠️ Usually ad-hoc |
| Quality targeting | ✅ Exact + fallback | ⚠️ Often best-effort only |
| Progress trustworthiness | ✅ Detailed + adaptive low-network mode | ⚠️ Noisy/inconsistent |
| Playlist organization | ✅ Grouped and predictable | ⚠️ Easy to mix outputs |

### 🧩 Technology Combination Diagram (v2.0.0)
```mermaid
flowchart LR
  U[User] --> CLI[ytd CLI]
  CLI --> ORCH[Bash Orchestration Layer]

  ORCH --> CK[Cookie Service]
  CK --> LOCK[Refresh Lock]
  CK --> CFILE[cookies.txt]

  ORCH --> RT[Runtime Selector]
  RT --> DENO[Deno preferred]
  RT --> NODE[Node fallback]

  ORCH --> YTDLP[yt-dlp Engine]
  ORCH --> FFMPEG[ffmpeg mux/convert]

  ORCH --> QSEL[Quality Resolver]
  QSEL --> PROBE[yt-dlp simulate probe]
  QSEL --> FBK[Nearest Lower Fallback]

  ORCH --> PROG[Progress Controller]
  PROG --> P1[Single-line detailed UI]
  PROG --> P2[Low-network fallback UI]

  ORCH --> OUT[Output Organizer]
  OUT --> SNG[Single file: current directory]
  OUT --> PLS[Playlist: grouped folder]
```

---

## 🌌 Alien-Tech Terminal Experience

YutubuDownload now features **professional terminal interface** with:
- 🔵 **Clean single-line progress updates** for distraction-free downloading
- 📊 **Real-time file size display** so you know what to expect
- 🟡 **Video ID identification** for easy tracking
- ✨ **Faith-powered closing flourish**

Your terminal doesn’t just download — it **declares Kingdom authority over the digital realm**.

---

## ⚡ One-Command Installation (Recommended)

```bash
# Installs ALL dependencies + script globally (run once)
sudo bash -c "$(curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/install.sh)"
```

---

## 🚀 Quick Start

```bash
# 1. CLOSE ALL CHROME WINDOWS COMPLETELY (required for cookie access)
# 2. Open terminal and run:
cd ~/youtubedownloading
ytd

# 3. Follow prompts:
#    • Paste YouTube URL
#    • Choose: Video or MP3
#    • Select quality (720p recommended for unstable networks)
#    • Confirm folder (recommended for playlists)
```

✅ **Done!** Files saved with resume support & no duplicates.

---

## ✨ Key Features

- **🇹🇿 Tanzania-Optimized**  
  Resume support for unstable 4G networks (Vodacom/Airtel/Tigo)
  
- **📊 Clean Progress Display**  
  Single-line progress bar with file size, ETA, and speed (v1.1.6)
  
- **🛡️ Bot-Bypass Technology**  
  Uses Chrome cookies + user-agent spoofing to avoid "Sign in to confirm you're not a bot" errors
  
- **📁 Smart Organization**  
  Playlists saved as `Title [PLAYLIST_ID]` to prevent mixing same-name playlists (common with Bongo Flava compilations!)
  
- **🎵 Flexible Output**  
  Video (360p–4K with probe-verified quality) or MP3 (320kbps/192kbps/128kbps)
  
- **💾 Data-Saving**  
  Never re-downloads completed videos are tracked 
  
- **⚡ Deno-Powered**  
  Solves YouTube's 2026 JavaScript challenges for full quality access

---

## 🔧 Manual Installation (Alternative)

```bash
# 1. Install dependencies
sudo apt update && sudo apt install -y ffmpeg python3-venv python3-pip
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp
curl -fsSL https://deno.land/install.sh | sh && echo 'export PATH="$HOME/.deno/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc

# 2. Setup Python venv for cookies
mkdir -p ~/youtubedownloading && cd ~/youtubedownloading
python3 -m venv yt-venv && source yt-venv/bin/activate && pip install secretstorage cryptography && deactivate

# 3. Install script
sudo curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/YutubuDownload -o /usr/local/bin/YutubuDownload && sudo chmod +x /usr/local/bin/YutubuDownload && sudo ln -sf /usr/local/bin/YutubuDownload /usr/local/bin/ytd
```

---

## 🖥️ Platform Support

- **Linux (Ubuntu/Debian and similar)**: Fully supported.
- **Windows**: Use **WSL (Windows Subsystem for Linux)** or a Linux VM. This tool is Unix shell based.
- **macOS**: Supported (Unix-based). Install equivalent dependencies (`ffmpeg`, `python3`, `pip`, `yt-dlp`, `deno`) using Homebrew.

In short: this workflow is **distro-agnostic and Unix-based**.

---

## 📘 How To Use (Follow-Through)

> For diagrams and a deeper explanation of quality, video, playlist, and MP3 flows, see **[DOWNLOAD_GUIDE.md](DOWNLOAD_GUIDE.md)**.

### 1. Download a Single Video
1. Run `ytd`
2. Paste video URL
3. Choose `1` for single video
4. Choose `1` for video or `2` for MP3
5. Select quality (for video)
6. Confirm download

### 2. Download Audio (MP3)
1. Run `ytd`
2. Paste URL (video or playlist)
3. Choose type (single/playlist)
4. Choose `2` for MP3
5. Pick audio quality (320k/192k/128k)
6. Confirm and wait for extraction

### 3. Download a Full Playlist
1. Run `ytd`
2. Paste playlist URL
3. Choose `2` for full playlist
4. Keep dedicated playlist folder enabled (recommended)
5. Confirm and monitor progress

Expected behavior:
- Strong network: full ETA + speed in one single-line progress UI.
- Very weak network: adaptive `low-network` label appears to reduce noisy telemetry.

---

## 📚 Full Documentation

| Guide | What it covers |
|-------|----------------|
| **[Download Guide](DOWNLOAD_GUIDE.md)** | How quality is maintained, and how single video, playlist, and MP3 downloads work (with diagrams) |
| **[Complete Documentation](YTdownloadScriptForVideoPlaylistAudio.md)** | Setup, troubleshooting, architecture, and advanced usage |
| **[Troubleshooting](TROUBLESHOOTING.md)** | Reinstall, regex fix, cookie errors |

---

## 🔁 How to Update

Re-running the installer is **safe** — it refreshes `ytd`, dependencies, and does not remove your downloads.

```bash
# One command to update to latest version (recommended)
sudo bash -c "$(curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/install.sh)"
```

**From a cloned copy of this repository:**

```bash
cd /path/to/Youtube-Downloader-For-UbuntuTerminal
sudo bash install.sh
```

**Verify after update:**

```bash
ytd --version
# Expected: ytd (YutubuDownload) v2.0.1 (2026-06-08) • Tanzania-Optimized • MULTI-INSTANCE + SHARED COOKIES
```

**Manual script-only update (alternative):**

```bash
sudo curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/YutubuDownload -o /usr/local/bin/YutubuDownload
sudo chmod +x /usr/local/bin/YutubuDownload
sudo ln -sf /usr/local/bin/YutubuDownload /usr/local/bin/ytd
```

Run `ytd` **without** `sudo` after installing.

---

## 📸 Screenshots

<div align="center">
  
### **1. Clean Progress Bar**
![Clean Progress Bar](Screenshots/6.png)
*Single-line progress with file size and ETA*

### **2. Terminal Interface & Main Menu**
![Main Interface](Screenshots/1.png)

### **3. URL Input & Processing**
![URL Processing](Screenshots/2.png)

### **4. Format Selection (Video/MP3)**
![Format Selection](Screenshots/3.png)

### **5. Quality Selection & Download Progress**
![Download Progress](Screenshots/4.png)

### **6. Completion & File Organization**
![Completion Screen](Screenshots/5.png)
![Completion Screen](Screenshots/6.png)
![Completion Screen](Screenshots/7.png)

<br />

### **NOTE : Some times it will fail to download because of the 1.Time you are using, 2.WiFi/Network you are using, 3.New BOT block 4.You have to update and upgrade packages to latest releases for better downloading, 4.Update wifi if broken**
![Completion Screen](Screenshots/z.png)

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/0ffca626-e299-4e32-847d-320796986192" />

### **SOLUTION :Use YUTUBU-DOWNLOADER, then if it persists Update and upgrade your PC and your wifi package if broken, Use Mobile Data by hotspotting your pc from your phone, Keep trying, close and re-open terminal, Kill chrome sessions or even close browsers, Find Ethernet and use it for downloading**

<br />

### **7. New Version : v2.0.0**
![Completion Screen](Screenshots/a.png)
![Completion Screen](Screenshots/b.png)
![Completion Screen](Screenshots/c.png)
![Completion Screen](Screenshots/d.png)
![Completion Screen](Screenshots/e.png)
![Completion Screen](Screenshots/f.png)
![Completion Screen](Screenshots/g.png)
![Completion Screen](Screenshots/h.png)
![Completion Screen](Screenshots/i.png)
![Completion Screen](Screenshots/j.png)
![Completion Screen](Screenshots/k.png)

### **8. v2 Real Download Session (Audio Playlist x3)**
![ytd initializing](Screenshots/v2/1.ytdinitializing.png)
![playlist download started](Screenshots/v2/2.playlistdownload.png)
![playlist fetching](Screenshots/v2/3.playlistfetching.png)
![playlist videos downloading](Screenshots/v2/4.playlistvideosdonloading.png)


</div>

---

## 📋 Changelog

### v2.0.1 (2026-06-08)
- **Added**: Loop download mode (keep pasting URLs until `q`)
- **Improved**: Stable video quality — probe-based resolver + exact-first format chain
- **Fixed**: MP3 downloads (`bestaudio/best`); auto-refresh `yt-dlp` without sudo
- **Fixed**: Bash-compatible video ID regex
- **Improved**: Safe reinstall in `install.sh`; `DOWNLOAD_GUIDE.md` with diagrams
- **Added**: Troubleshooting entries for regex and reinstall fixes

### v2.0.0 (2026-04-20)
- **Added**: Multi-instance safe architecture for parallel terminal usage
- **Added**: Shared cookie service (`cookies.txt`) with refresh locking
- **Added**: Per-session output root, temp dir, and log file isolation
- **Added**: `YTDL_CONCURRENT_FRAGMENTS` environment tuning for strong networks
- **Improved**: Better quality selection reliability for exact resolution picks
- **Improved**: Better single-line progress behavior on unstable links

### v1.1.9 (2026-04-20)
- **Fixed**: Better single-line progress behavior on unstable/slow networks
- **Fixed**: Exact quality selection now respected when available
- **Improved**: Automatic fallback to nearest lower available resolution
- **Improved**: More reliable 1080p+ quality outcomes

### v1.1.6 (2026-02-10)
- **Fixed**: Progress bar display - now shows single clean line
- **Added**: File size display in progress bar
- **Added**: Video ID (short) in progress display
- **Improved**: Terminal output formatting
- **Optimized**: Tanzania network compatibility

### v1.1.5 (2026-02-10)
- **Added**: File size to progress bar output
- **Fixed**: EOF error in folder organization

### v1.1.4 (2026-02-10)
- **Fixed**: Color codes and banner display
- **Added**: Metadata display before download

### v1.1.0 (2026-02-09)
- **Initial**: Tanzania-optimized YouTube downloader

---

## ❓ Why Built for Tanzania?

> *"As a developer in Dar es Salaam, I created YutubuDownload to solve real problems Tanzanian users face daily:*  
> - *Mobile data is expensive → resume support saves money after disconnects*  
> - *Same-name playlists everywhere → ID-based folders prevent chaos*  
> - *YouTube aggressively blocks Tanzanian IPs → cookie + user-agent bypass works*  
> - *Power cuts interrupt downloads → archive tracking prevents duplicates*  
> *Tested on Vodacom 4G in Kariakoo, Airtel in Mwanza, and slow hotel Wi-Fi in Zanzibar."*  
> **— Johnbosco, Creator (February 2026)**

---

## 🚀 Future Roadmap
- [x] Parallel download support
- [ ] Download queue management  
- [ ] GUI wrapper option
- [ ] Mobile app companion

---

## 🤝 Support & Contribution

🐞 **Found a bug?** → [Open GitHub Issue](https://github.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/issues)  
💡 **Have an idea?** → Pull requests welcome!  
💬 **Tanzanian user community**: Join discussions on GitHub  

<div align="center">
  
⭐ **If this saves you time/data in Tanzania, please star the repo!**  
[![GitHub Stars](https://img.shields.io/github/stars/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal?style=social)](https://github.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal)  

**"YutubuDownload v2.0.1: Multi-instance downloads with shared cookies for Tanzania"**  
— Johnbosco, Dar es Salaam 🇹🇿  

</div>
